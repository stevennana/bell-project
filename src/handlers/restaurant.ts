import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT })
});
const ddb = DynamoDBDocumentClient.from(client);

const RESTAURANTS_TABLE = process.env.RESTAURANTS_TABLE || 'bell-restaurants-local';

interface Restaurant {
  restaurantId: string;
  restaurantName: string;
  ownerEmail: string;
  ownerPassword: string;
  activationCode: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

function generateActivationCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

function isValidAdmin(event: APIGatewayProxyEvent): boolean {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return false;
  
  // Simple admin check - in production, use proper JWT verification
  const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
  const [username, password] = credentials.split(':');
  
  return username === 'admin@bell.com' && password === 'admin123';
}

export async function getAllRestaurants(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!isValidAdmin(event)) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const result = await ddb.send(new ScanCommand({
      TableName: RESTAURANTS_TABLE
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Items || [])
    };
  } catch (error) {
    console.error('Error getting restaurants:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

export async function getRestaurant(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const restaurantId = event.pathParameters?.restaurantId;
    if (!restaurantId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Restaurant ID is required' })
      };
    }

    const result = await ddb.send(new GetCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId }
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Restaurant not found' })
      };
    }

    // Remove password from response for security
    const { ownerPassword, ...restaurantData } = result.Item as Restaurant;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(restaurantData)
    };
  } catch (error) {
    console.error('Error getting restaurant:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

export async function createRestaurant(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!isValidAdmin(event)) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const { restaurantId, restaurantName, ownerEmail, ownerPassword } = JSON.parse(event.body);

    if (!restaurantId || !restaurantName || !ownerEmail || !ownerPassword) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'All fields are required' })
      };
    }

    // Check if restaurant already exists
    const existingResult = await ddb.send(new GetCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId }
    }));

    if (existingResult.Item) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Restaurant ID already exists' })
      };
    }

    const now = new Date().toISOString();
    const restaurant: Restaurant = {
      restaurantId,
      restaurantName,
      ownerEmail,
      ownerPassword, // In production, hash this password
      activationCode: generateActivationCode(),
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    await ddb.send(new PutCommand({
      TableName: RESTAURANTS_TABLE,
      Item: restaurant
    }));

    // Remove password from response
    const { ownerPassword: _, ...responseData } = restaurant;

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('Error creating restaurant:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

export async function updateRestaurant(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!isValidAdmin(event)) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const restaurantId = event.pathParameters?.restaurantId;
    if (!restaurantId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Restaurant ID is required' })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const updates = JSON.parse(event.body);
    const now = new Date().toISOString();

    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build dynamic update expression
    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'restaurantId' && value !== undefined) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    // Always update the updatedAt field
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    await ddb.send(new UpdateCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Restaurant updated successfully' })
    };
  } catch (error) {
    console.error('Error updating restaurant:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

export async function deleteRestaurant(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!isValidAdmin(event)) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const restaurantId = event.pathParameters?.restaurantId;
    if (!restaurantId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Restaurant ID is required' })
      };
    }

    await ddb.send(new DeleteCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId }
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Restaurant deleted successfully' })
    };
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

export async function verifyOwnerCredentials(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const { restaurantId, email, password } = JSON.parse(event.body);

    if (!restaurantId || !email || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Restaurant ID, email, and password are required' })
      };
    }

    const result = await ddb.send(new GetCommand({
      TableName: RESTAURANTS_TABLE,
      Key: { restaurantId }
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Restaurant not found' })
      };
    }

    const restaurant = result.Item as Restaurant;

    if (restaurant.ownerEmail !== email || restaurant.ownerPassword !== password) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    if (restaurant.status !== 'active') {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Restaurant is not active' })
      };
    }

    // Return restaurant info without password
    const { ownerPassword: _, ...restaurantData } = restaurant;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Credentials verified',
        restaurant: restaurantData
      })
    };
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}