#!/bin/bash

# Bell Project Local Development Script
# Sets up local development environment with DynamoDB Local and SAM Local

set -e

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

# Set environment variables for local development
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_REGION=ap-northeast-2
export DYNAMODB_ENDPOINT=http://localhost:8000

# Create DynamoDB tables
echo -e "${YELLOW}📦 Creating DynamoDB tables...${NC}"
./scripts/create-tables-local.sh

# Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# Build SAM application
echo -e "${YELLOW}📦 Building SAM application...${NC}"
sam build

echo -e "${GREEN}✅ Local development environment is ready!${NC}"
echo -e "${BLUE}📋 Services:${NC}"
echo -e "${BLUE}  - DynamoDB Local: http://localhost:8000${NC}"
echo -e "${BLUE}  - DynamoDB Admin: http://localhost:8001${NC}"
echo -e "${BLUE}  - API Gateway Local: http://localhost:3000 (after running 'sam local start-api')${NC}"

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "1. Run 'sam local start-api --port 3000 --env-vars env-local.json' to start the API"
echo -e "2. Open http://localhost:8001 to manage DynamoDB tables"
echo -e "3. Test API endpoints at http://localhost:3000"
echo -e "4. Use Ctrl+C to stop, then run './dev-stop.sh' to clean up"

echo -e "${GREEN}🎉 Local development setup completed!${NC}"