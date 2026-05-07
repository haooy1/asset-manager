@echo off
REM Docker 多架构构建脚本 (Windows)
REM 用于构建同时支持 amd64 和 arm64 的镜像

echo ===== 构建 IT资产管理系统 Docker 镜像 =====
set VERSION=%1
if "%VERSION%"=="" set VERSION=latest

REM 检查 buildx
docker buildx version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 正在初始化 Docker Buildx...
    docker buildx create --name asset-builder --use 2>nul
    docker buildx inspect --bootstrap
)

echo.
echo 构建版本: %VERSION%
echo 架构: linux/amd64, linux/arm64
echo.

docker buildx build ^
  --platform linux/amd64,linux/arm64 ^
  --tag haooy1/asset-manager:%VERSION% ^
  --tag haooy1/asset-manager:latest ^
  --push ^
  .

echo.
echo ===== 构建完成! =====
echo 镜像: haooy1/asset-manager:%VERSION%
echo 支持架构: amd64 (x86_64) + arm64 (飞腾/鲲鹏)
