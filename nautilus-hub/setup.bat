@echo off
echo ================================================
echo   Nautilus Integration Hub - Setup
echo   Developed by Rolosa
echo ================================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=1" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% found

:: Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed.
    pause
    exit /b 1
)

echo.
echo [1/4] Installing root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 ( echo [ERROR] Root install failed & pause & exit /b 1 )

echo.
echo [2/4] Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 ( echo [ERROR] Backend install failed & pause & exit /b 1 )
cd ..

echo.
echo [3/4] Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 ( echo [ERROR] Frontend install failed & pause & exit /b 1 )
cd ..

echo.
echo [4/4] Setting up environment...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo [OK] Created backend/.env from template
    echo [!] IMPORTANT: Edit backend/.env and set a strong ENCRYPTION_KEY
) else (
    echo [OK] backend/.env already exists
)

:: Create required directories
if not exist backend\data mkdir backend\data
if not exist backend\logs mkdir backend\logs
echo [OK] Created data and logs directories

echo.
echo ================================================
echo   Setup complete!
echo.
echo   To start the application:
echo     run start.bat
echo.
echo   Or start manually:
echo     Backend:  cd backend ^&^& npm run dev
echo     Frontend: cd frontend ^&^& npm run dev
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo   Health:   http://localhost:3001/health
echo ================================================
echo.
pause
