#!/bin/bash
# 系统升级脚本 - 用于生产环境一键升级到最新版本

set -e

VERSION=${1:-latest}
COMPOSE_FILE="docker-compose.prod.yml"

echo "===== IT资产管理系统 升级 ====="
echo "目标版本: ${VERSION}"
echo ""

echo "1. 拉取最新镜像..."
docker pull haooy1/asset-manager:${VERSION}

echo "2. 备份数据库..."
docker exec asset-manager-db pg_dump -U postgres asset_manager > backup_$(date +%Y%m%d_%H%M%S).sql
echo "   备份完成"

echo "3. 停止旧服务..."
docker compose -f ${COMPOSE_FILE} down

echo "4. 启动新版本..."
export VERSION=${VERSION}
docker compose -f ${COMPOSE_FILE} up -d

echo "5. 运行数据库迁移..."
sleep 5
docker exec -it asset-manager npx prisma db push --accept-data-loss

echo ""
echo "===== 升级完成! ====="
echo "版本: ${VERSION}"
echo "访问: http://your-server:3000"
