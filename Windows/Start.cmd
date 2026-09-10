@echo off
REM Open the Windows folder, then double-click this file. Do not paste it into PowerShell.
cd /d "%~dp0.."
if not exist "scripts\serve-embed.py" (
  echo Could not find the unzipped folder. Extract the zip, open the inner folder, then open Windows.
  goto FAIL
)

set "PY="
py -3 --version >nul 2>&1
if not errorlevel 1 (
  set "PY=py -3"
  goto HAVEPY
)
python --version >nul 2>&1
if not errorlevel 1 (
  set "PY=python"
  goto HAVEPY
)
python3 --version >nul 2>&1
if not errorlevel 1 (
  set "PY=python3"
  goto HAVEPY
)

echo Python is not installed.
echo Open https://www.python.org/downloads/ and tick Add python.exe to PATH, then try again.
goto FAIL

:HAVEPY
curl -sf --max-time 1 http://127.0.0.1:43141/preview.html >nul 2>&1
if not errorlevel 1 (
  echo Port 43141 is already in use. Double-click Stop.cmd, then start again.
  goto FAIL
)

echo Leave this window until the other window says Ready.
echo If the page fails, try http://localhost:43141/preview.html then http://127.0.0.1:43141/preview.html
echo.

start "Pallet calculators" cmd /k %PY% scripts\serve-embed.py

set /a i=0
:WAIT
curl -sf http://127.0.0.1:43141/preview.html >nul 2>&1
if not errorlevel 1 goto READY
curl -sf http://localhost:43141/preview.html >nul 2>&1
if not errorlevel 1 goto READY
set /a i+=1
if %i% GEQ 60 goto TIMEOUT
ping -n 2 127.0.0.1 >nul
goto WAIT

:READY
echo Ready. Opening the calculators.
start http://localhost:43141/preview.html
exit /b 0

:TIMEOUT
echo The preview did not become ready in time. Read the other window.
goto FAIL

:FAIL
echo.
if not defined GITHUB_ACTIONS pause
exit /b 1
