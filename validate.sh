#!/bin/bash

# Bell Project Validation Script
# Validates the project is ready for deployment

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

echo -e "${BLUE}🔍 Validating Bell Project...${NC}"

# Check if we have the required files
echo -e "${YELLOW}📋 Checking project structure...${NC}"

REQUIRED_FILES=(
    "package.json"
    "template.yaml"
    "samconfig.toml"
    "tsconfig.json"
    "src/handlers/menu.ts"
    "src/handlers/order.ts"
    "src/handlers/pos.ts"
    "src/handlers/payment-callback.ts"
    "src/handlers/auto-complete.ts"
    "src/lib/dynamodb.ts"
    "src/lib/payment.ts"
    "src/lib/pos-printer.ts"
    "src/lib/validation.ts"
    "src/lib/auth.ts"
    "src/types/api.ts"
    "src/types/database.ts"
    "src/types/payment.ts"
    ".env.example"
    "README.md"
)

missing_files=0
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}❌ Missing: $file${NC}"
        missing_files=$((missing_files + 1))
    else
        echo -e "${GREEN}✅ Found: $file${NC}"
    fi
done

if [[ $missing_files -gt 0 ]]; then
    echo -e "${RED}❌ $missing_files required files are missing${NC}"
    exit 1
fi

# Check Node.js and npm
echo -e "${YELLOW}🔧 Checking Node.js environment...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not found${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"

# Check if dependencies are installed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

if [[ -d "node_modules" ]]; then
    echo -e "${GREEN}✅ Dependencies are installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# Check if build succeeded
if [[ -d "dist" ]] && [[ -f "dist/handlers/menu.js" ]]; then
    echo -e "${GREEN}✅ TypeScript build successful${NC}"
    
    # Count the built files
    js_files=$(find dist -name "*.js" | wc -l)
    echo -e "${BLUE}📊 Built $js_files JavaScript files${NC}"
else
    echo -e "${RED}❌ TypeScript build failed${NC}"
    exit 1
fi

# Run linting if available
echo -e "${YELLOW}🧹 Running code quality checks...${NC}"
if npm run lint 2>/dev/null; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting not configured or failed${NC}"
fi

# Validate template structure (basic check)
echo -e "${YELLOW}📄 Validating SAM template...${NC}"
if grep -q "AWSTemplateFormatVersion" template.yaml && \
   grep -q "AWS::Serverless-2016-10-31" template.yaml && \
   grep -q "MenusTable" template.yaml && \
   grep -q "OrdersTable" template.yaml; then
    echo -e "${GREEN}✅ SAM template structure looks good${NC}"
else
    echo -e "${RED}❌ SAM template validation failed${NC}"
    exit 1
fi

# Check configuration
echo -e "${YELLOW}⚙️  Validating configuration...${NC}"
if [[ -f "samconfig.toml" ]] && grep -q "\[dev\]" samconfig.toml; then
    echo -e "${GREEN}✅ SAM configuration is present${NC}"
else
    echo -e "${RED}❌ SAM configuration validation failed${NC}"
    exit 1
fi

# Summary
echo -e "${GREEN}🎉 Project validation completed successfully!${NC}"
echo
echo -e "${BLUE}📋 Project Summary:${NC}"
echo -e "${BLUE}  - TypeScript source files: $(find src -name "*.ts" | wc -l)${NC}"
echo -e "${BLUE}  - Built JavaScript files: $(find dist -name "*.js" | wc -l)${NC}"
echo -e "${BLUE}  - Lambda handlers: 5${NC}"
echo -e "${BLUE}  - Library modules: 5${NC}"
echo -e "${BLUE}  - Type definitions: 3${NC}"

echo
echo -e "${YELLOW}🚀 Ready for deployment!${NC}"
echo -e "${BLUE}To deploy this project:${NC}"
echo -e "  1. Install AWS SAM CLI: pip install aws-sam-cli"
echo -e "  2. Configure AWS credentials: aws configure"
echo -e "  3. Deploy: sam build && sam deploy --config-env dev"

echo
echo -e "${YELLOW}📝 Environment setup needed:${NC}"
echo -e "  - Copy .env.example to .env and configure payment providers"
echo -e "  - Set up AWS Systems Manager parameters for secrets"
echo -e "  - Configure POS printer endpoint"