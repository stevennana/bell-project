#!/bin/bash

# Stop script for Bell Project frontends

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Bell Project Frontend Development Servers${NC}"

# Function to stop process by PID file
stop_process() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}🛑 Stopping $service_name (PID: $pid)${NC}"
            kill "$pid"
            # Wait a moment for graceful shutdown
            sleep 2
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${YELLOW}⚡ Force stopping $service_name${NC}"
                kill -9 "$pid" 2>/dev/null || true
            fi
            echo -e "${GREEN}✅ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  $service_name was not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}⚠️  No PID file found for $service_name${NC}"
    fi
}

# Stop frontend services
stop_process ".owner-frontend.pid" "Owner Dashboard"
stop_process ".customer-frontend.pid" "Customer Frontend"

# Also kill any remaining vite processes on our ports
echo -e "${YELLOW}🔍 Checking for remaining processes on ports 3001-3002${NC}"
for port in 3001 3002; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${YELLOW}⚡ Force stopping process on port $port${NC}"
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
    fi
done

echo ""
echo -e "${GREEN}✅ All frontend development servers stopped${NC}"
echo -e "${BLUE}📋 Cleanup complete:${NC}"
echo -e "${BLUE}  • Owner Dashboard (port 3001) - stopped${NC}"
echo -e "${BLUE}  • Customer Frontend (port 3002) - stopped${NC}"
echo ""
echo -e "${YELLOW}💡 To restart: ./dev-frontend.sh${NC}"