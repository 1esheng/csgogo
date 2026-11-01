@echo off
setlocal
cd /d "%~dp0"
title CS2 Dynasty

where node >nul 2>nul
if not errorlevel 1 goto haveNode

set "BUNDLED=%DSH_NODE_BIN%"
if not exist "%BUNDLED%\node.exe" goto noNode
set "PATH=%BUNDLED%;%PATH%"
echo [i] node was not on PATH - switched to the bundled runtime.
goto haveNode

:noNode
echo [x] Node.js not found. Install Node 18+ from https://nodejs.org and retry.
pause
exit /b 1

:haveNode
echo Running 61 automated tests (engine / 2000-match balance / saves / packs / page rendering) ...
echo.
node node_modules\vitest\vitest.mjs run
echo.
pause
