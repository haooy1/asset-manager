#!/usr/bin/env python3
"""Check server errors and config"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

cmds = """
echo "=== JOURNAL ERRORS ==="
journalctl -u asset-manager --no-pager -n 20 2>/dev/null | grep -i "error" | tail -5

echo ""
echo "=== CONFIG.TS FIRST 5 LINES ==="
head -5 /opt/asset-manager/src/lib/auth/config.ts

echo ""  
echo "=== ROUTE.TS ==="
cat /opt/asset-manager/src/app/api/auth/\[...nextauth\]/route.ts

echo ""
echo "=== LAYOUT.TS FIRST 10 ==="
head -10 /opt/asset-manager/src/app/layout.tsx

echo ""
echo "=== GLOBALS.CSS ==="
head -5 /opt/asset-manager/src/app/globals.css

echo ""
echo "=== SERVICE STATUS ==="
systemctl is-active asset-manager

echo ""
echo "=== CURL CSRF ==="
curl -sv http://localhost:3000/api/auth/session 2>&1 | grep -E "HTTP|error" | head -5
"""

s, o, e = c.exec_command(cmds, timeout=30)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])

c.close()
