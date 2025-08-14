#!/bin/bash

# Bell Project Local Development Stop Script
# Stops and cleans up local development environment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Bell Project Local Development Environment...${NC}"

# Kill SAM local API process if PID file exists
if [ -f ".sam-local.pid" ]; then
    SAM_PID=$(cat .sam-local.pid)
    if ps -p $SAM_PID > /dev/null; then
        echo -e "${YELLOW}🔪 Stopping SAM local API (PID: $SAM_PID)...${NC}"
        kill $SAM_PID 2>/dev/null || true
        sleep 2
        # Force kill if still running
        kill -9 $SAM_PID 2>/dev/null || true
    fi
    rm .sam-local.pid
fi

# Kill any remaining processes on the ports we use
echo -e "${YELLOW}🔪 Cleaning up any remaining processes...${NC}"

# Kill processes on port 3000 (API Gateway)
# lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill processes on port 8000 (DynamoDB Local) - usually handled by docker-compose
# lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Kill processes on port 8001 (DynamoDB Admin) - usually handled by docker-compose  
# lsof -ti:8001 | xargs kill -9 2>/dev/null || true

# Kill processes on port 8080 (Swagger UI)
# lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Stop Docker containers
echo -e "${YELLOW}🐳 Stopping Docker containers...${NC}"
docker-compose down

# Clean up log files
if [ -f "sam-local.log" ]; then
    echo -e "${YELLOW}🧹 Cleaning up log files...${NC}"
    rm -f sam-local.log
fi

echo -e "${GREEN}✅ Local development environment stopped!${NC}"
echo -e "${BLUE}💡 To start again, run: ./dev-local.sh${NC}"
