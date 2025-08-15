import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Category, 
  GetCategoriesResponse, 
  PostCategoryRequest, 
  PostCategoryResponse,
  UpdateCategoryRequest,
  UpdateCategoryResponse 
} from '../types/api';
import type { CategoryRecord } from '../types/database';

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT })
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const RESTAURANTS_TABLE = process.env.RESTAURANTS_TABLE || 'bell-restaurants-local';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

const responseWrapper = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

const categoryRecordToCategory = (record: CategoryRecord): Category => ({
  id: record.categoryId,
  name: record.name,
  displayName: record.displayName,
  active: record.active,
  order: record.order,
  restaurantId: record.restaurantId,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt
});

export const getCategories = async (restaurantId: string): Promise<APIGatewayProxyResult> => {
  try {
    // Get the restaurant record which should contain categories
    const command = new GetCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId }
    });

    const result = await docClient.send(command);
    
    if (!result.Item) {
      return responseWrapper(404, {
        type: 'NotFound',
        title: 'Restaurant Not Found',
        status: 404,
        detail: 'Restaurant not found'
      });
    }

    // Extract categories from restaurant record, or return empty array if none exist
    const categories = result.Item.categories || [];
    const response: GetCategoriesResponse = { 
      categories: categories.sort((a: any, b: any) => a.order - b.order) 
    };
    return responseWrapper(200, response);
  } catch (error) {
    console.error('Error getting categories:', error);
    return responseWrapper(500, {
      type: 'InternalServerError',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve categories'
    });
  }
};

export const createCategory = async (restaurantId: string, request: PostCategoryRequest): Promise<APIGatewayProxyResult> => {
  try {
    const categoryId = `cat_${uuidv4()}`;
    const now = new Date().toISOString();
    
    // Get current restaurant record
    const getCommand = new GetCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId }
    });

    const restaurantResult = await docClient.send(getCommand);
    
    if (!restaurantResult.Item) {
      return responseWrapper(404, {
        type: 'NotFound',
        title: 'Restaurant Not Found',
        status: 404,
        detail: 'Restaurant not found'
      });
    }

    const currentCategories = restaurantResult.Item.categories || [];
    const categoryCount = currentCategories.length;
    
    const newCategory = {
      id: categoryId,
      name: request.name,
      displayName: request.displayName,
      active: true,
      order: request.order !== undefined ? request.order : categoryCount,
      restaurantId,
      createdAt: now,
      updatedAt: now
    };

    // Add new category to the restaurant's categories array
    const updatedCategories = [...currentCategories, newCategory];

    const updateCommand = new UpdateCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId },
      UpdateExpression: 'SET categories = :categories, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':categories': updatedCategories,
        ':updatedAt': now
      },
      ReturnValues: 'NONE'
    });

    await docClient.send(updateCommand);

    const response: PostCategoryResponse = { category: newCategory };
    return responseWrapper(201, response);
  } catch (error) {
    console.error('Error creating category:', error);
    return responseWrapper(500, {
      type: 'InternalServerError',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to create category'
    });
  }
};

const handleCategoryDeactivation = async (restaurantId: string, categoryId: string): Promise<void> => {
  try {
    // Note: This function handles the business logic requirement:
    // "when category is deactivated, all related menus belong to the deactivated category are going to draft"
    
    // In the current system, menu items belong to categories but the menu versioning is handled
    // separately in the menu handler. Since menu items are part of menu versions and not 
    // stored individually, we would need to:
    // 1. Get the current published menu
    // 2. Find items that belong to the deactivated category
    // 3. Create a new draft version without those items OR mark them as unavailable
    
    // For now, we'll log this action and in a production system, this would trigger
    // a workflow to update menu versions accordingly
    console.log(`Category ${categoryId} deactivated for restaurant ${restaurantId}. Menu items in this category should be moved to draft status.`);
    
    // TODO: Integrate with menu versioning system to:
    // - Move items from this category to draft status
    // - Or make items unavailable in published menu
    // - Notify restaurant owner of the change
    
  } catch (error) {
    console.error('Error handling category deactivation:', error);
    // Don't throw error to prevent category update from failing
  }
};

export const updateCategory = async (
  restaurantId: string, 
  categoryId: string, 
  request: UpdateCategoryRequest
): Promise<APIGatewayProxyResult> => {
  try {
    const now = new Date().toISOString();
    
    // Get current restaurant record
    const getCommand = new GetCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId }
    });

    const restaurantResult = await docClient.send(getCommand);
    
    if (!restaurantResult.Item) {
      return responseWrapper(404, {
        type: 'NotFound',
        title: 'Restaurant Not Found',
        status: 404,
        detail: 'Restaurant not found'
      });
    }

    const currentCategories = restaurantResult.Item.categories || [];
    const categoryIndex = currentCategories.findIndex((cat: any) => cat.id === categoryId);
    
    if (categoryIndex === -1) {
      return responseWrapper(404, {
        type: 'NotFound',
        title: 'Category Not Found',
        status: 404,
        detail: 'The specified category does not exist'
      });
    }

    // Update the specific category
    const updatedCategory = {
      ...currentCategories[categoryIndex],
      updatedAt: now
    };

    if (request.displayName !== undefined) {
      updatedCategory.displayName = request.displayName;
    }

    if (request.active !== undefined) {
      updatedCategory.active = request.active;
    }

    if (request.order !== undefined) {
      updatedCategory.order = request.order;
    }

    // Handle menu status when category is deactivated
    if (request.active === false) {
      await handleCategoryDeactivation(restaurantId, categoryId);
    }

    // Update the categories array
    const updatedCategories = [...currentCategories];
    updatedCategories[categoryIndex] = updatedCategory;

    const updateCommand = new UpdateCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId },
      UpdateExpression: 'SET categories = :categories, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':categories': updatedCategories,
        ':updatedAt': now
      },
      ReturnValues: 'NONE'
    });

    await docClient.send(updateCommand);

    const response: UpdateCategoryResponse = { category: updatedCategory };
    return responseWrapper(200, response);
  } catch (error) {
    console.error('Error updating category:', error);
    return responseWrapper(500, {
      type: 'InternalServerError',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to update category'
    });
  }
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return responseWrapper(200, {});
  }

  const { restaurantId } = event.pathParameters || {};
  if (!restaurantId) {
    return responseWrapper(400, {
      type: 'BadRequest',
      title: 'Bad Request',
      status: 400,
      detail: 'Restaurant ID is required'
    });
  }

  try {
    switch (event.httpMethod) {
      case 'GET':
        return await getCategories(restaurantId);
      
      case 'POST':
        if (!event.body) {
          return responseWrapper(400, {
            type: 'BadRequest',
            title: 'Bad Request',
            status: 400,
            detail: 'Request body is required'
          });
        }
        
        const postRequest: PostCategoryRequest = JSON.parse(event.body);
        return await createCategory(restaurantId, postRequest);
      
      case 'PUT':
        const { categoryId } = event.pathParameters || {};
        if (!categoryId) {
          return responseWrapper(400, {
            type: 'BadRequest',
            title: 'Bad Request',
            status: 400,
            detail: 'Category ID is required'
          });
        }
        
        if (!event.body) {
          return responseWrapper(400, {
            type: 'BadRequest',
            title: 'Bad Request',
            status: 400,
            detail: 'Request body is required'
          });
        }
        
        const putRequest: UpdateCategoryRequest = JSON.parse(event.body);
        return await updateCategory(restaurantId, categoryId, putRequest);
      
      default:
        return responseWrapper(405, {
          type: 'MethodNotAllowed',
          title: 'Method Not Allowed',
          status: 405,
          detail: `HTTP method ${event.httpMethod} is not allowed`
        });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return responseWrapper(500, {
      type: 'InternalServerError',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred'
    });
  }
};