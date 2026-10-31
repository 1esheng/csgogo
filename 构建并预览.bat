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
echo [1/3] type-checking ...
node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 goto fail
echo [2/3] building into dist\ ...
node node_modules\vite\bin\vite.js build
if errorlevel 1 goto fail
echo [3/3] preview server on http://127.0.0.1:4173 ...
node node_modules\vite\bin\vite.js preview --port 4173 --host 127.0.0.1 --open
pause
exit /b 0

:fail
echo [x] Build failed - see the errors above.
pause
exit /b 1
