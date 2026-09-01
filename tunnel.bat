@echo off
set "PATH=%LOCALAPPDATA%\nodejs;%PATH%"
cd /d "%~dp0"
echo ==============================================
echo  Opening Public Tunnel on Port 5000...
echo ==============================================
npx.cmd localtunnel --port 5000
pause
