#!/bin/bash

# Task Dashboard Stop Script
# Kills processes on ports 3000 and 3001

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Task Dashboard Stop Script         ${NC}"
echo -e "${BLUE}========================================${NC}"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to kill process by port
kill_port() {
    local port=$1
    local killed=false
    
    # Try using lsof (macOS/Linux)
    if command -v lsof &> /dev/null; then
        local pid=$(lsof -ti :$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            echo -e "${YELLOW}Killing process $pid on port $port...${NC}"
            kill -9 $pid 2>/dev/null && killed=true
        fi
    fi
    
    # Try using fuser (Linux)
    if ! $killed && command -v fuser &> /dev/null; then
        local pid=$(fuser $port/tcp 2>/dev/null)
        if [ ! -z "$pid" ]; then
            echo -e "${YELLOW}Killing process $pid on port $port...${NC}"
            fuser -k $port/tcp 2>/dev/null && killed=true
        fi
    fi
    
    if $killed; then
        echo -e "${GREEN}Stopped process on port $port${NC}"
        return 0
    else
        echo -e "${YELLOW}No process found on port $port${NC}"
        return 1
    fi
}

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${YELLOW}Stopping $name (PID: $pid)...${NC}"
            kill $pid 2>/dev/null
            sleep 1
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null
            fi
            echo -e "${GREEN}$name stopped${NC}"
        else
            echo -e "${YELLOW}$name process (PID: $pid) is not running${NC}"
        fi
        rm -f "$pid_file"
    fi
}

# Try to kill by PID files first
echo -e "\n${YELLOW}Checking for saved PID files...${NC}"
kill_by_pid_file ".server.pid" "Server"
kill_by_pid_file ".client.pid" "Client"

# Kill any remaining processes on ports
echo -e "\n${YELLOW}Checking ports 3000 and 3001...${NC}"
kill_port 3000
kill_port 3001

# Also try to kill any node processes that might be the dashboard
echo -e "\n${YELLOW}Looking for stray Node.js processes...${NC}"
if command -v pgrep &> /dev/null; then
    # Look for node processes running our server or client
    local server_pids=$(pgrep -f "node.*server/index.js" 2>/dev/null)
    local client_pids=$(pgrep -f "react-scripts" 2>/dev/null)
    
    if [ ! -z "$server_pids" ]; then
        echo -e "${YELLOW}Found server processes: $server_pids${NC}"
        echo "$server_pids" | xargs kill 2>/dev/null || true
    fi
    
    if [ ! -z "$client_pids" ]; then
        echo -e "${YELLOW}Found client processes: $client_pids${NC}"
        echo "$client_pids" | xargs kill 2>/dev/null || true
    fi
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Task Dashboard stopped              ${NC}"
echo -e "${GREEN}========================================${NC}"