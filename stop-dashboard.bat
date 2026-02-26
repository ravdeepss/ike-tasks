@echo off
REM Task Dashboard Stop Script for Windows
REM Kills processes on ports 3000 and 3001

echo ========================================
echo    Task Dashboard Stop Script         
echo ========================================
echo.

echo Stopping Task Dashboard...
echo.

REM Kill process on port 3000 (client)
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 3000...
    taskkill /F /PID %%a >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo Stopped process on port 3000
    )
)

REM Kill process on port 3001 (server)
echo Checking port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process %%a on port 3001...
    taskkill /F /PID %%a >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo Stopped process on port 3001
    )
)

REM Also try to kill by window title
echo.
echo Closing Task Dashboard windows...
taskkill /FI "WINDOWTITLE eq Task Dashboard - Server*" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq Task Dashboard - Client*" /F >nul 2>nul

echo.
echo ========================================
echo   Task Dashboard stopped              
echo ========================================