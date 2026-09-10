@echo off
echo ===================================================
echo   BHAAV (भाव) - Winning Hackathon Demo Launcher
echo   "Write normally. We'll tell you what your hands already know."
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking dependencies...
if not exist "node_modules" (
    echo Installing root packages...
    call npm install
)
if not exist "server\node_modules" (
    echo Installing server packages...
    cd server && call npm install && cd ..
)
if not exist "client\node_modules" (
    echo Installing client packages...
    cd client && call npm install && cd ..
)

echo [2/4] Seeding demo trajectory...
cd server && call npm run seed && cd ..

echo [3/4] Launching Bhaav Backend (port 8787) and Frontend (port 5173)...
start "Bhaav Backend API" cmd /k "cd server && set PORT=8787 && node src/index.js"
timeout /t 2 /nobreak >nul
start "Bhaav Client App" cmd /k "cd client && npx vite"

echo [4/4] Opening browser...
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo ===================================================
echo   Bhaav is running!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8787/api/health
echo.
echo   Close the two server windows to stop.
echo ===================================================
echo.
pause
