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

# Stop Docker containers
echo -e "${YELLOW}🐳 Stopping Docker containers...${NC}"
docker-compose down

echo -e "${GREEN}✅ Local development environment stopped!${NC}"
echo -e "${BLUE}💡 To start again, run: ./dev-local.sh${NC}"