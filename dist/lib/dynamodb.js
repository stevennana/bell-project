"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DynamoDBService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
class DynamoDBService {
    static getInstance() {
        if (!DynamoDBService.instance) {
            DynamoDBService.instance = new DynamoDBService();
        }
        return DynamoDBService.instance;
    }
    getTableName(table) {
        const tableMap = {
            'menus': process.env.MENUS_TABLE,
            'orders': process.env.ORDERS_TABLE,
            'users': process.env.USERS_TABLE,
            'pos-jobs': process.env.POS_JOBS_TABLE
        };
        return tableMap[table];
    }
    async getItem(table, key) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.getTableName(table),
                Key: key
            });
            const result = await docClient.send(command);
            return result.Item || null;
        }
        catch (error) {
            console.error(`Error getting item from ${table}:`, error);
            throw error;
        }
    }
    async putItem(table, item, conditionExpression, expressionAttributeNames) {
        try {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.getTableName(table),
                Item: item,
                ConditionExpression: conditionExpression,
                ExpressionAttributeNames: expressionAttributeNames
            });
            await docClient.send(command);
        }
        catch (error) {
            console.error(`Error putting item to ${table}:`, error);
            throw error;
        }
    }
    async updateItem(table, key, options) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.getTableName(table),
                Key: key,
                UpdateExpression: options.updateExpression,
                ExpressionAttributeNames: options.expressionAttributeNames,
                ExpressionAttributeValues: options.expressionAttributeValues,
                ConditionExpression: options.conditionExpression,
                ReturnValues: options.returnValues || 'ALL_NEW'
            });
            const result = await docClient.send(command);
            return result.Attributes || null;
        }
        catch (error) {
            console.error(`Error updating item in ${table}:`, error);
            throw error;
        }
    }
    async deleteItem(table, key) {
        try {
            const command = new lib_dynamodb_1.DeleteCommand({
                TableName: this.getTableName(table),
                Key: key
            });
            await docClient.send(command);
        }
        catch (error) {
            console.error(`Error deleting item from ${table}:`, error);
            throw error;
        }
    }
    async queryItems(table, options) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
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
                items: result.Items || [],
                lastEvaluatedKey: result.LastEvaluatedKey
            };
        }
        catch (error) {
            console.error(`Error querying items from ${table}:`, error);
            throw error;
        }
    }
    async scanItems(table, filterExpression, expressionAttributeNames, expressionAttributeValues, limit) {
        try {
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: this.getTableName(table),
                FilterExpression: filterExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                Limit: limit
            });
            const result = await docClient.send(command);
            return {
                items: result.Items || [],
                lastEvaluatedKey: result.LastEvaluatedKey
            };
        }
        catch (error) {
            console.error(`Error scanning items from ${table}:`, error);
            throw error;
        }
    }
    async getLatestMenu(restaurantId) {
        const result = await this.queryItems('menus', {
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
    async getOrdersByRestaurant(restaurantId, status, limit) {
        if (status) {
            const result = await this.queryItems('orders', {
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
        }
        else {
            const result = await this.queryItems('orders', {
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
    async getOrdersForAutoCompletion() {
        const autoCompleteTime = new Date();
        autoCompleteTime.setMinutes(autoCompleteTime.getMinutes() - parseInt(process.env.AUTO_COMPLETE_MINUTES || '30'));
        const result = await this.scanItems('orders', '#status = :status AND updatedAt < :cutoffTime', { '#status': 'status' }, {
            ':status': 'READY',
            ':cutoffTime': autoCompleteTime.toISOString()
        });
        return result.items;
    }
}
exports.DynamoDBService = DynamoDBService;
exports.db = DynamoDBService.getInstance();
//# sourceMappingURL=dynamodb.js.map