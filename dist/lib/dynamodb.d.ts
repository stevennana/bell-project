import { MenuRecord, OrderRecord, DynamoDBQueryOptions, DynamoDBUpdateOptions } from '../types/database';
export declare class DynamoDBService {
    private static instance;
    static getInstance(): DynamoDBService;
    private getTableName;
    getItem<T>(table: 'menus' | 'orders' | 'users' | 'pos-jobs', key: {
        [key: string]: any;
    }): Promise<T | null>;
    putItem<T extends Record<string, any>>(table: 'menus' | 'orders' | 'users' | 'pos-jobs', item: T, conditionExpression?: string, expressionAttributeNames?: {
        [key: string]: string;
    }): Promise<void>;
    updateItem<T>(table: 'menus' | 'orders' | 'users' | 'pos-jobs', key: {
        [key: string]: any;
    }, options: DynamoDBUpdateOptions): Promise<T | null>;
    deleteItem(table: 'menus' | 'orders' | 'users' | 'pos-jobs', key: {
        [key: string]: any;
    }): Promise<void>;
    queryItems<T>(table: 'menus' | 'orders' | 'users' | 'pos-jobs', options: DynamoDBQueryOptions): Promise<{
        items: T[];
        lastEvaluatedKey?: {
            [key: string]: any;
        };
    }>;
    scanItems<T>(table: 'menus' | 'orders' | 'users' | 'pos-jobs', filterExpression?: string, expressionAttributeNames?: {
        [key: string]: string;
    }, expressionAttributeValues?: {
        [key: string]: any;
    }, limit?: number): Promise<{
        items: T[];
        lastEvaluatedKey?: {
            [key: string]: any;
        };
    }>;
    getLatestMenu(restaurantId: string): Promise<MenuRecord | null>;
    getOrdersByRestaurant(restaurantId: string, status?: string, limit?: number): Promise<OrderRecord[]>;
    getOrdersForAutoCompletion(): Promise<OrderRecord[]>;
}
export declare const db: DynamoDBService;
//# sourceMappingURL=dynamodb.d.ts.map