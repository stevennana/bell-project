#!/bin/bash

# Bell Project Local Development Script
# Sets up local development environment with DynamoDB Local and SAM Local

set -e

# Cleanup function to handle failures
cleanup_on_failure() {
    echo -e "${RED}❌ An error occurred during startup. Cleaning up...${NC}"
    ./dev-stop.sh 2>/dev/null || true
    exit 1
}

# Set up trap to call cleanup on failure
trap cleanup_on_failure ERR

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏠 Starting Bell Project Local Development Environment...${NC}"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v sam &> /dev/null; then
    echo -e "${RED}❌ SAM CLI is not installed. Please install it first.${NC}"
    echo -e "${BLUE}Install with: pip install aws-sam-cli${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create docker directory if it doesn't exist
mkdir -p docker/dynamodb

# Start DynamoDB Local
echo -e "${YELLOW}🚀 Starting DynamoDB Local...${NC}"
docker-compose up -d dynamodb-local dynamodb-admin

# Wait for DynamoDB to be ready
echo -e "${YELLOW}⏳ Waiting for DynamoDB Local to be ready...${NC}"
sleep 5

# Test DynamoDB connection
echo -e "${YELLOW}🔍 Testing DynamoDB connection...${NC}"
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=ap-northeast-2

# Retry logic for DynamoDB connection
for i in {1..10}; do
    if aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-northeast-2 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ DynamoDB Local is ready${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Waiting for DynamoDB Local... (attempt $i/10)${NC}"
        sleep 2
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ DynamoDB Local failed to start${NC}"
        cleanup_on_failure
    fi
done

# Set additional environment variables for local development
export AWS_REGION=ap-northeast-2
export DYNAMODB_ENDPOINT=http://localhost:8000

# Create DynamoDB tables
echo -e "${YELLOW}📦 Creating DynamoDB tables...${NC}"
if ! ./scripts/create-tables-local.sh; then
    echo -e "${RED}❌ Failed to create DynamoDB tables${NC}"
    cleanup_on_failure
fi

# Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
if ! npm run build; then
    echo -e "${RED}❌ Failed to build TypeScript${NC}"
    cleanup_on_failure
fi

# Build SAM application
echo -e "${YELLOW}📦 Building SAM application...${NC}"
if ! sam build; then
    echo -e "${RED}❌ Failed to build SAM application${NC}"
    cleanup_on_failure
fi

echo -e "${YELLOW}🚀 Starting API Gateway Local...${NC}"

# Check if env-local.json exists, if not create a basic one
if [ ! -f "env-local.json" ]; then
    echo -e "${YELLOW}📝 Creating env-local.json...${NC}"
    cat > env-local.json << EOF
{
  "Parameters": {
    "MENUS_TABLE": "bell-menus-local",
    "ORDERS_TABLE": "bell-orders-local", 
    "USERS_TABLE": "bell-users-local",
    "POS_JOBS_TABLE": "bell-pos-jobs-local",
    "AUTO_COMPLETE_MINUTES": "30",
    "CART_TTL_MINUTES": "10",
    "REFUND_CAP_PERCENT": "5",
    "ALLOWED_PAYMENT_METHODS": "naverpay,kakaopay",
    "POS_PRINTER_COUNT": "1",
    "AWS_DEFAULT_REGION": "ap-northeast-2"
  }
}
EOF
fi

# Start SAM local API in the background
echo -e "${YELLOW}⏳ Starting SAM local API server...${NC}"
nohup sam local start-api --template template-local.yaml --port 3000 --env-vars env-local.json --docker-network bell-project_bell-network --debug > sam-local.log 2>&1 &
SAM_PID=$!

# Wait a moment for the server to start
sleep 3

# Check if SAM local API is running
if ps -p $SAM_PID > /dev/null; then
    echo -e "${GREEN}✅ SAM local API started successfully (PID: $SAM_PID)${NC}"
    echo "$SAM_PID" > .sam-local.pid
else
    echo -e "${RED}❌ Failed to start SAM local API${NC}"
    echo -e "${YELLOW}📋 Check sam-local.log for details${NC}"
fi

# Start Admin Server
echo -e "${YELLOW}🚀 Starting Admin Server...${NC}"
if command -v python3 &> /dev/null; then
    cd admin
    nohup python3 -m http.server 8080 > ../admin-server.log 2>&1 &
    ADMIN_PID=$!
    echo "$ADMIN_PID" > ../.admin-server.pid
    cd ..
    echo -e "${GREEN}✅ Admin Server started on port 8080 (PID: $ADMIN_PID)${NC}"
else
    echo -e "${YELLOW}⚠️ Python3 not found, skipping admin server${NC}"
fi

echo ""
echo -e "${GREEN}✅ Local development environment is ready!${NC}"
echo -e "${BLUE}📋 Services:${NC}"
echo -e "${BLUE}  - DynamoDB Local: http://localhost:8000${NC}"
echo -e "${BLUE}  - DynamoDB Admin: http://localhost:8001${NC}"
echo -e "${BLUE}  - API Gateway Local: http://localhost:3000${NC}"
echo -e "${BLUE}  - Admin Dashboard: http://localhost:8080${NC}"

echo -e "${YELLOW}📝 Testing Commands:${NC}"
echo "1. Test API: curl http://localhost:3000/menu?restaurantId=test"
echo "2. Admin Dashboard: http://localhost:8080"
echo "3. Swagger UI: docker run --rm -p 8082:8080 -e SWAGGER_JSON=/app/swagger.yaml -v \"\$PWD/swagger.yaml:/app/swagger.yaml\" swaggerapi/swagger-ui"
echo "4. DynamoDB Admin: http://localhost:8001"
echo "5. View API logs: tail -f sam-local.log"
echo "6. View Admin logs: tail -f admin-server.log"
echo "7. Stop everything: ./dev-stop.sh"
echo -e "${GREEN}🎉 Local development setup completed!${NC}"
