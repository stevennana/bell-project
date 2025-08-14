"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const dynamodb_1 = require("../lib/dynamodb");
const handler = async (event, context) => {
    console.log('Auto-completion handler started', { event, context });
    try {
        const ordersToComplete = await dynamodb_1.db.getOrdersForAutoCompletion();
        console.log(`Found ${ordersToComplete.length} orders to auto-complete`);
        if (ordersToComplete.length === 0) {
            console.log('No orders to auto-complete');
            return;
        }
        const results = await Promise.allSettled(ordersToComplete.map(order => autoCompleteOrder(order)));
        let successCount = 0;
        let errorCount = 0;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successCount++;
                console.log(`Auto-completed order ${ordersToComplete[index].orderId}`);
            }
            else {
                errorCount++;
                console.error(`Failed to auto-complete order ${ordersToComplete[index].orderId}:`, result.reason);
            }
        });
        console.log(`Auto-completion completed: ${successCount} success, ${errorCount} errors`);
    }
    catch (error) {
        console.error('Auto-completion handler error:', error);
        throw error;
    }
};
exports.handler = handler;
async function autoCompleteOrder(order) {
    const now = new Date().toISOString();
    const autoCompleteMinutes = parseInt(process.env.AUTO_COMPLETE_MINUTES || '30');
    const readyTime = new Date(order.updatedAt);
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - autoCompleteMinutes);
    if (readyTime > cutoffTime) {
        console.log(`Order ${order.orderId} is not yet ready for auto-completion`);
        return;
    }
    if (order.status !== 'READY') {
        console.log(`Order ${order.orderId} is no longer in READY status: ${order.status}`);
        return;
    }
    try {
        await dynamodb_1.db.updateItem('orders', { orderId: order.orderId, restaurantId: order.restaurantId }, {
            updateExpression: 'SET #status = :status, updatedAt = :updatedAt, autoCompletedAt = :autoCompletedAt',
            expressionAttributeNames: {
                '#status': 'status'
            },
            expressionAttributeValues: {
                ':status': 'COMPLETED',
                ':updatedAt': now,
                ':autoCompletedAt': now,
                ':expectedStatus': 'READY'
            },
            conditionExpression: '#status = :expectedStatus'
        });
        console.log(`Auto-completed order ${order.orderId} after ${autoCompleteMinutes} minutes`);
        await sendCompletionNotification(order);
    }
    catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            console.log(`Order ${order.orderId} status changed during auto-completion, skipping`);
            return;
        }
        console.error(`Failed to auto-complete order ${order.orderId}:`, error);
        throw error;
    }
}
async function sendCompletionNotification(order) {
    console.log(`Sending completion notification for order ${order.orderId}`);
    const notificationData = {
        orderId: order.orderId,
        restaurantId: order.restaurantId,
        message: `Your order #${order.orderId.substring(0, 8).toUpperCase()} is ready for pickup!`,
        customerInfo: order.customerInfo
    };
    if (order.customerInfo?.phone) {
        console.log(`Would send SMS to ${order.customerInfo.phone}: ${notificationData.message}`);
    }
    if (order.customerInfo?.email) {
        console.log(`Would send email to ${order.customerInfo.email}: ${notificationData.message}`);
    }
}
//# sourceMappingURL=auto-complete.js.map