import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types/api';
import { PaymentCallbackRequest, ErrorResponse } from '../types/api';
import { PaymentCallbackData } from '../types/payment';
import { OrderRecord } from '../types/database';
import { db } from '../lib/dynamodb';
import { paymentService } from '../lib/payment';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    if (method === 'POST' && path === '/payment/callback/naverpay') {
      return await handleNaverPayCallback(event, headers);
    }

    if (method === 'POST' && path === '/payment/callback/kakaopay') {
      return await handleKakaoPayCallback(event, headers);
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
    console.error('Payment callback handler error:', error);
    
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

async function handleNaverPayCallback(
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

  let callbackData: any;
  try {
    callbackData = JSON.parse(event.body);
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

  const orderId = callbackData.merchantPayKey;
  if (!orderId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Order ID (merchantPayKey) is required'
      } as ErrorResponse)
    };
  }

  const paymentCallbackData: PaymentCallbackData = {
    orderId,
    transactionId: callbackData.paymentId,
    amount: callbackData.totalPayAmount || 0,
    status: callbackData.admissionState === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
    timestamp: callbackData.admissionYmdt || new Date().toISOString(),
    signature: event.headers['X-NaverPay-Signature'] || '',
    provider: 'naverpay',
    rawData: callbackData
  };

  return await processPaymentCallback(paymentCallbackData, headers);
}

async function handleKakaoPayCallback(
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

  let callbackData: any;
  try {
    callbackData = JSON.parse(event.body);
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

  const orderId = callbackData.partner_order_id;
  if (!orderId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Order ID (partner_order_id) is required'
      } as ErrorResponse)
    };
  }

  const paymentCallbackData: PaymentCallbackData = {
    orderId,
    transactionId: callbackData.tid,
    amount: callbackData.amount?.total || 0,
    status: callbackData.approved_at ? 'SUCCESS' : 'FAILED',
    timestamp: callbackData.approved_at || callbackData.created_at || new Date().toISOString(),
    signature: '', // KakaoPay doesn't use signature verification in the same way
    provider: 'kakaopay',
    rawData: callbackData
  };

  return await processPaymentCallback(paymentCallbackData, headers);
}

async function processPaymentCallback(
  callbackData: PaymentCallbackData,
  headers: { [key: string]: string }
): Promise<APIGatewayProxyResult> {
  try {
    // Verify the callback signature/authenticity
    const isValid = await paymentService.verifyCallback(callbackData);
    if (!isValid) {
      console.error('Invalid payment callback signature:', callbackData);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/401',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid payment callback signature'
        } as ErrorResponse)
      };
    }

    // Find the order by scanning all restaurants (since we don't have restaurantId in callback)
    const allOrders = await db.scanItems<OrderRecord>('orders',
      'orderId = :orderId',
      undefined,
      { ':orderId': callbackData.orderId },
      1
    );

    if (allOrders.items.length === 0) {
      console.error('Order not found for payment callback:', callbackData.orderId);
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

    const order = allOrders.items[0];
    const now = new Date().toISOString();

    if (callbackData.status === 'SUCCESS') {
      // Update order status to PAID and record payment info
      const updatedOrder = await db.updateItem<OrderRecord>('orders',
        { orderId: order.orderId, restaurantId: order.restaurantId },
        {
          updateExpression: 'SET #status = :status, updatedAt = :updatedAt, paymentInfo = :paymentInfo, expiresAt = :expiresAt',
          expressionAttributeNames: {
            '#status': 'status'
          },
          expressionAttributeValues: {
            ':status': 'PAID',
            ':updatedAt': now,
            ':paymentInfo': {
              method: callbackData.provider,
              transactionId: callbackData.transactionId,
              paidAt: callbackData.timestamp,
              amount: callbackData.amount
            },
            ':expiresAt': null, // Remove TTL since payment is successful
            ':expectedStatus': 'CREATED'
          },
          conditionExpression: '#status = :expectedStatus'
        }
      );

      console.log(`Payment successful for order ${callbackData.orderId}`);

      // TODO: Trigger notification to restaurant for new paid order
      // TODO: Consider auto-confirming the order or requiring manual confirmation

    } else {
      // Payment failed, keep order in CREATED state but log the failure
      await db.updateItem<OrderRecord>('orders',
        { orderId: order.orderId, restaurantId: order.restaurantId },
        {
          updateExpression: 'SET updatedAt = :updatedAt, paymentFailureInfo = :failureInfo',
          expressionAttributeValues: {
            ':updatedAt': now,
            ':failureInfo': {
              provider: callbackData.provider,
              transactionId: callbackData.transactionId,
              failedAt: callbackData.timestamp,
              reason: 'Payment processing failed'
            }
          }
        }
      );

      console.log(`Payment failed for order ${callbackData.orderId}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: callbackData.orderId,
        status: callbackData.status
      })
    };

  } catch (error) {
    console.error('Error processing payment callback:', error);

    if ((error as any).name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          type: 'https://httpstatuses.com/409',
          title: 'Conflict',
          status: 409,
          detail: 'Order status has already been updated'
        } as ErrorResponse)
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        type: 'https://httpstatuses.com/500',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to process payment callback'
      } as ErrorResponse)
    };
  }
}