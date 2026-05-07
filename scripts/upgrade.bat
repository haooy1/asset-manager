@echo off
REM 系统升级脚本 (Windows 版) - 用于生产环境一键升级到最新版本

setlocal
set VERSION=%1
if "%VERSION%"=="" set VERSION=latest

echo ===== IT资产管理系统 升级 =====
echo 目标版本: %VERSION%
echo.

echo 1. 拉取最新镜像...
docker pull haooy1/asset-manager:%VERSION%

echo 2. 备份数据库...
docker exec asset-manager-db pg_dump -U postgres asset_manager ^> backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%%a%%b%%c
set TIMESTAMP=%TIMESTAMP: =0%
echo    备份完成

echo 3. 停止旧服务...
docker compose -f docker-compose.prod.yml down

echo 4. 启动新版本...
set VERSION=%VERSION%
docker compose -f docker-compose.prod.yml up -d

echo 5. 运行数据库迁移...
timeout /t 5 /nobreak >nul
docker exec -it asset-manager npx prisma db push --accept-data-loss

echo.
echo ===== 升级完成! =====
echo 版本: %VERSION%
echo 访问: http://your-server:3000
