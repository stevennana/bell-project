import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  getAllRestaurants, 
  getRestaurant, 
  createRestaurant, 
  updateRestaurant, 
  deleteRestaurant,
  verifyOwnerCredentials
} from './restaurant';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Restaurant API Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { httpMethod, pathParameters } = event;
    const restaurantId = pathParameters?.restaurantId;

    switch (httpMethod) {
      case 'GET':
        if (restaurantId) {
          return await getRestaurant(event);
        } else {
          return await getAllRestaurants(event);
        }

      case 'POST':
        if (event.resource === '/restaurants/verify') {
          return await verifyOwnerCredentials(event);
        } else {
          return await createRestaurant(event);
        }

      case 'PUT':
        return await updateRestaurant(event);

      case 'DELETE':
        return await deleteRestaurant(event);

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Restaurant handler error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};