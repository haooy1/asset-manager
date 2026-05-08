# Vercel 部署配置

## 部署状态

**Vercel 项目已创建**: `asset-manager`

## 问题

部署时出现 GitHub 授权错误。需要在 Vercel 控制台手动授权 GitHub。

## 解决方案

### 方法 1：Vercel 控制台授权（推荐）

1. 打开 https://vercel.com/haooy888-8078s-projects/asset-manager/settings/git
2. 点击 **Connect Git Repository**
3. 选择 `haooy1/asset-manager` 仓库
4. 点击 **Connect**

### 方法 2：使用本地 CLI

在本地终端运行：

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 克隆代码
git clone https://github.com/haooy1/asset-manager.git
cd asset-manager

# 3. 登录
vercel login
# 选择: Continue with GitHub

# 4. 部署
vercel
# 按提示选择:
#   - Project: asset-manager
#   - Account: haooy888-8078's projects
#   - Branch: main

# 5. 生产部署
vercel --prod
```

### 方法 3：配置环境变量后重新部署

1. 在 Vercel 控制台添加环境变量：
   - `DATABASE_URL`: PostgreSQL 连接字符串
   - `AUTH_SECRET`: 随机字符串

2. 点击 **Redeploy**

---

## 获取 DATABASE_URL

需要一个 PostgreSQL 数据库：

1. 打开 https://neon.tech
2. 用 GitHub 登录
3. 创建项目 → Free Tier
4. 复制连接字符串

格式: `postgresql://user:pass@host/db?sslmode=require`

---

## 部署后访问

预览 URL: `https://asset-manager-l11kg7yzs-haooy888-8078s-projects.vercel.app`
