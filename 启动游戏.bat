@echo off
setlocal
cd /d "%~dp0"
title CS2 Dynasty

where node >nul 2>nul
if not errorlevel 1 goto haveNode

set "BUNDLED=C:\Users\leshe\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin"
if not exist "%BUNDLED%\node.exe" goto noNode
set "PATH=%BUNDLED%;%PATH%"
echo [i] node was not on PATH - switched to the bundled runtime.
goto haveNode

:noNode
echo [x] Node.js not found. Install Node 18+ from https://nodejs.org and retry.
pause
exit /b 1

:haveNode
if exist "node_modules\vite\package.json" goto ready
echo [1/3] Installing dependencies (first run only, about 30 seconds) ...
if not exist ".tools\npm\bin\npm-cli.js" goto npmNative
node ".tools\npm\bin\npm-cli.js" install --ignore-scripts --no-audit --no-fund --cache "%CD%\.npm-cache"
if errorlevel 1 goto installFail
goto ready

:npmNative
call npm install --no-audit --no-fund
if errorlevel 1 goto installFail
goto ready

:installFail
echo [x] Dependency install failed. Check your network and retry.
pause
exit /b 1

:ready
echo.
echo  [1/3] dependencies  OK
echo  [2/3] starting local server ...
echo  [3/3] your browser will open http://127.0.0.1:5173
echo.
echo  Progress is saved in the browser (IndexedDB). Closing this window stops the game.
echo.
node node_modules\vite\bin\vite.js --port 5173 --host 127.0.0.1 --open
pause
