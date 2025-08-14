"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const dynamodb_1 = require("../lib/dynamodb");
const pos_printer_1 = require("../lib/pos-printer");
const uuid_1 = require("uuid");
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
            })
        };
    }
    catch (error) {
        console.error('POS handler error:', error);
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
async function handlePosPrint(event, headers) {
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
    if (!requestBody.orderId) {
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
    const order = await dynamodb_1.db.getItem('orders', {
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
            })
        };
    }
    const jobId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const expiresAt = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);
    const posJob = {
        jobId,
        orderId: requestBody.orderId,
        status: 'PENDING',
        createdAt: now,
        attempts: 0,
        expiresAt
    };
    await dynamodb_1.db.putItem('pos-jobs', posJob);
    processPrintJob(jobId, order).catch(error => {
        console.error(`Failed to process print job ${jobId}:`, error);
    });
    const response = {
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
async function handleGetPosPrint(event, headers) {
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
            })
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
            })
        };
    }
    const posJob = await dynamodb_1.db.getItem('pos-jobs', { jobId, orderId });
    if (!posJob) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                type: 'https://httpstatuses.com/404',
                title: 'Not Found',
                status: 404,
                detail: 'Print job not found'
            })
        };
    }
    const response = {
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
async function handlePosReprint(event, headers) {
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
    if (!requestBody.orderId) {
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
    const order = await dynamodb_1.db.getItem('orders', {
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
            })
        };
    }
    return await handlePosPrint({
        ...event,
        body: JSON.stringify({ orderId: requestBody.orderId })
    }, headers);
}
async function processPrintJob(jobId, order) {
    const maxAttempts = 3;
    const retryDelays = [0, 15000, 30000];
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await dynamodb_1.db.updateItem('pos-jobs', { jobId, orderId: order.orderId }, {
                updateExpression: 'SET attempts = :attempts, lastAttempt = :lastAttempt',
                expressionAttributeValues: {
                    ':attempts': attempt,
                    ':lastAttempt': new Date().toISOString()
                }
            });
            const printType = process.env.POS_PRINT_TYPE || 'kitchen';
            const printerEndpoint = process.env.POS_PRINTER_ENDPOINT;
            if (printType === 'receipt' || printType === 'both') {
                const receiptData = (0, pos_printer_1.formatOrderReceipt)(order);
                await (0, pos_printer_1.sendToPOSPrinter)(receiptData, printerEndpoint);
            }
            if (printType === 'kitchen' || printType === 'both') {
                const kitchenData = (0, pos_printer_1.formatKitchenTicket)(order);
                await (0, pos_printer_1.sendToPOSPrinter)(kitchenData, printerEndpoint);
            }
            await dynamodb_1.db.updateItem('pos-jobs', { jobId, orderId: order.orderId }, {
                updateExpression: 'SET #status = :status, completedAt = :completedAt',
                expressionAttributeNames: {
                    '#status': 'status'
                },
                expressionAttributeValues: {
                    ':status': 'SUCCESS',
                    ':completedAt': new Date().toISOString()
                }
            });
            console.log(`Print job ${jobId} completed successfully`);
            return;
        }
        catch (error) {
            console.error(`Print job ${jobId} attempt ${attempt} failed:`, error);
            if (attempt === maxAttempts) {
                await dynamodb_1.db.updateItem('pos-jobs', { jobId, orderId: order.orderId }, {
                    updateExpression: 'SET #status = :status, errorMessage = :errorMessage',
                    expressionAttributeNames: {
                        '#status': 'status'
                    },
                    expressionAttributeValues: {
                        ':status': 'FAILED',
                        ':errorMessage': error instanceof Error ? error.message : 'Unknown error'
                    }
                });
            }
            else if (retryDelays[attempt]) {
                await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            }
        }
    }
}
//# sourceMappingURL=pos.js.map