@echo off
title Lumeo CRM Starter
echo ======================================================================
echo                Lumeo CRM Development Server Starter
echo ======================================================================
echo.

:: Check port 8000
netstat -ano | findstr LISTENING | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo [INFO] Backend is already running on port 8000.
) else (
    echo [STARTING] Launching Django Backend in a new window...
    start "Lumeo CRM Backend" cmd /k "cd /d \"%~dp0backend\" && .venv\Scripts\activate && python manage.py runserver"
)

:: Check port 3000
netstat -ano | findstr LISTENING | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [INFO] Frontend is already running on port 3000.
) else (
    echo [STARTING] Launching Next.js Frontend in a new window...
    start "Lumeo CRM Frontend" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"
)

echo.
echo ======================================================================
echo All set! You can now access Lumeo CRM at http://localhost:3000
echo ======================================================================
echo.
pause
