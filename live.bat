@echo off
echo ===================================================
echo  Starting Instant Public HTTPS Tunnel on Port 443...
echo  (Keep this window OPEN while sharing the link)
echo ===================================================
ssh -p 443 -R 80:localhost:5000 a.pinggy.io
pause
