@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
set NODE=node
if not exist "scripts\hltv-player-stats.csv" (
  echo [缺少数据] 请先把 HLTV 统计存成 scripts\hltv-player-stats.csv （表头需含 nickname,rating）
  pause
  exit /b 1
)
echo === 干跑：只打印 diff，不修改任何文件 ===
"%NODE%" scripts\calibrate.mjs
echo.
pause