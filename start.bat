@echo off
set "PATH=%LOCALAPPDATA%\nodejs;%PATH%"
cd /d "%~dp0"
echo ==============================================
echo  Launching CanvasConnect Collaborative Canvas
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:5000
echo ==============================================
npm run dev
pause
