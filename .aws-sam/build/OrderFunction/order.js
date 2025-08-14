"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const dynamodb_1 = require("../lib/dynamodb");
const uuid_1 = require("uuid");
const handler = async (event) => {
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
            })
        };
    }
    catch (error) {
        console.error('Order handler error:', error);
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
async function handlePostOrder(event, headers) {
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
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
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
    if (!requestBody.restaurantId || !requestBody.items || !Array.isArray(requestBody.items) || requestBody.items.length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/400',
                title: 'Bad Request',
                status: 400,
                detail: 'Restaurant ID and items are required'
            })
        };
    }
    const menu = await dynamodb_1.db.getLatestMenu(requestBody.restaurantId);
    if (!menu) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/404',
                title: 'Not Found',
                status: 404,
                detail: 'Menu not found for this restaurant'
            })
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
                })
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
                })
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
                    })
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
                    })
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
                    })
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
                })
            };
        }
        totalAmount += expectedItemTotal;
        validatedItems.push({
            ...orderItem,
            selectedOptions: validatedOptions,
            price: expectedItemTotal
        });
    }
    const orderId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const cartTtlMinutes = parseInt(process.env.CART_TTL_MINUTES || '10');
    const expiresAt = Math.floor((Date.now() + cartTtlMinutes * 60 * 1000) / 1000);
    const order = {
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
    await dynamodb_1.db.putItem('orders', order);
    const paymentUrl = `${process.env.PAYMENT_BASE_URL || 'https://example.com'}/payment?orderId=${orderId}`;
    const response = {
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
async function handleGetOrder(event, headers) {
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
            })
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
            })
        };
    }
    const order = await dynamodb_1.db.getItem('orders', { orderId, restaurantId });
    if (!order) {
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
    const response = {
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
async function handleDeleteOrder(event, headers) {
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
            })
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
            })
        };
    }
    const order = await dynamodb_1.db.getItem('orders', { orderId, restaurantId });
    if (!order) {
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
    if (order.status === 'COMPLETED') {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/400',
                title: 'Bad Request',
                status: 400,
                detail: 'Cannot cancel completed order'
            })
        };
    }
    let refundAmount = order.totalAmount;
    if (order.status === 'COOKING' || order.status === 'READY') {
        const refundCapPercent = parseInt(process.env.REFUND_CAP_PERCENT || '5');
        const maxRefund = order.totalAmount * (refundCapPercent / 100);
        refundAmount = Math.min(refundAmount, maxRefund);
    }
    const now = new Date().toISOString();
    await dynamodb_1.db.updateItem('orders', { orderId, restaurantId }, {
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
    });
    const response = {
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
//# sourceMappingURL=order.js.map