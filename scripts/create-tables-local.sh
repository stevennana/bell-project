#!/bin/bash

# Create DynamoDB tables for local development

set -e

DYNAMODB_ENDPOINT="http://localhost:8000"
AWS_REGION="ap-northeast-2"

echo "🗄️ Creating DynamoDB tables for local development..."

# Set AWS credentials for DynamoDB Local
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=$AWS_REGION

# Menus Table
echo "Creating Menus table..."
aws dynamodb create-table \
    --endpoint-url $DYNAMODB_ENDPOINT \
    --table-name bell-menus-local \
    --attribute-definitions \
        AttributeName=restaurantId,AttributeType=S \
        AttributeName=version,AttributeType=S \
        AttributeName=status,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=restaurantId,KeyType=HASH \
        AttributeName=version,KeyType=RANGE \
    --global-secondary-indexes \
        'IndexName=status-createdAt-index,KeySchema=[{AttributeName=status,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --billing-mode PAY_PER_REQUEST \
    --region $AWS_REGION

# Orders Table
echo "Creating Orders table..."
aws dynamodb create-table \
    --endpoint-url $DYNAMODB_ENDPOINT \
    --table-name bell-orders-local \
    --attribute-definitions \
        AttributeName=orderId,AttributeType=S \
        AttributeName=restaurantId,AttributeType=S \
        AttributeName=status,AttributeType=S \
        AttributeName=createdAt,AttributeType=S \
    --key-schema \
        AttributeName=orderId,KeyType=HASH \
        AttributeName=restaurantId,KeyType=RANGE \
    --global-secondary-indexes \
        'IndexName=restaurantId-status-index,KeySchema=[{AttributeName=restaurantId,KeyType=HASH},{AttributeName=status,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        'IndexName=restaurantId-createdAt-index,KeySchema=[{AttributeName=restaurantId,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --billing-mode PAY_PER_REQUEST \
    --region $AWS_REGION

# Users Table
echo "Creating Users table..."
aws dynamodb create-table \
    --endpoint-url $DYNAMODB_ENDPOINT \
    --table-name bell-users-local \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=type,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=type,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region $AWS_REGION

# POS Jobs Table
echo "Creating POS Jobs table..."
aws dynamodb create-table \
    --endpoint-url $DYNAMODB_ENDPOINT \
    --table-name bell-pos-jobs-local \
    --attribute-definitions \
        AttributeName=jobId,AttributeType=S \
        AttributeName=orderId,AttributeType=S \
    --key-schema \
        AttributeName=jobId,KeyType=HASH \
        AttributeName=orderId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region $AWS_REGION

echo "✅ All tables created successfully!"
echo "📋 Tables created:"
echo "  - bell-menus-local"
echo "  - bell-orders-local"  
echo "  - bell-users-local"
echo "  - bell-pos-jobs-local"
echo ""
echo "🔗 View tables at: http://localhost:8001"