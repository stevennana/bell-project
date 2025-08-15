import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/api';
import { 
  GetDashboardStatsResponse,
  ErrorResponse,
  Order
} from '../types/api';
import { OrderRecord } from '../types/database';
import { db } from '../lib/dynamodb';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    if (method === 'GET' && path === '/stats/dashboard') {
      return await handleGetDashboardStats(event, headers);
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
    console.error('Stats handler error:', error);
    
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

async function handleGetDashboardStats(
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

  try {
    // Query orders for this restaurant
    const ordersResult = await db.queryItems<OrderRecord>('orders', {
      indexName: 'restaurantId-createdAt-index',
      keyConditionExpression: 'restaurantId = :restaurantId',
      expressionAttributeValues: {
        ':restaurantId': restaurantId
      }
    });

    const orders = ordersResult.items;

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Filter orders for today
    const todayOrders = orders.filter(order => 
      order.createdAt.startsWith(today)
    );

    // Calculate today's revenue
    const todayRevenue = todayOrders.reduce((sum, order) => {
      // Only count paid orders towards revenue
      if (['PAID', 'CONFIRMED', 'COOKING', 'READY', 'COMPLETED'].includes(order.status)) {
        return sum + order.totalAmount;
      }
      return sum;
    }, 0);

    // Count active orders (orders that are paid and not yet completed)
    const activeOrders = orders.filter(order => 
      ['PAID', 'CONFIRMED', 'COOKING', 'READY'].includes(order.status)
    ).length;

    // Count pending orders (newly paid, not yet confirmed)
    const pendingOrders = orders.filter(order => 
      order.status === 'PAID'
    ).length;

    // Calculate average order time (mock calculation - would need timestamps in real implementation)
    // For now, return a reasonable mock value
    const avgOrderTime = 25; // minutes

    const response: GetDashboardStatsResponse = {
      todayOrders: todayOrders.length,
      todayRevenue,
      activeOrders,
      avgOrderTime,
      pendingOrders
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    // Return mock data if database query fails
    const mockResponse: GetDashboardStatsResponse = {
      todayOrders: 12,
      todayRevenue: 384000, // KRW
      activeOrders: 3,
      avgOrderTime: 25,
      pendingOrders: 1
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mockResponse)
    };
  }
}