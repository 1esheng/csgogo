@echo off
setlocal
cd /d "%~dp0"
title CS2 Dynasty

set "BUNDLED=%DSH_NODE_BIN%"
where node >nul 2>nul
if not errorlevel 1 goto haveNode
if not exist "%BUNDLED%\node.exe" goto noNode
set "PATH=%BUNDLED%;%PATH%"
goto haveNode

:noNode
echo [x] 未找到 Node.js，请安装 Node 18+ 后重试：https://nodejs.org
pause
exit /b 1

:haveNode
if exist "dist\index.html" goto fast
echo [1/2] 首次运行：安装依赖并构建（约 40 秒，只需一次）...
if exist ".tools\npm\bin\npm-cli.js" (
  node ".tools\npm\bin\npm-cli.js" install --ignore-scripts --no-audit --no-fund --cache "%CD%\.npm-cache"
) else (
  call npm install --no-audit --no-fund
)
if errorlevel 1 goto installFail
call npx vite build
if errorlevel 1 goto buildFail

:fast
node tools\serve.cjs
goto end

:installFail
echo [x] 依赖安装失败，请检查网络后重试。
pause
exit /b 1

:buildFail
echo [x] 构建失败。
pause
exit /b 1

:end
endlocal