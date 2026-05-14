#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = """cd /opt/asset-manager

echo "=== Full build output ==="
npx next build 2>&1 | head -60
echo "FULL_RC: $?"

echo "=== Check .next ==="
ls -la .next/ 2>/dev/null | head -5
ls .next/BUILD_ID 2>/dev/null && echo "BUILD_ID exists" || echo "BUILD_ID MISSING"

echo "=== Try direct start ==="
npx next start -p 3000 -H 0.0.0.0 2>&1 &
sleep 3
curl -s http://localhost:3000 2>/dev/null | head -5
"""

stdin, stdout, stderr = c.exec_command(cmds, timeout=120)
out = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
print(out[:4000])
c.close()
