@echo off
echo ================================================
echo   Nautilus Integration Hub - Starting
echo ================================================
echo.

:: Check if .env exists
if not exist backend\.env (
    echo [ERROR] backend/.env not found. Run setup.bat first.
    pause
    exit /b 1
)

:: Create directories if missing
if not exist backend\data mkdir backend\data
if not exist backend\logs mkdir backend\logs

echo Starting Nautilus Hub...
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo.
echo Press Ctrl+C to stop all services.
echo.

:: Start both services with concurrently
call npm run dev

pause
