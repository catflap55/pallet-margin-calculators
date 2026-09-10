@echo off
REM Open the Windows folder, then double-click this file to stop the local preview.
cd /d "%~dp0.."
echo Stopping the local calculators preview...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 43141 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo Done. Port 43141 should be free.
if not defined GITHUB_ACTIONS pause
