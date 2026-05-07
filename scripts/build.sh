#!/bin/bash
# Docker 多架构构建脚本
# 用于构建同时支持 amd64 和 arm64 的镜像

set -e
VERSION=${1:-latest}

echo "===== 构建 IT资产管理系统 Docker 镜像 ====="

if ! docker buildx version &>/dev/null; then
    echo "正在初始化 Docker Buildx..."
    docker buildx create --name asset-builder --use
    docker buildx inspect --bootstrap
fi

echo ""
echo "构建版本: ${VERSION}"
echo "架构: linux/amd64, linux/arm64"
echo ""

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag haooy1/asset-manager:${VERSION} \
  --tag haooy1/asset-manager:latest \
  --push \
  .

echo ""
echo "===== 构建完成! ====="
echo "镜像: haooy1/asset-manager:${VERSION}"
echo "支持架构: amd64 (x86_64) + arm64 (飞腾/鲲鹏/麒麟)"
