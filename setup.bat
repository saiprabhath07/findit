@echo off
cd /d "%~dp0"
echo == FindIt setup ==

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the LTS version from https://nodejs.org, then run setup.bat again.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODEV=%%v
echo Using Node %NODEV%

if not exist data mkdir data
if not exist uploads mkdir uploads
if not exist data\items.json echo []> data\items.json
if not exist data\claims.json echo []> data\claims.json
if not exist data\locations.json (
  echo data\locations.json is missing. Re-clone the repository.
  pause
  exit /b 1
)

echo Installing dependencies, needs internet...
call npm install
if errorlevel 1 (
  echo npm install failed. Check your internet connection.
  pause
  exit /b 1
)

echo.
echo Setup complete.
echo   Start the app:          run.bat
echo   Start with sample data: run.bat demo
pause
