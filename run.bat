@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get the LTS version from https://nodejs.org
  pause
  exit /b 1
)

if /i "%1"=="demo" node scripts\reset.js --demo
if /i "%1"=="reset" node scripts\reset.js

if not exist node_modules (
  echo First run: installing dependencies, needs internet...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo Starting FindIt at http://localhost:3000  (Ctrl+C to stop)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"
call npm start
pause
