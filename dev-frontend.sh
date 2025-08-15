#!/bin/bash

# Development script for Bell Project frontends
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Bell Project Frontend Development Environment${NC}"

# Function to check if a port is in use
check_port() {
    if lsof -ti:$1 > /dev/null 2>&1; then
        echo -e "${RED}⚠️  Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Check required ports (new port assignments)
echo -e "${YELLOW}📡 Checking ports...${NC}"
check_port 3001 || { echo -e "${RED}❌ Owner dashboard port 3001 is busy${NC}"; exit 1; }
check_port 3002 || { echo -e "${RED}❌ Customer frontend port 3002 is busy${NC}"; exit 1; }

# Create log directory
mkdir -p logs

# Start owner dashboard
echo -e "${YELLOW}👨‍💼 Starting owner dashboard on http://localhost:3001${NC}"
cd frontend/owner
nohup npm run dev > ../../logs/owner-frontend.log 2>&1 &
OWNER_PID=$!
echo $OWNER_PID > ../../.owner-frontend.pid

# Start customer frontend
echo -e "${YELLOW}🛍️  Starting customer frontend on http://localhost:3002${NC}"
cd ../customer
nohup npm run dev > ../../logs/customer-frontend.log 2>&1 &
CUSTOMER_PID=$!
echo $CUSTOMER_PID > ../../.customer-frontend.pid

# Return to root
cd ../..

echo ""
echo -e "${GREEN}✅ Both frontends are starting up in background!${NC}"
echo -e "${BLUE}📋 Port Configuration:${NC}"
echo -e "${BLUE}  🔧 Backend API:        http://localhost:3000${NC}"
echo -e "${BLUE}  👨‍💼 Owner Dashboard:    http://localhost:3001${NC}"
echo -e "${BLUE}  🛍️  Customer Frontend:  http://localhost:3002${NC}"
echo ""
echo -e "${YELLOW}📝 Commands:${NC}"
echo "  • Stop frontends: ./dev-frontend-stop.sh"
echo "  • View owner logs: tail -f logs/owner-frontend.log"
echo "  • View customer logs: tail -f logs/customer-frontend.log"
echo "  • Test customer: http://localhost:3002/restaurant/rest_001"
echo ""
echo -e "${GREEN}🎉 Frontend development servers started successfully!${NC}"