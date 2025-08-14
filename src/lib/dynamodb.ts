import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';
import { MenuRecord, OrderRecord, UserRecord, PosJobRecord, DynamoDBQueryOptions, DynamoDBUpdateOptions } from '../types/database';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export class DynamoDBService {
  private static instance: DynamoDBService;

  static getInstance(): DynamoDBService {
    if (!DynamoDBService.instance) {
      DynamoDBService.instance = new DynamoDBService();
    }
    return DynamoDBService.instance;
  }

  private getTableName(table: 'menus' | 'orders' | 'users' | 'pos-jobs'): string {
    const tableMap = {
      'menus': process.env.MENUS_TABLE!,
      'orders': process.env.ORDERS_TABLE!,
      'users': process.env.USERS_TABLE!,
      'pos-jobs': process.env.POS_JOBS_TABLE!
    };
    return tableMap[table];
  }

  async getItem<T>(
    table: 'menus' | 'orders' | 'users' | 'pos-jobs',
    key: { [key: string]: any }
  ): Promise<T | null> {
    try {
      const command = new GetCommand({
        TableName: this.getTableName(table),
        Key: key
      });
      
      const result = await docClient.send(command);
      return (result.Item as T) || null;
    } catch (error) {
      console.error(`Error getting item from ${table}:`, error);
      throw error;
    }
  }

  async putItem<T extends Record<string, any>>(
    table: 'menus' | 'orders' | 'users' | 'pos-jobs',
    item: T,
    conditionExpression?: string,
    expressionAttributeNames?: { [key: string]: string }
  ): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.getTableName(table),
        Item: item,
        ConditionExpression: conditionExpression,
        ExpressionAttributeNames: expressionAttributeNames
      });
      
      await docClient.send(command);
    } catch (error) {
      console.error(`Error putting item to ${table}:`, error);
      throw error;
    }
  }

  async updateItem<T>(
    table: 'menus' | 'orders' | 'users' | 'pos-jobs',
    key: { [key: string]: any },
    options: DynamoDBUpdateOptions
  ): Promise<T | null> {
    try {
      const command = new UpdateCommand({
        TableName: this.getTableName(table),
        Key: key,
        UpdateExpression: options.updateExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        ConditionExpression: options.conditionExpression,
        ReturnValues: options.returnValues || 'ALL_NEW'
      });
      
      const result = await docClient.send(command);
      return result.Attributes as T || null;
    } catch (error) {
      console.error(`Error updating item in ${table}:`, error);
      throw error;
    }
  }

  async deleteItem(
    table: 'menus' | 'orders' | 'users' | 'pos-jobs',
    key: { [key: string]: any }
  ): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.getTableName(table),
        Key: key
      });
      
      await docClient.send(command);
    } catch (error) {
      console.error(`Error deleting item from ${table}:`, error);
      throw error;
    }
  }

  async queryItems<T>(
    table: 'menus' | 'orders' | 'users' | 'pos-jobs',
    options: DynamoDBQueryOptions
  ): Promise<{ items: T[]; lastEvaluatedKey?: { [key: string]: any } }> {
    try {
      const command = new QueryCommand({
        TableName: this.getTableName(table),
        IndexName: options.indexName,
        KeyConditionExpression: options.keyConditionExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        FilterExpression: options.filterExpression,
        ProjectionExpression: options.projectionExpression,
        ScanIndexForward: options.scanIndexForward,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey
      });
      
      const result = await docClient.send(command);
      return {
        items: result.Items as T[] || [],
        lastEvaluatedKey: result.LastEvaluatedKey
      };
    } catch (error) {
      console.error(`Error querying items from ${table}:`, error);
      throw error;
    }
  }

  async scanItems<T>(
    table: 'menus' | 'orders' | 'users' | 'pos-jobs',
    filterExpression?: string,
    expressionAttributeNames?: { [key: string]: string },
    expressionAttributeValues?: { [key: string]: any },
    limit?: number
  ): Promise<{ items: T[]; lastEvaluatedKey?: { [key: string]: any } }> {
    try {
      const command = new ScanCommand({
        TableName: this.getTableName(table),
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit
      });
      
      const result = await docClient.send(command);
      return {
        items: result.Items as T[] || [],
        lastEvaluatedKey: result.LastEvaluatedKey
      };
    } catch (error) {
      console.error(`Error scanning items from ${table}:`, error);
      throw error;
    }
  }

  async getLatestMenu(restaurantId: string): Promise<MenuRecord | null> {
    const result = await this.queryItems<MenuRecord>('menus', {
      indexName: 'status-createdAt-index',
      keyConditionExpression: '#status = :status',
      expressionAttributeNames: {
        '#status': 'status'
      },
      expressionAttributeValues: {
        ':status': 'CONFIRMED',
        ':restaurantId': restaurantId
      },
      filterExpression: 'restaurantId = :restaurantId',
      scanIndexForward: false,
      limit: 1
    });

    return result.items.length > 0 ? result.items[0] : null;
  }

  async getOrdersByRestaurant(
    restaurantId: string, 
    status?: string,
    limit?: number
  ): Promise<OrderRecord[]> {
    if (status) {
      const result = await this.queryItems<OrderRecord>('orders', {
        indexName: 'restaurantId-status-index',
        keyConditionExpression: 'restaurantId = :restaurantId AND #status = :status',
        expressionAttributeNames: {
          '#status': 'status'
        },
        expressionAttributeValues: {
          ':restaurantId': restaurantId,
          ':status': status
        },
        scanIndexForward: false,
        limit: limit || undefined
      });
      return result.items;
    } else {
      const result = await this.queryItems<OrderRecord>('orders', {
        indexName: 'restaurantId-createdAt-index',
        keyConditionExpression: 'restaurantId = :restaurantId',
        expressionAttributeValues: {
          ':restaurantId': restaurantId
        },
        scanIndexForward: false,
        limit: limit || undefined
      });
      return result.items;
    }
  }

  async getOrdersForAutoCompletion(): Promise<OrderRecord[]> {
    const autoCompleteTime = new Date();
    autoCompleteTime.setMinutes(autoCompleteTime.getMinutes() - parseInt(process.env.AUTO_COMPLETE_MINUTES || '30'));
    
    const result = await this.scanItems<OrderRecord>('orders',
      '#status = :status AND updatedAt < :cutoffTime',
      { '#status': 'status' },
      { 
        ':status': 'READY',
        ':cutoffTime': autoCompleteTime.toISOString()
      }
    );
    
    return result.items;
  }
}

export const db = DynamoDBService.getInstance();