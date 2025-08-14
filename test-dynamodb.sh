#!/bin/bash

# DynamoDB Test Script for Bell Project
# This script tests DynamoDB operations directly against the local DynamoDB instance
# Make sure to run ./dev-local.sh first to start DynamoDB Local

set -e

DYNAMODB_ENDPOINT="http://localhost:8000"
AWS_REGION="ap-northeast-2"

# Set AWS credentials for DynamoDB Local
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=$AWS_REGION

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $1 in
        "PASS") echo -e "${GREEN}✅ PASS${NC}: $2" ;;
        "FAIL") echo -e "${RED}❌ FAIL${NC}: $2" ;;
        "INFO") echo -e "${BLUE}ℹ️  INFO${NC}: $2" ;;
        "WARN") echo -e "${YELLOW}⚠️  WARN${NC}: $2" ;;
    esac
}

# Function to test DynamoDB operation
test_dynamodb() {
    local description=$1
    local command=$2
    local expected_exit_code=${3:-0}
    
    print_status "INFO" "Testing: $description"
    
    if eval "$command" > /tmp/dynamodb_test_output 2>&1; then
        actual_exit_code=0
    else
        actual_exit_code=$?
    fi
    
    if [[ $actual_exit_code -eq $expected_exit_code ]]; then
        print_status "PASS" "$description"
        cat /tmp/dynamodb_test_output | jq . 2>/dev/null || cat /tmp/dynamodb_test_output
    else
        print_status "FAIL" "$description (Exit code: $actual_exit_code, Expected: $expected_exit_code)"
        cat /tmp/dynamodb_test_output
    fi
    
    echo "----------------------------------------"
    echo ""
    
    return $actual_exit_code
}

echo "🗄️ Starting DynamoDB Tests"
echo "DynamoDB Endpoint: $DYNAMODB_ENDPOINT"
echo "Region: $AWS_REGION"
echo "========================================"
echo ""

# Test 1: List tables
test_dynamodb "List DynamoDB tables" \
    "aws dynamodb list-tables --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION"

# Test 2: Describe Menus table
test_dynamodb "Describe bell-menus-local table" \
    "aws dynamodb describe-table --table-name bell-menus-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION"

# Test 3: Describe Orders table
test_dynamodb "Describe bell-orders-local table" \
    "aws dynamodb describe-table --table-name bell-orders-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION"

# Test 4: Put item in Menus table
test_dynamodb "Put menu item in bell-menus-local" \
    "aws dynamodb put-item --table-name bell-menus-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --item '{
        \"restaurantId\": {\"S\": \"rest_test_001\"},
        \"version\": {\"S\": \"v$(date +%s)\"},
        \"status\": {\"S\": \"CONFIRMED\"},
        \"createdAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"},
        \"items\": {\"S\": \"[{\\\"id\\\":\\\"burger_001\\\",\\\"name\\\":\\\"Test Burger\\\",\\\"price\\\":12.99,\\\"available\\\":true}]\"}
    }'"

# Test 5: Get item from Menus table
test_dynamodb "Get menu item from bell-menus-local" \
    "aws dynamodb get-item --table-name bell-menus-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key '{
        \"restaurantId\": {\"S\": \"rest_test_001\"}
    }'"

# Test 6: Query items by restaurantId
test_dynamodb "Query menus by restaurantId" \
    "aws dynamodb query --table-name bell-menus-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key-condition-expression \"restaurantId = :rid\" --expression-attribute-values '{
        \":rid\": {\"S\": \"rest_test_001\"}
    }'"

# Test 7: Put order item
ORDER_ID="order_$(uuidgen | tr '[:upper:]' '[:lower:]')"
test_dynamodb "Put order item in bell-orders-local" \
    "aws dynamodb put-item --table-name bell-orders-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --item '{
        \"orderId\": {\"S\": \"$ORDER_ID\"},
        \"restaurantId\": {\"S\": \"rest_test_001\"},
        \"status\": {\"S\": \"CREATED\"},
        \"totalAmount\": {\"N\": \"25.98\"},
        \"createdAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"},
        \"updatedAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"},
        \"expiresAt\": {\"N\": \"$(( $(date +%s) + 600 ))\"},
        \"items\": {\"S\": \"[{\\\"menuItemId\\\":\\\"burger_001\\\",\\\"quantity\\\":2,\\\"price\\\":25.98}]\"},
        \"customerInfo\": {\"S\": \"{\\\"name\\\":\\\"Test Customer\\\",\\\"phone\\\":\\\"010-1234-5678\\\"}\"}
    }'"

# Test 8: Get order item
test_dynamodb "Get order item from bell-orders-local" \
    "aws dynamodb get-item --table-name bell-orders-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key '{
        \"orderId\": {\"S\": \"$ORDER_ID\"},
        \"restaurantId\": {\"S\": \"rest_test_001\"}
    }'"

# Test 9: Query orders by restaurantId using GSI
test_dynamodb "Query orders by restaurantId using GSI" \
    "aws dynamodb query --table-name bell-orders-local --index-name restaurantId-status-index --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key-condition-expression \"restaurantId = :rid\" --expression-attribute-values '{
        \":rid\": {\"S\": \"rest_test_001\"}
    }'"

# Test 10: Update order status
test_dynamodb "Update order status" \
    "aws dynamodb update-item --table-name bell-orders-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key '{
        \"orderId\": {\"S\": \"$ORDER_ID\"},
        \"restaurantId\": {\"S\": \"rest_test_001\"}
    }' --update-expression \"SET #status = :status, updatedAt = :updatedAt\" --expression-attribute-names '{
        \"#status\": \"status\"
    }' --expression-attribute-values '{
        \":status\": {\"S\": \"PAID\"},
        \":updatedAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"}
    }'"

# Test 11: Put item in Users table
test_dynamodb "Put user item in bell-users-local" \
    "aws dynamodb put-item --table-name bell-users-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --item '{
        \"userId\": {\"S\": \"user_test_001\"},
        \"type\": {\"S\": \"CUSTOMER\"},
        \"name\": {\"S\": \"Test User\"},
        \"email\": {\"S\": \"test@example.com\"},
        \"createdAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"}
    }'"

# Test 12: Put item in POS Jobs table
JOB_ID="job_$(uuidgen | tr '[:upper:]' '[:lower:]')"
test_dynamodb "Put POS job item in bell-pos-jobs-local" \
    "aws dynamodb put-item --table-name bell-pos-jobs-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --item '{
        \"jobId\": {\"S\": \"$JOB_ID\"},
        \"orderId\": {\"S\": \"$ORDER_ID\"},
        \"status\": {\"S\": \"QUEUED\"},
        \"printerType\": {\"S\": \"receipt\"},
        \"createdAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"},
        \"expiresAt\": {\"N\": \"$(( $(date +%s) + 3600 ))\"}
    }'"

# Test 13: Scan items from each table to verify data
test_dynamodb "Scan bell-menus-local (max 5 items)" \
    "aws dynamodb scan --table-name bell-menus-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --limit 5"

test_dynamodb "Scan bell-orders-local (max 5 items)" \
    "aws dynamodb scan --table-name bell-orders-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --limit 5"

test_dynamodb "Scan bell-users-local (max 5 items)" \
    "aws dynamodb scan --table-name bell-users-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --limit 5"

test_dynamodb "Scan bell-pos-jobs-local (max 5 items)" \
    "aws dynamodb scan --table-name bell-pos-jobs-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --limit 5"

# Test 14: Test error condition (try to put item with missing required field)
print_status "INFO" "Testing error condition - putting item with missing required field"
if aws dynamodb put-item --table-name bell-orders-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --item '{
    "orderId": {"S": "invalid_order"},
    "status": {"S": "CREATED"}
}' 2>/dev/null; then
    print_status "FAIL" "Expected validation error for missing restaurantId"
else
    print_status "PASS" "Correctly rejected item with missing required field"
fi
echo "----------------------------------------"
echo ""

# Test 15: Test Global Secondary Index query on status
test_dynamodb "Query menus by status using GSI" \
    "aws dynamodb query --table-name bell-menus-local --index-name status-createdAt-index --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key-condition-expression \"#status = :status\" --expression-attribute-names '{
        \"#status\": \"status\"
    }' --expression-attribute-values '{
        \":status\": {\"S\": \"CONFIRMED\"}
    }'"

# Clean up test data
print_status "INFO" "Cleaning up test data..."

# Delete test menu
aws dynamodb delete-item --table-name bell-menus-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key '{
    "restaurantId": {"S": "rest_test_001"}
}' 2>/dev/null || true

# Delete test order
aws dynamodb delete-item --table-name bell-orders-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key '{
    "orderId": {"S": "'$ORDER_ID'"},
    "restaurantId": {"S": "rest_test_001"}
}' 2>/dev/null || true

# Delete test user
aws dynamodb delete-item --table-name bell-users-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key '{
    "userId": {"S": "user_test_001"},
    "type": {"S": "CUSTOMER"}
}' 2>/dev/null || true

# Delete test POS job
aws dynamodb delete-item --table-name bell-pos-jobs-local --endpoint-url $DYNAMODB_ENDPOINT --region $AWS_REGION --key '{
    "jobId": {"S": "'$JOB_ID'"},
    "orderId": {"S": "'$ORDER_ID'"}
}' 2>/dev/null || true

print_status "INFO" "Test data cleanup completed"

echo ""
echo "========================================"
echo "🗄️ DynamoDB Tests Completed"
echo "========================================"
echo ""
print_status "INFO" "All DynamoDB operations tested successfully!"
print_status "INFO" "Tables are ready for API testing"
echo ""
echo "Next steps:"
echo "1. Start the API server: sam local start-api --port 3000 --env-vars env-local.json"
echo "2. Open Swagger UI: open test-swagger.html"
echo "3. Visit DynamoDB Admin: http://localhost:8001"