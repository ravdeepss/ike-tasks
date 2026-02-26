@echo off
REM Task Dashboard Start Script for Windows
REM Checks Node.js, installs dependencies if needed, and starts both server and client

setlocal enabledelayedexpansion

echo ========================================
echo    Task Dashboard Startup Script      
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed.
    echo Please install Node.js ^>= 16 from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: npm is not installed.
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo npm version: %NPM_VERSION%
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Function to install dependencies if node_modules doesn't exist
REM Install server dependencies
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    call npm install
    cd /d "%SCRIPT_DIR%"
    echo Server dependencies installed.
) else (
    echo Server dependencies already installed.
)

REM Install client dependencies
if not exist "client\node_modules" (
    echo.
    echo Installing client dependencies...
    cd client
    call npm install
    cd /d "%SCRIPT_DIR%"
    echo Client dependencies installed.
) else (
    echo Client dependencies already installed.
)

echo.
echo Starting Task Dashboard...
echo.

REM Start the server in a new window
echo Starting backend server on port 3001...
start "Task Dashboard - Server" cmd /c "cd /d "%SCRIPT_DIR%server" && npm start"

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Start the client in a new window
echo Starting React client on port 3000...
start "Task Dashboard - Client" cmd /c "cd /d "%SCRIPT_DIR%client" && npm start"

REM Wait for client to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Task Dashboard is starting up!      
echo ========================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo   API Health: http://localhost:3001/api/health
echo.
echo   Two new windows have been opened:
echo   - Task Dashboard - Server (backend)
echo   - Task Dashboard - Client (frontend)
echo.
echo   To stop, close those windows or run stop-dashboard.bat
echo.

endlocal