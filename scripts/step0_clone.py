#!/usr/bin/env python3
"""Deploy step 0: Re-clone project from Gitee/GitHub"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = """
echo "=== 0: Clean old dir ==="
rm -rf /opt/asset-manager
mkdir -p /opt/asset-manager

echo "=== 1: Clone from Gitee ==="
cd /opt
git clone https://gitee.com/haooy1/asset-manager.git 2>&1 | tail -3
echo "clone rc: $?"

echo "=== 2: Verify ==="
ls /opt/asset-manager/package.json 2>/dev/null && echo "CLONE OK" || echo "CLONE FAILED"

echo "=== 3: Setup .env ==="
cd /opt/asset-manager
ASECRET=$(openssl rand -hex 32 2>/dev/null || echo "change-me-$(date +%s)")
cat > .env << ENVEOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public
AUTH_SECRET=$ASECRET
AUTH_URL=http://100.87.31.92:3000
NEXT_PUBLIC_APP_NAME=IT资产管理系统
ENVEOF
echo ".env created"

echo "=== DONE ==="
"""

_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode('utf-8', errors='replace'))
c.close()
