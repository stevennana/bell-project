"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const dynamodb_1 = require("../lib/dynamodb");
const payment_1 = require("../lib/payment");
const handler = async (event) => {
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
            })
        };
    }
    catch (error) {
        console.error('Payment callback handler error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/500',
                title: 'Internal Server Error',
                status: 500,
                detail: 'An unexpected error occurred'
            })
        };
    }
};
exports.handler = handler;
async function handleNaverPayCallback(event, headers) {
    if (!event.body) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/400',
                title: 'Bad Request',
                status: 400,
                detail: 'Request body is required'
            })
        };
    }
    let callbackData;
    try {
        callbackData = JSON.parse(event.body);
    }
    catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/400',
                title: 'Bad Request',
                status: 400,
                detail: 'Invalid JSON in request body'
            })
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
            })
        };
    }
    const paymentCallbackData = {
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
async function handleKakaoPayCallback(event, headers) {
    if (!event.body) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/400',
                title: 'Bad Request',
                status: 400,
                detail: 'Request body is required'
            })
        };
    }
    let callbackData;
    try {
        callbackData = JSON.parse(event.body);
    }
    catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/400',
                title: 'Bad Request',
                status: 400,
                detail: 'Invalid JSON in request body'
            })
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
            })
        };
    }
    const paymentCallbackData = {
        orderId,
        transactionId: callbackData.tid,
        amount: callbackData.amount?.total || 0,
        status: callbackData.approved_at ? 'SUCCESS' : 'FAILED',
        timestamp: callbackData.approved_at || callbackData.created_at || new Date().toISOString(),
        signature: '',
        provider: 'kakaopay',
        rawData: callbackData
    };
    return await processPaymentCallback(paymentCallbackData, headers);
}
async function processPaymentCallback(callbackData, headers) {
    try {
        const isValid = await payment_1.paymentService.verifyCallback(callbackData);
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
                })
            };
        }
        const allOrders = await dynamodb_1.db.scanItems('orders', 'orderId = :orderId', undefined, { ':orderId': callbackData.orderId }, 1);
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
                })
            };
        }
        const order = allOrders.items[0];
        const now = new Date().toISOString();
        if (callbackData.status === 'SUCCESS') {
            const updatedOrder = await dynamodb_1.db.updateItem('orders', { orderId: order.orderId, restaurantId: order.restaurantId }, {
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
                    ':expiresAt': null,
                    ':expectedStatus': 'CREATED'
                },
                conditionExpression: '#status = :expectedStatus'
            });
            console.log(`Payment successful for order ${callbackData.orderId}`);
        }
        else {
            await dynamodb_1.db.updateItem('orders', { orderId: order.orderId, restaurantId: order.restaurantId }, {
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
            });
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
    }
    catch (error) {
        console.error('Error processing payment callback:', error);
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    type: 'https://httpstatuses.com/409',
                    title: 'Conflict',
                    status: 409,
                    detail: 'Order status has already been updated'
                })
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
            })
        };
    }
}
//# sourceMappingURL=payment-callback.js.map