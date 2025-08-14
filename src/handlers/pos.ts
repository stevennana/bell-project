import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/api';
import {
  PostPosPrintRequest,
  PostPosPrintResponse,
  GetPosPrintResponse,
  PostPosReprintRequest,
  ErrorResponse
} from '../types/api';
import { OrderRecord, PosJobRecord } from '../types/database';
import { db } from '../lib/dynamodb';
import { formatOrderReceipt, formatKitchenTicket, sendToPOSPrinter } from '../lib/pos-printer';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    if (method === 'POST' && path === '/pos/print') {
      return await handlePosPrint(event, headers);
    }

    if (method === 'GET' && path.startsWith('/pos/print/')) {
      return await handleGetPosPrint(event, headers);
    }

    if (method === 'POST' && path === '/pos/reprint') {
      return await handlePosReprint(event, headers);
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
    console.error('POS handler error:', error);
    
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

async function handlePosPrint(
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

  let requestBody: PostPosPrintRequest;
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

  if (!requestBody.orderId) {
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

  const order = await db.getItem<OrderRecord>('orders', { 
    orderId: requestBody.orderId, 
    restaurantId 
  });
  
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

  const jobId = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000); // 24 hours

  const posJob: PosJobRecord = {
    jobId,
    orderId: requestBody.orderId,
    status: 'PENDING',
    createdAt: now,
    attempts: 0,
    expiresAt
  };

  await db.putItem('pos-jobs', posJob);

  // Asynchronously process the print job
  processPrintJob(jobId, order).catch(error => {
    console.error(`Failed to process print job ${jobId}:`, error);
  });

  const response: PostPosPrintResponse = {
    jobId,
    status: 'PENDING',
    createdAt: now
  };

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(response)
  };
}

async function handleGetPosPrint(
  event: APIGatewayProxyEvent,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  const jobId = event.pathParameters?.jobId;
  if (!jobId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Job ID is required'
      } as ErrorResponse)
    };
  }

  const orderId = event.queryStringParameters?.orderId;
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

  const posJob = await db.getItem<PosJobRecord>('pos-jobs', { jobId, orderId });
  if (!posJob) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'Print job not found'
      } as ErrorResponse)
    };
  }

  const response: GetPosPrintResponse = {
    jobId: posJob.jobId,
    status: posJob.status,
    createdAt: posJob.createdAt,
    completedAt: posJob.completedAt,
    errorMessage: posJob.errorMessage
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

async function handlePosReprint(
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

  let requestBody: PostPosReprintRequest;
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

  if (!requestBody.orderId) {
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

  const order = await db.getItem<OrderRecord>('orders', { 
    orderId: requestBody.orderId, 
    restaurantId 
  });
  
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

  return await handlePosPrint({
    ...event,
    body: JSON.stringify({ orderId: requestBody.orderId })
  }, headers);
}

async function processPrintJob(jobId: string, order: OrderRecord): Promise<void> {
  const maxAttempts = 3;
  const retryDelays = [0, 15000, 30000]; // 0s, 15s, 30s

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db.updateItem<PosJobRecord>('pos-jobs',
        { jobId, orderId: order.orderId },
        {
          updateExpression: 'SET attempts = :attempts, lastAttempt = :lastAttempt',
          expressionAttributeValues: {
            ':attempts': attempt,
            ':lastAttempt': new Date().toISOString()
          }
        }
      );

      const printType = process.env.POS_PRINT_TYPE || 'kitchen'; // 'receipt' or 'kitchen' or 'both'
      const printerEndpoint = process.env.POS_PRINTER_ENDPOINT;

      if (printType === 'receipt' || printType === 'both') {
        const receiptData = formatOrderReceipt(order);
        await sendToPOSPrinter(receiptData, printerEndpoint);
      }

      if (printType === 'kitchen' || printType === 'both') {
        const kitchenData = formatKitchenTicket(order);
        await sendToPOSPrinter(kitchenData, printerEndpoint);
      }

      await db.updateItem<PosJobRecord>('pos-jobs',
        { jobId, orderId: order.orderId },
        {
          updateExpression: 'SET #status = :status, completedAt = :completedAt',
          expressionAttributeNames: {
            '#status': 'status'
          },
          expressionAttributeValues: {
            ':status': 'SUCCESS',
            ':completedAt': new Date().toISOString()
          }
        }
      );

      console.log(`Print job ${jobId} completed successfully`);
      return;

    } catch (error) {
      console.error(`Print job ${jobId} attempt ${attempt} failed:`, error);

      if (attempt === maxAttempts) {
        await db.updateItem<PosJobRecord>('pos-jobs',
          { jobId, orderId: order.orderId },
          {
            updateExpression: 'SET #status = :status, errorMessage = :errorMessage',
            expressionAttributeNames: {
              '#status': 'status'
            },
            expressionAttributeValues: {
              ':status': 'FAILED',
              ':errorMessage': error instanceof Error ? error.message : 'Unknown error'
            }
          }
        );
      } else if (retryDelays[attempt]) {
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
    }
  }
}