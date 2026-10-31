@echo off
chcp 65001 >nul
cd /d "%~dp0"
set NODE=C:\Users\leshe\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe
if not exist "scripts\hltv-player-stats.csv" (
  echo [缺少数据] 请先准备 scripts\hltv-player-stats.csv
  pause
  exit /b 1
)
echo === 写入模式：会修改 src/data/cards.ts ===
"%NODE%" scripts\calibrate.mjs --write
echo.
echo 运行测试与构建...
"%NODE%" node_modules\vitest\vitest.mjs run
"%NODE%" node_modules\vite\bin\vite.js build
echo.
pause