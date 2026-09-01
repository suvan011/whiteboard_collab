$env:Path = "$env:LOCALAPPDATA\nodejs;" + $env:Path
Set-Location -Path $PSScriptRoot
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " 🚀 Launching CanvasConnect Collaborative Canvas" -ForegroundColor Green
Write-Host " 🎨 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host " 📡 Backend:  http://localhost:5000" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Cyan
npm run dev
