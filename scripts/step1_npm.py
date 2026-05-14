#!/usr/bin/env python3
"""Deploy step 1: Install npm dependencies (using npm, not pnpm)"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Direct, simple approach - just npm install
cmds = """
export PATH=$PATH:/usr/local/bin
cd /opt/asset-manager

echo "=== npm registry mirror ==="
npm config set registry https://registry.npmmirror.com 2>/dev/null || true

echo "=== npm install (2-3 minutes) ==="
npm install 2>&1 | tail -10

echo "=== verify ==="
ls node_modules/next/package.json 2>/dev/null && echo "DEPS OK" || echo "DEPS MISSING"

echo "=== DONE ==="
"""

_, out, _ = c.exec_command(cmds, timeout=300)
print(out.read().decode('utf-8', errors='replace'))
c.close()
