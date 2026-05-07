#!/bin/bash
# ============================================================
# Windows 安装包制作辅助脚本 (在 Linux/WSL 中生成 NSIS 配置)
# 产出: IT-Asset-Manager-v1.0.0-win.exe (Windows 安装包)
# ============================================================
set -e

PACKAGE_NAME="IT-Asset-Manager"
VERSION="1.0.0"

echo "===== 生成 Windows NSIS 安装脚本 ====="

# 生成 NSIS .nsi 脚本
cat > "${PACKAGE_NAME}-setup.nsi" << NSIS
; IT 资产管理系统 - Windows 安装程序
; 使用 NSIS 3.x 编译: makensis IT-Asset-Manager-setup.nsi

!include "MUI2.nsh"

Name "IT 资产管理系统"
OutFile "${PACKAGE_NAME}-v${VERSION}-win.exe"
InstallDir "\$PROGRAMFILES\\IT-Asset-Manager"
RequestExecutionLevel admin

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\\LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "安装" SEC01
  SetOutPath "\$INSTDIR"

  ; 复制所有应用文件
  File /r "..\\*"

  ; 创建卸载程序
  WriteUninstaller "\$INSTDIR\\uninstall.exe"

  ; 创建开始菜单快捷方式
  CreateDirectory "\$SMPROGRAMS\\IT 资产管理系统"
  CreateShortCut "\$SMPROGRAMS\\IT 资产管理系统\\启动服务.lnk" "\$INSTDIR\\start.bat"
  CreateShortCut "\$SMPROGRAMS\\IT 资产管理系统\\停止服务.lnk" "\$INSTDIR\\stop.bat"
  CreateShortCut "\$SMPROGRAMS\\IT 资产管理系统\\卸载.lnk" "\$INSTDIR\\uninstall.exe"

  ; 写入注册表
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ITAssetManager" \
    "DisplayName" "IT 资产管理系统"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ITAssetManager" \
    "UninstallString" "\$INSTDIR\\uninstall.exe"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ITAssetManager" \
    "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ITAssetManager" \
    "Publisher" "haooy"

  ; 安装完成后运行安装脚本
  ExecWait '\$INSTDIR\\scripts\\install.bat'
SectionEnd

Section "Uninstall"
  ; 停止服务
  ExecWait '\$INSTDIR\\stop.bat'

  ; 删除开始菜单
  RMDir /r "\$SMPROGRAMS\\IT 资产管理系统"

  ; 删除安装目录
  RMDir /r "\$INSTDIR"

  ; 删除注册表
  DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ITAssetManager"
SectionEnd
NSIS

echo "NSIS 脚本已生成: ${PACKAGE_NAME}-setup.nsi"
echo ""
echo "编译 Windows 安装包:"
echo "  方式1: Windows 中安装 NSIS 3.x 后，右键 -> Compile NSIS Script"
echo "  方式2: makensis ${PACKAGE_NAME}-setup.nsi"
echo ""
echo "产物: ${PACKAGE_NAME}-v${VERSION}-win.exe"
