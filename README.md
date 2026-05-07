# IT 硬件资产全生命周期管理系统

面向中型企业的 IT 硬件资产管理平台，支持设备入库、领用、维保、报废全流程管理。

## 技术栈

- **全栈框架**: Next.js 14 (App Router) + TypeScript
- **数据库**: PostgreSQL 15+ (ORM: Prisma)
- **UI**: Tailwind CSS + shadcn/ui
- **认证**: NextAuth.js
- **部署**: Docker + Nginx + PM2

## 快速开始

### 环境要求

- Node.js >= 20.9
- pnpm >= 8.0
- PostgreSQL 15+

### 安装

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填写数据库连接信息

# 初始化数据库
pnpm db:push

# 启动开发服务器
pnpm dev
```

### 目录结构

详细目录结构见 [specs/项目结构.md](specs/项目结构.md)

### 开发规范

详细开发规范见 [specs/开发规范.md](specs/开发规范.md)

### 部署

参见 [specs/开发路线图.md](specs/开发路线图.md) Phase 3.2
