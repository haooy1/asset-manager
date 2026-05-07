@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title IT 资产管理系统 v1.0.0 - 一键安装程序

echo ╔══════════════════════════════════════════════╗
echo ║   IT 资产管理系统 v1.0.0 - 一键安装程序     ║
echo ╚══════════════════════════════════════════════╝
echo.

set "INSTALL_DIR=C:\asset-manager"
set "APP_PORT=3000"
set "DB_USER=asset_user"
set "DB_PASS=ChangeMe123"
set "DB_NAME=asset_manager"
set "ADMIN_USER=admin"
set "ADMIN_PASS=admin123"

REM ---- 1. 检测 Node.js ----
echo [1/5] 检测 Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   未安装 Node.js，正在下载安装...
    winget install OpenJS.NodeJS.LTS --silent 2>nul || (
        echo   请手动安装 Node.js: https://nodejs.org
        echo   安装完成后重新运行本脚本
        pause
        exit /b 1
    )
    echo   Node.js 安装完成，请关闭此窗口后重新运行
    pause
    exit /b 0
)
for /f "tokens=*" %%i in ('node -v') do echo   已安装: %%i

REM ---- 2. 检测 PostgreSQL ----
echo [2/5] 检测 PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   未安装 PostgreSQL，正在下载安装...
    winget install PostgreSQL.PostgreSQL.15 --silent 2>nul || (
        echo   请手动安装 PostgreSQL 15+: https://www.postgresql.org/download/windows/
        echo   安装完成后重新运行本脚本
        pause
        exit /b 1
    )
    echo   PostgreSQL 安装完成
)

REM ---- 3. 部署应用 ----
echo [3/5] 部署应用文件...

REM 复制应用文件
if exist "package.json" (
    echo   从当前目录复制...
    xcopy /E /I /Y . "%INSTALL_DIR%" >nul
) else (
    echo   下载应用文件...
    if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
    echo   请将应用文件解压到 %INSTALL_DIR%
)

cd /d "%INSTALL_DIR%"

REM 生成 .env
(
echo DATABASE_URL=postgresql://%DB_USER%:%DB_PASS%@localhost:5432/%DB_NAME%?schema=public
echo AUTH_SECRET=%RANDOM%%RANDOM%%DB_PASS%
echo AUTH_URL=http://localhost:%APP_PORT%
echo NEXT_PUBLIC_APP_NAME=IT资产管理系统
) > .env

REM 安装 pnpm
call npm install -g pnpm 2>nul

REM 安装依赖
echo   安装依赖...
call npm install 2>nul || call pnpm install --no-frozen-lockfile 2>nul

REM 初始化数据库
echo   初始化数据库...
call npx prisma generate 2>nul
call npx prisma db push --accept-data-loss 2>nul

REM ---- 4. 创建 Windows 服务 ----
echo [4/5] 配置 Windows 服务...

REM 创建启动脚本
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo call npx next start -p %APP_PORT%
) > "%INSTALL_DIR%\start.bat"

REM 创建停止脚本
(
echo @echo off
echo taskkill /f /im node.exe 2^>nul
echo echo 服务已停止
) > "%INSTALL_DIR%\stop.bat"

echo   启动脚本: %INSTALL_DIR%\start.bat
echo   停止脚本: %INSTALL_DIR%\stop.bat

REM ---- 5. 创建初始管理员 ----
echo [5/5] 创建初始管理员...

REM 先启动服务（后台）
echo   启动服务...
start "IT-Asset-Manager" /b cmd /c "cd /d %INSTALL_DIR% && npx next start -p %APP_PORT%"
timeout /t 5 /nobreak >nul

REM 创建管理员
node -e "const{PrismaClient}=require('@prisma/client');const bcrypt=require('bcryptjs');const db=new PrismaClient();(async()=>{try{const hash=await bcrypt.hash('%ADMIN_PASS%',12);await db.user.upsert({where:{username:'%ADMIN_USER%'},update:{},create:{username:'%ADMIN_USER%',password:hash,realName:'系统管理员',role:'SUPER_ADMIN'}});console.log('管理员创建成功');}catch(e){console.log('已存在');}await db.\$disconnect();})();" 2>nul

REM ---- 完成 ----
echo.
echo ╔══════════════════════════════════════════════╗
echo ║          🎉 安装完成！                       ║
echo ╚══════════════════════════════════════════════╝
echo.
echo   访问地址:  http://localhost:%APP_PORT%/login
echo   管理员账号: %ADMIN_USER%
echo   管理员密码: %ADMIN_PASS%
echo.
echo   管理命令:
echo   start  %INSTALL_DIR%\start.bat   启动服务
echo   start  %INSTALL_DIR%\stop.bat    停止服务
echo.
echo   请立即修改默认管理员密码！
pause
