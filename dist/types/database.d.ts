import { MenuItem, OrderItem } from './api';
export interface MenuRecord {
    restaurantId: string;
    version: string;
    items: MenuItem[];
    status: 'DRAFT' | 'CONFIRMED';
    createdAt: string;
    confirmedAt?: string;
}
export interface OrderRecord {
    orderId: string;
    restaurantId: string;
    menuSnapshot: {
        version: string;
        items: MenuItem[];
    };
    items: OrderItem[];
    status: 'CREATED' | 'PAID' | 'CONFIRMED' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    expiresAt?: number;
    customerInfo?: {
        phone?: string;
        email?: string;
    };
    paymentInfo?: {
        method: 'naverpay' | 'kakaopay';
        transactionId: string;
        paidAt: string;
        amount: number;
    };
    refundInfo?: {
        amount: number;
        processedAt: string;
        reason: string;
    };
}
export interface UserRecord {
    userId: string;
    type: 'OWNER';
    email: string;
    passwordHash: string;
    restaurantId: string;
    createdAt: string;
    lastLogin?: string;
}
export interface PosJobRecord {
    jobId: string;
    orderId: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    createdAt: string;
    completedAt?: string;
    attempts: number;
    lastAttempt?: string;
    errorMessage?: string;
    expiresAt: number;
}
export interface DynamoDBQueryOptions {
    indexName?: string;
    keyConditionExpression: string;
    expressionAttributeNames?: {
        [key: string]: string;
    };
    expressionAttributeValues: {
        [key: string]: any;
    };
    filterExpression?: string;
    projectionExpression?: string;
    scanIndexForward?: boolean;
    limit?: number;
    exclusiveStartKey?: {
        [key: string]: any;
    };
}
export interface DynamoDBUpdateOptions {
    updateExpression: string;
    expressionAttributeNames?: {
        [key: string]: string;
    };
    expressionAttributeValues: {
        [key: string]: any;
    };
    conditionExpression?: string;
    returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
}
//# sourceMappingURL=database.d.ts.map