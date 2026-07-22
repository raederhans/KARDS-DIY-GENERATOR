@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [KARDS] Node.js 22 or newer is required.
  echo [KARDS] Download it from https://nodejs.org/ and run this script again.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo [KARDS] Installing project dependencies...
  call npm ci
  if errorlevel 1 (
    echo [KARDS] Dependency installation failed.
    pause
    exit /b 1
  )
)

call npm run local -- %*
set "KARDS_EXIT_CODE=%ERRORLEVEL%"
if not "%KARDS_EXIT_CODE%"=="0" pause
exit /b %KARDS_EXIT_CODE%
