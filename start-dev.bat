@echo off
chcp 65001 >nul
title 抖音直播监控系统 - 开发环境启动

echo ========================================
echo   抖音直播监控系统 - 开发环境启动
echo ========================================
echo.

:: 获取当前脚本所在目录
set "PROJECT_ROOT=%~dp0"

echo [1/2] 正在启动后端服务器 (server)...
start "后端服务器" cmd /k "cd /d "%PROJECT_ROOT%server" && npm run dev"

:: 等待2秒，让后端先启动
timeout /t 2 /nobreak >nul

echo [2/2] 正在启动前端开发服务器 (web)...
start "前端开发服务器" cmd /k "cd /d "%PROJECT_ROOT%web" && npm run dev"

echo.
echo ========================================
echo   所有服务已启动！
echo ========================================
echo.
echo 后端服务器: http://localhost:5678
echo 前端页面:   http://localhost:5679
echo.
echo 提示: 关闭对应的命令行窗口即可停止服务
echo ========================================
pause
