@echo off
setlocal enabledelayedexpansion
title IT Asset Manager - Installer v1.0.0

echo ============================================
echo   IT Asset Manager v1.0.0 - Installer
echo ============================================
echo.

REM ---- Detect project root (run from scripts/ or from root) ----
if exist "..\package.json" (
    pushd ..
    set "PROJECT_ROOT=%CD%"
    popd
) else if exist "package.json" (
    set "PROJECT_ROOT=%CD%"
) else (
    echo [ERROR] package.json not found.
    echo Please run this script from the project root or scripts/ folder.
    pause
    exit /b 1
)

echo Project: %PROJECT_ROOT%
cd /d "%PROJECT_ROOT%"

REM ---- 1. Check Node.js ----
echo.
echo [1/5] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Node.js not found. Please install from: https://nodejs.org
    echo   After installation, re-run this script.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo   OK: Node.js %%i

REM ---- 2. Check npm / install pnpm ----
echo [2/5] Installing pnpm...
call npm install -g pnpm 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo   WARNING: Failed to install pnpm globally. Trying with npm instead.
    set "PKG_MGR=npm"
) else (
    set "PKG_MGR=pnpm"
)
echo   Using: !PKG_MGR!

REM ---- 3. Install dependencies ----
echo [3/5] Installing dependencies...
if "!PKG_MGR!"=="pnpm" (
    call pnpm install --no-frozen-lockfile
) else (
    call npm install
)
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: Failed to install dependencies.
    pause
    exit /b 1
)
echo   Dependencies installed.

REM ---- 4. Create .env if not exists ----
echo [4/5] Setting up .env...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo   Created .env from .env.example
    ) else (
        (
            echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public
            echo AUTH_SECRET=%RANDOM%%RANDOM%%RANDOM%
            echo AUTH_URL=http://localhost:3000
            echo NEXT_PUBLIC_APP_NAME=IT Asset Manager
        ) > .env
        echo   Created default .env
    )
    echo/
    echo   !!! IMPORTANT !!!
    echo   Edit .env and set your PostgreSQL password:
    echo   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/asset_manager?schema=public
    echo/
) else (
    echo   .env already exists, skipping.
)

REM ---- 5. Init database ----
echo [5/5] Initializing database...
echo   Generating Prisma client...
call npx prisma generate 2>nul

echo   Pushing database schema...
call npx prisma db push --accept-data-loss
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   WARNING: Database push failed.
    echo   Make sure PostgreSQL is running and .env is configured correctly.
    echo   You can retry manually: npx prisma db push
)

REM ---- Done ----
echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo   Start dev server:  npm run dev
echo                      or: pnpm dev
echo.
echo   Access at: http://localhost:3000/login
echo.
echo   To create admin user:
echo   npx prisma studio  (open Prisma Studio to add a user)
echo   or use the API: POST /api/auth/register
echo.
pause
