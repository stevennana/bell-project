"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const dynamodb_1 = require("../lib/dynamodb");
const handler = async (event) => {
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
        if (method === 'GET' && path === '/menu') {
            return await handleGetMenu(event, headers);
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
            })
        };
    }
    catch (error) {
        console.error('Menu handler error:', error);
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
async function handleGetMenu(event, headers) {
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
    const menu = await dynamodb_1.db.getLatestMenu(restaurantId);
    if (!menu) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/404',
                title: 'Not Found',
                status: 404,
                detail: 'No menu found for this restaurant'
            })
        };
    }
    const response = {
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
async function handlePostMenu(event, headers) {
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
    if (!requestBody.items || !Array.isArray(requestBody.items) || requestBody.items.length === 0) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/400',
                title: 'Bad Request',
                status: 400,
                detail: 'Menu items are required'
            })
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
                })
            };
        }
    }
    const now = new Date().toISOString();
    const version = `v${Date.now()}`;
    const newMenu = {
        restaurantId,
        version,
        items: requestBody.items,
        status: 'DRAFT',
        createdAt: now
    };
    try {
        await dynamodb_1.db.putItem('menus', newMenu);
        const shouldConfirm = event.queryStringParameters?.confirm === 'true';
        if (shouldConfirm) {
            const existingMenus = await dynamodb_1.db.queryItems('menus', {
                keyConditionExpression: 'restaurantId = :restaurantId',
                expressionAttributeValues: {
                    ':restaurantId': restaurantId
                }
            });
            for (const menu of existingMenus.items) {
                if (menu.status === 'CONFIRMED') {
                    await dynamodb_1.db.updateItem('menus', { restaurantId: menu.restaurantId, version: menu.version }, {
                        updateExpression: 'SET #status = :status',
                        expressionAttributeNames: {
                            '#status': 'status'
                        },
                        expressionAttributeValues: {
                            ':status': 'DRAFT'
                        }
                    });
                }
            }
            await dynamodb_1.db.updateItem('menus', { restaurantId, version }, {
                updateExpression: 'SET #status = :status, confirmedAt = :confirmedAt',
                expressionAttributeNames: {
                    '#status': 'status'
                },
                expressionAttributeValues: {
                    ':status': 'CONFIRMED',
                    ':confirmedAt': now
                }
            });
            newMenu.status = 'CONFIRMED';
            newMenu.confirmedAt = now;
        }
        const response = {
            version,
            status: newMenu.status,
            createdAt: now
        };
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        console.error('Error creating menu:', error);
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    type: 'https://httpstatuses.com/409',
                    title: 'Conflict',
                    status: 409,
                    detail: 'Menu version already exists'
                })
            };
        }
        throw error;
    }
}
//# sourceMappingURL=menu.js.map