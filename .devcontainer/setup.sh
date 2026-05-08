#!/bin/bash
set -e

echo "🔧 开始配置开发环境..."

cd /workspace

# 1. 安装依赖
echo "📦 安装依赖..."
pnpm install

# 2. 复制环境变量
echo "📝 配置环境变量..."
if [ ! -f .env ]; then
  cp .env.example .env
  # 使用 PostgreSQL 扩展的默认配置
  sed -i 's|postgresql://.*|postgresql://codespace:password@localhost:5432/asset_manager?schema=public|' .env
fi

# 3. 设置 AUTH_SECRET
if ! grep -q "AUTH_SECRET=" .env || grep -q "your-secret-key" .env; then
  echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
fi

# 4. 添加 AUTH_SECRET 到 .env.local
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
# NextAuth
AUTH_SECRET=dev-secret-for-codespaces
AUTH_URL=http://localhost:3000
EOF
fi

# 5. 初始化数据库
echo "🗄️  初始化数据库..."
pnpm db:push

# 6. 创建测试数据
echo "👤 创建测试账号..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function seed() {
  const prisma = new PrismaClient();
  
  try {
    // 创建分支
    const branch = await prisma.branch.create({
      data: {
        name: '总部',
        code: 'HQ',
        address: '北京市朝阳区',
        contact: 'IT部门'
      }
    });
    
    // 创建部门
    const dept = await prisma.department.create({
      data: {
        name: '研发部',
        branchId: branch.id
      }
    });
    
    // 创建管理员
    const password = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: password,
        realName: '系统管理员',
        role: 'SUPER_ADMIN',
        branchId: branch.id
      }
    });
    
    // 创建普通员工
    await prisma.user.create({
      data: {
        username: 'zhangsan',
        password: password,
        realName: '张三',
        role: 'EMPLOYEE',
        branchId: branch.id,
        departmentId: dept.id
      }
    });
    
    console.log('✅ 测试数据创建成功！');
    console.log('   管理员: admin / admin123');
    console.log('   员工: zhangsan / admin123');
  } catch (e) {
    if (e.code === 'P2002') {
      console.log('⚠️  数据已存在，跳过初始化');
    } else {
      throw e;
    }
  } finally {
    await prisma.\$disconnect();
  }
}

seed();
" 2>/dev/null || echo "⚠️  测试数据初始化跳过（稍后可手动运行）"

echo ""
echo "✅ 环境配置完成！"
echo ""
echo "🚀 运行以下命令启动开发服务器："
echo "   pnpm dev"
echo ""
