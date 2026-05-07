#!/bin/bash
# ============================================================
# IT 资产管理系统 - 一键安装脚本
# 支持: 银河麒麟 V10 / 欧拉 EulerOS / Ubuntu / Debian
# 用法: sudo bash install.sh
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
INSTALL_DIR="${INSTALL_DIR:-/opt/asset-manager}"
APP_PORT="${APP_PORT:-3000}"
DB_USER="${DB_USER:-asset_user}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 16 2>/dev/null || echo 'ChangeMe123')}"
DB_NAME="${DB_NAME:-asset_manager}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin123}"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   IT 资产管理系统 v1.0.0 - 一键安装程序     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ---- 1. 检测操作系统 ----
echo -e "${YELLOW}[1/7] 检测操作系统...${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
elif [ -f /etc/kylin-release ]; then
    OS="kylin"
elif [ -f /etc/euleros-release ]; then
    OS="euleros"
else
    OS="unknown"
fi

case "$OS" in
    kylin|Kylin|kylinos)  OS_FAMILY="kylin"; PKG_MGR="yum" ;;
    euleros|EulerOS|openEuler) OS_FAMILY="euler"; PKG_MGR="yum" ;;
    ubuntu|debian)        OS_FAMILY="debian"; PKG_MGR="apt" ;;
    centos|rhel|fedora)   OS_FAMILY="rhel"; PKG_MGR="yum" ;;
    *)                    OS_FAMILY="unknown"; PKG_MGR="" ;;
esac

echo -e "  系统: ${GREEN}${OS} ${OS_VERSION}${NC} (${OS_FAMILY})"
echo -e "  包管理器: ${GREEN}${PKG_MGR}${NC}"

# ---- 2. 安装 Node.js ----
echo -e "${YELLOW}[2/7] 安装 Node.js 20.x...${NC}"
if command -v node &>/dev/null; then
    NODE_VER=$(node -v)
    echo -e "  已安装: ${GREEN}${NODE_VER}${NC}"
else
    echo "  正在安装 Node.js 20.x..."
    case "$PKG_MGR" in
        yum)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - 2>/dev/null || true
            yum install -y nodejs 2>/dev/null || {
                echo "  yum 安装失败，尝试二进制包..."
                NODE_TAR="node-v20.18.0-linux-x64.tar.xz"
                [ "$(uname -m)" = "aarch64" ] && NODE_TAR="node-v20.18.0-linux-arm64.tar.xz"
                wget -q "https://nodejs.org/dist/v20.18.0/${NODE_TAR}" -O /tmp/node.tar.xz
                tar -xJf /tmp/node.tar.xz -C /usr/local/
                ln -sf /usr/local/node-v20.18.0-*/bin/node /usr/local/bin/node
                ln -sf /usr/local/node-v20.18.0-*/bin/npm /usr/local/bin/npm
                ln -sf /usr/local/node-v20.18.0-*/bin/npx /usr/local/bin/npx
            }
            ;;
        apt)
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null || true
            apt-get install -y nodejs 2>/dev/null
            ;;
    esac
    echo -e "  Node.js 安装完成: ${GREEN}$(node -v)${NC}"
fi

# ---- 3. 安装 PostgreSQL ----
echo -e "${YELLOW}[3/7] 安装 PostgreSQL 15+...${NC}"
if command -v psql &>/dev/null; then
    echo -e "  已安装: ${GREEN}$(psql --version | head -1)${NC}"
else
    echo "  正在安装 PostgreSQL..."
    case "$PKG_MGR" in
        yum)
            yum install -y postgresql15 postgresql15-server 2>/dev/null || \
            yum install -y postgresql-server 2>/dev/null
            postgresql-setup --initdb 2>/dev/null || initdb -D /var/lib/pgsql/data 2>/dev/null || true
            systemctl enable postgresql 2>/dev/null
            systemctl start postgresql 2>/dev/null
            ;;
        apt)
            apt-get install -y postgresql postgresql-contrib 2>/dev/null
            systemctl enable postgresql 2>/dev/null
            systemctl start postgresql 2>/dev/null
            ;;
    esac
    echo -e "  PostgreSQL 安装完成"
fi

# ---- 4. 创建数据库和用户 ----
echo -e "${YELLOW}[4/7] 配置数据库...${NC}"
su - postgres -c "psql -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\"" 2>/dev/null || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};\"" 2>/dev/null || true
echo -e "  数据库用户: ${GREEN}${DB_USER}${NC}"
echo -e "  数据库名称: ${GREEN}${DB_NAME}${NC}"

# ---- 5. 部署应用 ----
echo -e "${YELLOW}[5/7] 部署应用文件...${NC}"
mkdir -p "${INSTALL_DIR}/uploads"

# 复制应用文件（从安装包或当前目录）
if [ -f "./next.config.ts" ]; then
    echo "  从当前目录复制应用文件..."
    cp -r . "${INSTALL_DIR}/" 2>/dev/null || true
else
    echo "  从 GitHub 下载最新版本..."
    if command -v git &>/dev/null; then
        git clone https://github.com/haooy1/asset-manager.git "${INSTALL_DIR}" 2>/dev/null || \
        wget -qO- https://github.com/haooy1/asset-manager/archive/main.tar.gz | tar -xz -C /tmp/
        cp -r /tmp/asset-manager-main/* "${INSTALL_DIR}/"
    fi
fi

cd "${INSTALL_DIR}"

# 生成 .env
cat > .env << EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public
AUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "$(date +%s)${DB_PASS}")
AUTH_URL=http://localhost:${APP_PORT}
NEXT_PUBLIC_APP_NAME=IT资产管理系统
EOF

# 安装 pnpm
npm install -g pnpm 2>/dev/null || true

# 安装依赖并构建
echo -e "  安装依赖..."
pnpm install --prod --no-frozen-lockfile 2>/dev/null || npm install --production 2>/dev/null || true

echo -e "  构建应用..."
pnpm build 2>/dev/null || npm run build 2>/dev/null || {
    echo -e "${YELLOW}  构建失败，尝试 npx prisma generate...${NC}"
    npx prisma generate 2>/dev/null
}

echo -e "  迁移数据库..."
npx prisma db push --accept-data-loss 2>/dev/null || true

# ---- 6. 创建系统服务 ----
echo -e "${YELLOW}[6/7] 配置系统服务...${NC}"

if command -v systemctl &>/dev/null; then
    cat > /etc/systemd/system/asset-manager.service << SERVICE
[Unit]
Description=IT Asset Manager
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/node_modules/.bin/next start -p ${APP_PORT}
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}

[Install]
WantedBy=multi-user.target
SERVICE

    systemctl daemon-reload
    systemctl enable asset-manager
    systemctl start asset-manager 2>/dev/null || true
    echo -e "  服务已配置: ${GREEN}systemctl start asset-manager${NC}"
else
    # 非 systemd 系统，使用 nohup
    cat > "${INSTALL_DIR}/start.sh" << 'START'
#!/bin/bash
cd "$(dirname "$0")"
nohup node node_modules/.bin/next start -p ${PORT:-3000} > app.log 2>&1 &
echo $! > app.pid
echo "IT资产管理系统已启动，PID: $(cat app.pid)"
echo "访问: http://localhost:${PORT:-3000}"
START
    chmod +x "${INSTALL_DIR}/start.sh"
    bash "${INSTALL_DIR}/start.sh"
    echo -e "  启动脚本: ${GREEN}${INSTALL_DIR}/start.sh${NC}"
fi

# ---- 7. 创建初始管理员 ----
echo -e "${YELLOW}[7/7] 创建初始管理员...${NC}"
sleep 3
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
(async () => {
  try {
    const hash = await bcrypt.hash('${ADMIN_PASS}', 12);
    await db.user.upsert({
      where: { username: '${ADMIN_USER}' },
      update: {},
      create: { username: '${ADMIN_USER}', password: hash, realName: '系统管理员', role: 'SUPER_ADMIN' }
    });
    console.log('  管理员账户已创建');
  } catch(e) { console.log('  管理员账户已存在，跳过'); }
  await db.\$disconnect();
})();
" 2>/dev/null || echo -e "  ${YELLOW}管理员创建失败，请稍后手动创建${NC}"

# ---- 完成 ----
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          🎉 安装完成！                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}访问地址:${NC}  http://localhost:${APP_PORT}/login"
echo -e "  ${BLUE}管理员账号:${NC} ${ADMIN_USER}"
echo -e "  ${BLUE}管理员密码:${NC} ${ADMIN_PASS}"
echo -e "  ${BLUE}数据库用户:${NC} ${DB_USER}"
echo -e "  ${BLUE}数据库密码:${NC} ${DB_PASS}"
echo ""
echo -e "  ${BLUE}管理命令:${NC}"
echo -e "  systemctl start asset-manager    # 启动服务"
echo -e "  systemctl stop asset-manager     # 停止服务"
echo -e "  systemctl status asset-manager   # 查看状态"
echo -e "  journalctl -u asset-manager -f   # 查看日志"
echo ""
echo -e "  ${YELLOW}请立即修改默认管理员密码！${NC}"
