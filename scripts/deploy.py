#!/usr/bin/env python3
"""Upload and execute deployment scripts via SFTP"""
import paramiko, sys, os

# 从环境变量读取部署凭证
HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASSWORD", "")

if not HOST or not PASS:
    print("错误：未设置部署环境变量。")
    print("请设置以下环境变量后重试：")
    print("  DEPLOY_HOST     - 服务器IP地址")
    print("  DEPLOY_USER     - SSH用户名（默认root）")
    print("  DEPLOY_PASSWORD - SSH密码")
    sys.exit(1)

class RS:
    def __init__(self):
        self.c = paramiko.SSHClient()
        self.c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.c.connect(HOST, 22, USER, PASS, timeout=30, allow_agent=False, look_for_keys=False)
        self.sftp = self.c.open_sftp()
    
    def upload(self, local, remote):
        self.sftp.put(local, remote)
    
    def run(self, cmd):
        stdin, stdout, stderr = self.c.exec_command(cmd, timeout=300)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        rc = stdout.channel.recv_exit_status()
        return rc, out, err
    
    def close(self):
        self.sftp.close()
        self.c.close()

rs = RS()

action = sys.argv[1] if len(sys.argv) > 1 else "install"

if action == "install":
    # Write install script locally, upload via SFTP, then execute
    script = """#!/bin/bash
set -e
echo "=== Install pnpm ==="
npm install -g pnpm@10
export PATH=$PATH:/usr/local/bin

echo "pnpm version: $(/usr/local/bin/pnpm -v 2>/dev/null || echo FAILED)"

echo "=== Setup .env ==="
cd /opt/asset-manager
if [ ! -f .env ]; then
  ASECRET=$(openssl rand -hex 32 2>/dev/null || echo "dev-secret-change-me")
  cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public
AUTH_SECRET=CHANGE_ME_IN_PRODUCTION
AUTH_URL=http://__DEPLOY_HOST__:3000
EOF
  echo ".env created"
fi

echo "=== npm registry ==="
npm config set registry https://registry.npmmirror.com

echo "=== pnpm install (this takes ~2-3 minutes) ==="
/usr/local/bin/pnpm install --no-frozen-lockfile 2>&1 | tail -5

echo "=== Verify ==="
ls /opt/asset-manager/node_modules/next/package.json && echo "DEPENDENCIES OK" || echo "DEPENDENCIES MISSING"
echo "=== INSTALL DONE ==="
"""
    script = script.replace("__DEPLOY_HOST__", HOST)
    with open('/tmp/deploy_install.sh', 'w') as f:
        f.write(script)
    rs.upload('/tmp/deploy_install.sh', '/tmp/deploy_install.sh')
    _, out, _ = rs.run('bash /tmp/deploy_install.sh')
    print(out)

elif action == "postgres":
    script = """#!/bin/bash
set -e
echo "=== Install PostgreSQL ==="
if ! command -v psql &>/dev/null; then
  yum install -y postgresql-server 2>&1 | tail -3 || true
  postgresql-setup --initdb 2>/dev/null || initdb -D /var/lib/pgsql/data 2>/dev/null || true
  systemctl enable postgresql
  systemctl start postgresql
  echo "PostgreSQL installed"
else
  echo "PostgreSQL already installed"
fi

echo "=== Create DB & User ==="
su - postgres -c "psql -c \\"ALTER USER postgres PASSWORD 'postgres';\\"" 2>/dev/null || true
su - postgres -c "psql -c \\"CREATE DATABASE asset_manager;\\"" 2>/dev/null || true
echo "Database setup done"

echo "=== Prisma ==="
cd /opt/asset-manager
/usr/local/bin/npx prisma generate 2>&1 | tail -3
/usr/local/bin/npx prisma db push --accept-data-loss 2>&1 | tail -5
echo "=== POSTGRESQL DONE ==="
"""
    with open('/tmp/deploy_postgres.sh', 'w') as f:
        f.write(script)
    rs.upload('/tmp/deploy_postgres.sh', '/tmp/deploy_postgres.sh')
    _, out, _ = rs.run('bash /tmp/deploy_postgres.sh')
    print(out)

elif action == "start":
    script = """#!/bin/bash
set -e
echo "=== Setup systemd service ==="
cat > /etc/systemd/system/asset-manager.service << 'SVCEOF'
[Unit]
Description=IT Asset Manager
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/asset-manager
ExecStart=/usr/local/bin/node /opt/asset-manager/node_modules/.bin/next start -p 3000 -H 0.0.0.0
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable asset-manager
systemctl restart asset-manager
echo "Service restarted"

echo "=== Firewall ==="
firewall-cmd --add-port=3000/tcp --permanent 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true
echo "Port 3000 opened"

echo "=== Wait for startup ==="
sleep 5

echo "=== Status ==="
systemctl status asset-manager --no-pager 2>&1 | head -8

echo "=== HTTP Check ==="
curl -s -o /dev/null -w 'HTTP Status: %{http_code}\n' http://localhost:3000 2>/dev/null || echo "Starting up..."

echo "=== START DONE ==="
"""
    with open('/tmp/deploy_start.sh', 'w') as f:
        f.write(script)
    rs.upload('/tmp/deploy_start.sh', '/tmp/deploy_start.sh')
    _, out, _ = rs.run('bash /tmp/deploy_start.sh')
    print(out)

elif action == "check":
    _, out, _ = rs.run("""
echo "1. Node.js: $(node -v 2>/dev/null || echo NO)"
echo "2. pnpm: $(/usr/local/bin/pnpm -v 2>/dev/null || echo NO)"
echo "3. PostgreSQL: $(psql --version 2>/dev/null | head -1 || echo NO)"
echo "4. node_modules: $([ -d /opt/asset-manager/node_modules/next ] && echo YES || echo NO)"
echo "5. .env: $([ -f /opt/asset-manager/.env ] && echo YES || echo NO)"
echo "6. Service: $(systemctl is-active asset-manager 2>/dev/null || echo NO)"
echo "7. Port 3000: $(ss -tlnp 2>/dev/null | grep 3000 || echo 'NOT LISTENING')"
echo "8. HTTP: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || echo 000)"
""")
    print(out)

rs.close()
