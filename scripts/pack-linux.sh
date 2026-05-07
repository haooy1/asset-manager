#!/bin/bash
# ============================================================
# Linux 安装包制作脚本
# 产出: IT-Asset-Manager-v1.0.0-linux.run (自解压安装包)
# 依赖: makeself (sudo apt install makeself / yum install makeself)
# 用法: bash scripts/pack-linux.sh
# ============================================================
set -e

PACKAGE_NAME="IT-Asset-Manager"
VERSION="1.0.0"
OUTPUT_FILE="${PACKAGE_NAME}-v${VERSION}-linux.run"

echo "===== 制作 Linux 安装包 ====="
echo "版本: ${VERSION}"
echo ""

# 创建临时打包目录
TEMP_DIR=$(mktemp -d)
PACK_DIR="${TEMP_DIR}/${PACKAGE_NAME}-${VERSION}"
mkdir -p "${PACK_DIR}/app"

# 复制应用文件
echo "1. 复制应用文件..."
cd "$(dirname "$0")/.."
# 只复制必要文件（排除 node_modules、.git 等）
rsync -a --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='.pnpm-store' \
    package.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs \
    eslint.config.mjs .prettierrc .env.example \
    prisma/ public/ src/ scripts/install.sh \
    "${PACK_DIR}/app/" 2>/dev/null || \
cp -r package.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs \
    eslint.config.mjs .prettierrc .env.example \
    prisma public src scripts/install.sh \
    "${PACK_DIR}/app/" 2>/dev/null

# 创建安装入口
cat > "${PACK_DIR}/setup.sh" << 'SETUP'
#!/bin/bash
echo "正在安装 IT 资产管理系统 v1.0.0..."
echo ""

APP_DIR="$(dirname "$0")/app"
cd "$APP_DIR"

# 检查 root
if [ "$(id -u)" != "0" ]; then
    echo "请使用 root 权限安装: sudo bash $0"
    exit 1
fi

# 执行安装脚本
bash scripts/install.sh
SETUP

chmod +x "${PACK_DIR}/setup.sh"

# 用 makeself 打包
echo "2. 打包为自解压安装包..."
if command -v makeself &>/dev/null; then
    makeself --zstd "${PACK_DIR}" "${OUTPUT_FILE}" \
        "IT 资产管理系统 v${VERSION}" \
        ./setup.sh
    echo ""
    echo "===== 打包完成 ====="
    echo "文件: ${OUTPUT_FILE}"
    echo "大小: $(du -h ${OUTPUT_FILE} | cut -f1)"
    echo ""
    echo "使用方法:"
    echo "  chmod +x ${OUTPUT_FILE}"
    echo "  sudo ./${OUTPUT_FILE}"
else
    echo ""
    echo "⚠️  makeself 未安装，生成 .tar.gz 代替..."
    echo "    安装 makeself: sudo apt install makeself    # Debian/麒麟"
    echo "                   sudo yum install makeself    # 欧拉"
    echo ""

    TAR_FILE="${PACKAGE_NAME}-v${VERSION}-linux.tar.gz"
    tar -czf "${TAR_FILE}" -C "${TEMP_DIR}" "${PACKAGE_NAME}-${VERSION}"

    echo "文件: ${TAR_FILE}"
    echo ""
    echo "使用方法:"
    echo "  tar -xzf ${TAR_FILE}"
    echo "  cd ${PACKAGE_NAME}-${VERSION}"
    echo "  sudo bash setup.sh"
fi

# 清理
rm -rf "${TEMP_DIR}"
