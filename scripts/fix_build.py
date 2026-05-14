#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = """cd /opt/asset-manager

echo "=== Install missing deps ==="
npm install bcryptjs next-auth@4 @auth/prisma-adapter 2>&1 | tail -5
echo "install rc: $?"

echo "=== Check critical deps ==="
ls node_modules/bcryptjs/index.js 2>/dev/null && echo "bcryptjs OK" || echo "bcryptjs MISSING"
ls node_modules/next-auth/package.json 2>/dev/null && echo "next-auth OK" || echo "next-auth MISSING"

echo "=== Rebuild ==="
npx next build 2>&1 | grep -E "error|Error|success|Compiled|Route" | head -15
echo "build rc: $?"

echo "=== Restart service ==="
systemctl restart asset-manager 2>&1 || true
sleep 3
curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000 2>/dev/null
echo ""
systemctl status asset-manager --no-pager 2>&1 | head -5
"""

stdin, stdout, stderr = c.exec_command(cmds, timeout=180)
out = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii')
print(out[:3000])
c.close()
