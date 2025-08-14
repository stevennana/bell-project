#!/bin/bash

# Bell Project Deployment Script
# Prerequisites: AWS CLI and SAM CLI must be installed and configured

set -e

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Add common Node.js paths
export PATH="$HOME/.nvm/versions/node/v22.18.0/bin:$PATH"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-ap-northeast-2}

echo -e "${BLUE}🚀 Starting Bell Project deployment...${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not found. Please ensure Node.js and npm are properly installed.${NC}"
    echo -e "${BLUE}Current PATH: $PATH${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v sam &> /dev/null; then
    echo -e "${RED}❌ SAM CLI is not installed. Please install it first.${NC}"
    echo -e "${BLUE}Install with: pip install aws-sam-cli${NC}"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials are not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# Build SAM application
echo -e "${YELLOW}📦 Building SAM application...${NC}"
sam build

# Validate template
echo -e "${YELLOW}🔍 Validating template...${NC}"
sam validate

# Deploy
echo -e "${YELLOW}🚀 Deploying to AWS...${NC}"
sam deploy --config-env ${ENVIRONMENT}

# Get outputs
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${BLUE}Getting stack outputs...${NC}"

STACK_NAME="bell-project-${ENVIRONMENT}"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query 'Stacks[0].Outputs[?OutputKey==`BellApiUrl`].OutputValue' \
    --output text \
    --region ${REGION} 2>/dev/null || echo "Not available yet")

MENUS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query 'Stacks[0].Outputs[?OutputKey==`MenusTableName`].OutputValue' \
    --output text \
    --region ${REGION} 2>/dev/null || echo "Not available yet")

echo -e "${GREEN}📋 Deployment Information:${NC}"
echo -e "${BLUE}API Gateway URL: ${API_URL}${NC}"
echo -e "${BLUE}Menus Table: ${MENUS_TABLE}${NC}"

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "1. Configure your payment provider credentials in AWS Systems Manager Parameter Store"
echo -e "2. Set up your domain and SSL certificate for the API"
echo -e "3. Configure your POS printer endpoint"
echo -e "4. Test the API endpoints:"
echo -e "   curl ${API_URL}/menu?restaurantId=test-restaurant"

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"