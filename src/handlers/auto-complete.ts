import { ScheduledEvent, Context } from 'aws-lambda';
import { OrderRecord } from '../types/database';
import { db } from '../lib/dynamodb';

export const handler = async (
  event: ScheduledEvent,
  context: Context
): Promise<void> => {
  console.log('Auto-completion handler started', { event, context });

  try {
    // Get orders that are in READY status and past the auto-complete time
    const ordersToComplete = await db.getOrdersForAutoCompletion();
    
    console.log(`Found ${ordersToComplete.length} orders to auto-complete`);

    if (ordersToComplete.length === 0) {
      console.log('No orders to auto-complete');
      return;
    }

    const results = await Promise.allSettled(
      ordersToComplete.map(order => autoCompleteOrder(order))
    );

    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
        console.log(`Auto-completed order ${ordersToComplete[index].orderId}`);
      } else {
        errorCount++;
        console.error(`Failed to auto-complete order ${ordersToComplete[index].orderId}:`, result.reason);
      }
    });

    console.log(`Auto-completion completed: ${successCount} success, ${errorCount} errors`);

  } catch (error) {
    console.error('Auto-completion handler error:', error);
    throw error;
  }
};

async function autoCompleteOrder(order: OrderRecord): Promise<void> {
  const now = new Date().toISOString();
  const autoCompleteMinutes = parseInt(process.env.AUTO_COMPLETE_MINUTES || '30');
  
  // Verify the order is still eligible for auto-completion
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
    await db.updateItem<OrderRecord>('orders',
      { orderId: order.orderId, restaurantId: order.restaurantId },
      {
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
      }
    );

    console.log(`Auto-completed order ${order.orderId} after ${autoCompleteMinutes} minutes`);

    // TODO: Send notification to customer about order completion
    await sendCompletionNotification(order);

  } catch (error) {
    if ((error as any).name === 'ConditionalCheckFailedException') {
      console.log(`Order ${order.orderId} status changed during auto-completion, skipping`);
      return;
    }
    
    console.error(`Failed to auto-complete order ${order.orderId}:`, error);
    throw error;
  }
}

async function sendCompletionNotification(order: OrderRecord): Promise<void> {
  // This is a placeholder for notification functionality
  // In a real implementation, this would:
  // 1. Send web push notification if customer is online
  // 2. Send app push notification if customer has the app
  // 3. Send SMS if customer provided phone number
  // 4. Send email if customer provided email address

  console.log(`Sending completion notification for order ${order.orderId}`);

  const notificationData = {
    orderId: order.orderId,
    restaurantId: order.restaurantId,
    message: `Your order #${order.orderId.substring(0, 8).toUpperCase()} is ready for pickup!`,
    customerInfo: order.customerInfo
  };

  // Placeholder notification logic
  if (order.customerInfo?.phone) {
    console.log(`Would send SMS to ${order.customerInfo.phone}: ${notificationData.message}`);
  }

  if (order.customerInfo?.email) {
    console.log(`Would send email to ${order.customerInfo.email}: ${notificationData.message}`);
  }

  // TODO: Integrate with actual notification services:
  // - AWS SNS for SMS
  // - AWS SES for email  
  // - Web push service for browser notifications
  // - Firebase or similar for app push notifications
}