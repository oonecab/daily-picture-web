@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Please install Node.js 22 or newer, then run this launcher again.
  pause
  exit /b 1
)
echo Daily Picture - local web app
echo Close this window or press Ctrl+C to stop the server.
node server.mjs --open %*
if errorlevel 1 pause
