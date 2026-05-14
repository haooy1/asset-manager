#!/usr/bin/env python3
"""Deploy step 0: Clone from GitHub or upload via SFTP"""
import paramiko, os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Try GitHub first
cmds = """
echo "=== Try GitHub clone ==="
rm -rf /opt/asset-manager
cd /opt
git clone https://github.com/haooy1/asset-manager.git 2>&1 | tail -3
ls /opt/asset-manager/package.json 2>/dev/null && echo "GITHUB CLONE OK" || echo "GITHUB CLONE FAILED"
"""

_, out, _ = c.exec_command(cmds, timeout=60)
result = out.read().decode('utf-8', errors='replace')
print(result)

if "CLONE OK" in result:
    # Setup .env
    cmds2 = """
cd /opt/asset-manager
ASECRET=$(openssl rand -hex 32 2>/dev/null || echo "change-me")
cat > .env << ENVEOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public
AUTH_SECRET=$ASECRET
AUTH_URL=http://100.87.31.92:3000
ENVEOF
echo ".env created"
"""
    _, out2, _ = c.exec_command(cmds2, timeout=30)
    print(out2.read().decode('utf-8', errors='replace'))

c.close()
