#!/bin/bash

# Task Dashboard Start Script
# Checks Node.js, installs dependencies if needed, and starts both server and client

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Task Dashboard Startup Script      ${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if Node.js is installed
echo -e "\n${YELLOW}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo -e "${YELLOW}Please install Node.js >= 16 from https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
echo -e "${GREEN}Node.js version: $(node -v)${NC}"

if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}Error: Node.js version must be >= 16. Current version: $(node -v)${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}npm version: $(npm -v)${NC}"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to install dependencies if node_modules doesn't exist
install_deps() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir/node_modules" ]; then
        echo -e "\n${YELLOW}Installing $name dependencies...${NC}"
        cd "$dir"
        npm install
        cd "$SCRIPT_DIR"
        echo -e "${GREEN}$name dependencies installed.${NC}"
    else
        echo -e "${GREEN}$name dependencies already installed.${NC}"
    fi
}

# Install server dependencies
install_deps "server" "server"

# Install client dependencies
install_deps "client" "client"

# Check if ports 3000 and 3001 are available
echo -e "\n${YELLOW}Checking ports...${NC}"

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}Warning: Port $port is already in use.${NC}"
        echo -e "${YELLOW}You may need to stop the existing process or run: ./stop-dashboard.sh${NC}"
        return 1
    fi
    return 0
}

PORT_3000_OK=true
PORT_3001_OK=true

# Try to check ports (may not work on all systems)
if command -v lsof &> /dev/null; then
    check_port 3000 || PORT_3000_OK=false
    check_port 3001 || PORT_3001_OK=false
elif command -v netstat &> /dev/null; then
    if netstat -an | grep -q ":3000.*LISTEN"; then
        echo -e "${RED}Warning: Port 3000 is already in use.${NC}"
        PORT_3000_OK=false
    fi
    if netstat -an | grep -q ":3001.*LISTEN"; then
        echo -e "${RED}Warning: Port 3001 is already in use.${NC}"
        PORT_3001_OK=false
    fi
fi

# Start the server in the background
echo -e "\n${YELLOW}Starting backend server on port 3001...${NC}"
cd server
npm start &
SERVER_PID=$!
cd "$SCRIPT_DIR"

# Wait a moment for server to start
sleep 2

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}Error: Server failed to start.${NC}"
    exit 1
fi
echo -e "${GREEN}Server started (PID: $SERVER_PID)${NC}"

# Start the client
echo -e "\n${YELLOW}Starting React client on port 3000...${NC}"
cd client
npm start &
CLIENT_PID=$!
cd "$SCRIPT_DIR"

# Wait for client to start
sleep 3

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Task Dashboard is starting up!      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "  ${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "  ${BLUE}Backend:${NC}  http://localhost:3001"
echo -e "  ${BLUE}API Health:${NC} http://localhost:3001/api/health"
echo -e ""
echo -e "  ${YELLOW}Server PID:${NC} $SERVER_PID"
echo -e "  ${YELLOW}Client PID:${NC} $CLIENT_PID"
echo -e ""
echo -e "  ${YELLOW}Press Ctrl+C to stop both processes${NC}"
echo -e ""

# Save PIDs to a file for the stop script
echo "$SERVER_PID" > .server.pid
echo "$CLIENT_PID" >> .client.pid

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping Task Dashboard...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    rm -f .server.pid .client.pid
    echo -e "${GREEN}Task Dashboard stopped.${NC}"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait $SERVER_PID $CLIENT_PID

# If we get here, one of the processes died
echo -e "${RED}One of the processes has stopped unexpectedly.${NC}"
cleanup