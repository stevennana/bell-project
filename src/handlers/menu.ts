import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/api';
import { 
  GetMenuResponse, 
  PostMenuRequest, 
  PostMenuResponse, 
  ErrorResponse 
} from '../types/api';
import { MenuRecord } from '../types/database';
import { db } from '../lib/dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const method = event.httpMethod;
    const path = event.path;

    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    if (method === 'GET' && path === '/menu') {
      return await handleGetMenu(event, headers);
    }

    if (method === 'GET' && path === '/menu/draft') {
      return await handleGetDraftMenu(event, headers);
    }

    if (method === 'GET' && path === '/menu/published') {
      return await handleGetPublishedMenu(event, headers);
    }

    if (method === 'PUT' && path.startsWith('/menu/') && path.endsWith('/confirm')) {
      return await handleConfirmMenu(event, headers);
    }

    if (method === 'POST' && path === '/menu') {
      return await handlePostMenu(event, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'The requested resource was not found'
      } as ErrorResponse)
    };

  } catch (error) {
    console.error('Menu handler error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/500',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred'
      } as ErrorResponse)
    };
  }
};

async function handleGetMenu(
  event: APIGatewayProxyEvent,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  const restaurantId = event.queryStringParameters?.restaurantId;
  
  if (!restaurantId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Restaurant ID is required'
      } as ErrorResponse)
    };
  }

  const menu = await db.getLatestMenu(restaurantId);
  
  if (!menu) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'No menu found for this restaurant'
      } as ErrorResponse)
    };
  }

  const response: GetMenuResponse = {
    menu: {
      restaurantId: menu.restaurantId,
      version: menu.version,
      items: menu.items,
      status: menu.status,
      createdAt: menu.createdAt,
      confirmedAt: menu.confirmedAt
    }
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

async function handlePostMenu(
  event: APIGatewayProxyEvent,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Request body is required'
      } as ErrorResponse)
    };
  }

  let requestBody: PostMenuRequest;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid JSON in request body'
      } as ErrorResponse)
    };
  }

  const restaurantId = event.queryStringParameters?.restaurantId;
  if (!restaurantId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Restaurant ID is required'
      } as ErrorResponse)
    };
  }

  if (!requestBody.items || !Array.isArray(requestBody.items) || requestBody.items.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Menu items are required'
      } as ErrorResponse)
    };
  }

  for (const item of requestBody.items) {
    if (!item.id || !item.name || typeof item.price !== 'number' || item.price < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/400',
          title: 'Bad Request',
          status: 400,
          detail: 'Invalid menu item format'
        } as ErrorResponse)
      };
    }
  }

  const now = new Date().toISOString();
  const version = `v${Date.now()}`;

  const newMenu: MenuRecord = {
    restaurantId,
    version,
    items: requestBody.items,
    status: 'DRAFT',
    createdAt: now
  };

  try {
    await db.putItem('menus', newMenu);

    const shouldConfirm = event.queryStringParameters?.confirm === 'true';
    if (shouldConfirm) {
      const existingMenus = await db.queryItems<MenuRecord>('menus', {
        keyConditionExpression: 'restaurantId = :restaurantId',
        expressionAttributeValues: {
          ':restaurantId': restaurantId
        }
      });

      for (const menu of existingMenus.items) {
        if (menu.status === 'CONFIRMED') {
          await db.updateItem('menus', 
            { restaurantId: menu.restaurantId, version: menu.version },
            {
              updateExpression: 'SET #status = :status',
              expressionAttributeNames: {
                '#status': 'status'
              },
              expressionAttributeValues: {
                ':status': 'DRAFT'
              }
            }
          );
        }
      }

      await db.updateItem('menus',
        { restaurantId, version },
        {
          updateExpression: 'SET #status = :status, confirmedAt = :confirmedAt',
          expressionAttributeNames: {
            '#status': 'status'
          },
          expressionAttributeValues: {
            ':status': 'CONFIRMED',
            ':confirmedAt': now
          }
        }
      );

      newMenu.status = 'CONFIRMED';
      newMenu.confirmedAt = now;
    }

    const response: PostMenuResponse = {
      version,
      status: newMenu.status,
      createdAt: now
    };

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error creating menu:', error);
    
    if ((error as any).name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/409',
          title: 'Conflict',
          status: 409,
          detail: 'Menu version already exists'
        } as ErrorResponse)
      };
    }

    throw error;
  }
}

async function handleGetDraftMenu(
  event: APIGatewayProxyEvent,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  const restaurantId = event.queryStringParameters?.restaurantId;
  
  if (!restaurantId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Restaurant ID is required'
      } as ErrorResponse)
    };
  }

  // Get the latest draft menu
  const draftMenus = await db.queryItems<MenuRecord>('menus', {
    indexName: 'status-createdAt-index',
    keyConditionExpression: '#status = :status',
    filterExpression: 'restaurantId = :restaurantId',
    expressionAttributeNames: {
      '#status': 'status'
    },
    expressionAttributeValues: {
      ':status': 'DRAFT',
      ':restaurantId': restaurantId
    },
    scanIndexForward: false, // Latest first
    limit: 1
  });
  
  if (draftMenus.items.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'No draft menu found for this restaurant'
      } as ErrorResponse)
    };
  }

  const menu = draftMenus.items[0];
  const response: GetMenuResponse = {
    menu: {
      restaurantId: menu.restaurantId,
      version: menu.version,
      items: menu.items,
      status: menu.status,
      createdAt: menu.createdAt,
      confirmedAt: menu.confirmedAt
    }
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

async function handleGetPublishedMenu(
  event: APIGatewayProxyEvent,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  const restaurantId = event.queryStringParameters?.restaurantId;
  
  if (!restaurantId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Restaurant ID is required'
      } as ErrorResponse)
    };
  }

  const menu = await db.getLatestMenu(restaurantId); // This gets CONFIRMED menu
  
  if (!menu) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'No published menu found for this restaurant'
      } as ErrorResponse)
    };
  }

  const response: GetMenuResponse = {
    menu: {
      restaurantId: menu.restaurantId,
      version: menu.version,
      items: menu.items,
      status: menu.status,
      createdAt: menu.createdAt,
      confirmedAt: menu.confirmedAt
    }
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

async function handleConfirmMenu(
  event: APIGatewayProxyEvent,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  const restaurantId = event.queryStringParameters?.restaurantId;
  
  if (!restaurantId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Restaurant ID is required'
      } as ErrorResponse)
    };
  }

  // Extract version from path: /menu/{version}/confirm
  const pathParts = event.path.split('/');
  const version = pathParts[2];
  
  if (!version) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Version is required'
      } as ErrorResponse)
    };
  }

  try {
    // Get the menu to confirm
    const menuToConfirm = await db.getItem<MenuRecord>('menus', {
      restaurantId,
      version
    });

    if (!menuToConfirm) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/404',
          title: 'Not Found',
          status: 404,
          detail: 'Menu version not found'
        } as ErrorResponse)
      };
    }

    if (menuToConfirm.status === 'CONFIRMED') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/400',
          title: 'Bad Request',
          status: 400,
          detail: 'Menu is already confirmed'
        } as ErrorResponse)
      };
    }

    const now = new Date().toISOString();

    // Set all existing confirmed menus to draft
    const existingMenus = await db.queryItems<MenuRecord>('menus', {
      keyConditionExpression: 'restaurantId = :restaurantId',
      expressionAttributeValues: {
        ':restaurantId': restaurantId
      }
    });

    for (const menu of existingMenus.items) {
      if (menu.status === 'CONFIRMED') {
        await db.updateItem('menus', 
          { restaurantId: menu.restaurantId, version: menu.version },
          {
            updateExpression: 'SET #status = :status',
            expressionAttributeNames: {
              '#status': 'status'
            },
            expressionAttributeValues: {
              ':status': 'DRAFT'
            }
          }
        );
      }
    }

    // Confirm the target menu
    await db.updateItem('menus',
      { restaurantId, version },
      {
        updateExpression: 'SET #status = :status, confirmedAt = :confirmedAt',
        expressionAttributeNames: {
          '#status': 'status'
        },
        expressionAttributeValues: {
          ':status': 'CONFIRMED',
          ':confirmedAt': now
        }
      }
    );

    const response: PostMenuResponse = {
      version,
      status: 'CONFIRMED',
      createdAt: menuToConfirm.createdAt
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error confirming menu:', error);
    throw error;
  }
}