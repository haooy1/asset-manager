#!/usr/bin/env python3
"""Step 1: Install deps - fixed version"""
import paramiko

HOST = "100.87.31.92"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Check where npm global bin is
_, out, _ = c.exec_command("npm bin -g 2>/dev/null || npm root -g 2>/dev/null; which node; ls /usr/local/bin/node 2>/dev/null", timeout=30)
print("BIN:", out.read().decode('utf-8', errors='replace').strip())

# Write install script
script = """#!/bin/bash
echo "=== Install pnpm ==="
npm install -g pnpm@10 2>&1 | tail -3

# Find pnpm binary
PNPM=$(find / -name pnpm -type f 2>/dev/null | head -1)
if [ -z "$PNPM" ]; then
  PNPM=$(npm root -g)/pnpm/bin/pnpm.cjs 2>/dev/null
  if [ ! -f "$PNPM" ]; then
    echo "pnpm not found, using npm instead"
    echo "=== npm install ==="
    cd /opt/asset-manager
    npm install 2>&1 | tail -5
    echo "=== npm install DONE ==="
    exit 0
  fi
fi

echo "pnpm at: $PNPM"

# Setup .env if needed
cd /opt/asset-manager
if [ ! -f .env ]; then
  ASECRET=$(openssl rand -hex 32 2>/dev/null || echo "dev-secret-change-me")
  cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_manager?schema=public
AUTH_SECRET=CHANGE_ME
AUTH_URL=http://100.87.31.92:3000
ENVEOF
fi

echo "=== npm registry ==="
npm config set registry https://registry.npmmirror.com 2>/dev/null || true

echo "=== install deps (2-3 min) ==="
$PNPM install --no-frozen-lockfile 2>&1 | tail -5

echo "=== verify ==="
ls /opt/asset-manager/node_modules/.pnpm/next* 2>/dev/null | head -1 && echo "DEPS OK" || echo "DEPS MISSING"
echo "=== DONE ==="
"""

with open('/tmp/deploy_install2.sh', 'w') as f:
    f.write(script)

sftp = c.open_sftp()
sftp.put('/tmp/deploy_install2.sh', '/tmp/deploy_install2.sh')
sftp.close()

_, out, _ = c.exec_command('bash /tmp/deploy_install2.sh', timeout=300)
print(out.read().decode('utf-8', errors='replace'))
c.close()
