import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/api';
import { 
  PostOrderRequest,
  PostOrderResponse,
  GetOrderResponse,
  DeleteOrderResponse,
  ErrorResponse
} from '../types/api';
import { OrderRecord, MenuRecord } from '../types/database';
import { db } from '../lib/dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

    if (method === 'POST' && path === '/order') {
      return await handlePostOrder(event, headers);
    }

    if (method === 'GET' && path.startsWith('/order/')) {
      return await handleGetOrder(event, headers);
    }

    if (method === 'DELETE' && path.startsWith('/order/')) {
      return await handleDeleteOrder(event, headers);
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
    console.error('Order handler error:', error);
    
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

async function handlePostOrder(
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

  let requestBody: PostOrderRequest;
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

  if (!requestBody.restaurantId || !requestBody.items || !Array.isArray(requestBody.items) || requestBody.items.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Restaurant ID and items are required'
      } as ErrorResponse)
    };
  }

  const menu = await db.getLatestMenu(requestBody.restaurantId);
  if (!menu) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'Menu not found for this restaurant'
      } as ErrorResponse)
    };
  }

  let totalAmount = 0;
  const validatedItems = [];

  for (const orderItem of requestBody.items) {
    const menuItem = menu.items.find(item => item.id === orderItem.menuItemId);
    if (!menuItem) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/422',
          title: 'Unprocessable Entity',
          status: 422,
          detail: `Menu item ${orderItem.menuItemId} not found`
        } as ErrorResponse)
      };
    }

    if (!menuItem.available) {
      return {
        statusCode: 410,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/410',
          title: 'Gone',
          status: 410,
          detail: `Menu item ${menuItem.name} is not available`
        } as ErrorResponse)
      };
    }

    let itemPrice = menuItem.price;
    const validatedOptions = [];

    for (const selectedOption of orderItem.selectedOptions) {
      const menuOption = menuItem.options.find(opt => opt.id === selectedOption.optionId);
      if (!menuOption) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            type: 'https://httpstatuses.com/422',
            title: 'Unprocessable Entity',
            status: 422,
            detail: `Option ${selectedOption.optionId} not found for item ${menuItem.name}`
          } as ErrorResponse)
        };
      }

      const choice = menuOption.choices.find(c => c.id === selectedOption.choiceId);
      if (!choice) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            type: 'https://httpstatuses.com/422',
            title: 'Unprocessable Entity',
            status: 422,
            detail: `Choice ${selectedOption.choiceId} not found for option ${menuOption.name}`
          } as ErrorResponse)
        };
      }

      if (Math.abs(selectedOption.priceModifier - choice.priceModifier) > 0.01) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            type: 'https://httpstatuses.com/422',
            title: 'Unprocessable Entity',
            status: 422,
            detail: 'Price modifier mismatch'
          } as ErrorResponse)
        };
      }

      itemPrice += choice.priceModifier;
      validatedOptions.push(selectedOption);
    }

    const expectedItemTotal = Math.round(itemPrice * orderItem.quantity * 100) / 100;
    if (Math.abs(orderItem.price - expectedItemTotal) > 0.01) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/422',
          title: 'Unprocessable Entity',
          status: 422,
          detail: `Price mismatch for item ${menuItem.name}`
        } as ErrorResponse)
      };
    }

    totalAmount += expectedItemTotal;
    validatedItems.push({
      ...orderItem,
      selectedOptions: validatedOptions,
      price: expectedItemTotal
    });
  }

  const orderId = uuidv4();
  const now = new Date().toISOString();
  
  const cartTtlMinutes = parseInt(process.env.CART_TTL_MINUTES || '10');
  const expiresAt = Math.floor((Date.now() + cartTtlMinutes * 60 * 1000) / 1000);

  const order: OrderRecord = {
    orderId,
    restaurantId: requestBody.restaurantId,
    menuSnapshot: {
      version: menu.version,
      items: menu.items
    },
    items: validatedItems,
    status: 'CREATED',
    totalAmount: Math.round(totalAmount * 100) / 100,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    customerInfo: requestBody.customerInfo
  };

  await db.putItem('orders', order);

  const paymentUrl = `${process.env.PAYMENT_BASE_URL || 'https://example.com'}/payment?orderId=${orderId}`;

  const response: PostOrderResponse = {
    orderId,
    status: 'CREATED',
    totalAmount: order.totalAmount,
    paymentUrl,
    createdAt: now
  };

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(response)
  };
}

async function handleGetOrder(
  event: APIGatewayProxyEvent,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  const orderId = event.pathParameters?.orderId;
  if (!orderId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Order ID is required'
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

  const order = await db.getItem<OrderRecord>('orders', { orderId, restaurantId });
  if (!order) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'Order not found'
      } as ErrorResponse)
    };
  }

  const response: GetOrderResponse = {
    orderId: order.orderId,
    restaurantId: order.restaurantId,
    status: order.status,
    items: order.items,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paymentInfo: order.paymentInfo
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

async function handleDeleteOrder(
  event: APIGatewayProxyEvent,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  const orderId = event.pathParameters?.orderId;
  if (!orderId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Order ID is required'
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

  const order = await db.getItem<OrderRecord>('orders', { orderId, restaurantId });
  if (!order) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'Order not found'
      } as ErrorResponse)
    };
  }

  if (order.status === 'COMPLETED') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Cannot cancel completed order'
      } as ErrorResponse)
    };
  }

  let refundAmount = order.totalAmount;
  
  if (order.status === 'COOKING' || order.status === 'READY') {
    const refundCapPercent = parseInt(process.env.REFUND_CAP_PERCENT || '5');
    const maxRefund = order.totalAmount * (refundCapPercent / 100);
    refundAmount = Math.min(refundAmount, maxRefund);
  }

  const now = new Date().toISOString();

  await db.updateItem<OrderRecord>('orders',
    { orderId, restaurantId },
    {
      updateExpression: 'SET #status = :status, updatedAt = :updatedAt, refundInfo = :refundInfo',
      expressionAttributeNames: {
        '#status': 'status'
      },
      expressionAttributeValues: {
        ':status': 'CANCELLED',
        ':updatedAt': now,
        ':refundInfo': {
          amount: refundAmount,
          processedAt: now,
          reason: 'Customer cancellation'
        },
        ':completed': 'COMPLETED'
      },
      conditionExpression: '#status <> :completed'
    }
  );

  const response: DeleteOrderResponse = {
    orderId,
    status: 'CANCELLED',
    refundAmount,
    refundMethod: order.paymentInfo?.method || 'original'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}