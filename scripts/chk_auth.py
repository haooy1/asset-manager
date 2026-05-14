#!/usr/bin/env python3
"""Check NextAuth callback response directly"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
echo "=== 1. Check callback GET ==="
curl -s -o /dev/null -w "HTTP:%{http_code}" http://localhost:3000/api/auth/callback/credentials
echo ""

echo "=== 2. Check callback POST without CSRF ==="
curl -s -o /dev/null -w "HTTP:%{http_code}" -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin&password=admin123" http://localhost:3000/api/auth/callback/credentials
echo ""

echo "=== 3. Check session ==="
curl -s http://localhost:3000/api/auth/session
echo ""

echo "=== 4. Check providers ==="
curl -s http://localhost:3000/api/auth/providers
echo ""

echo "=== 5. Server error logs ==="
journalctl -u asset-manager --no-pager -n 20 2>/dev/null | grep -i "error\|fail\|exception" | tail -3

echo ""
echo "=== 6. Next.config check ==="
cat /opt/asset-manager/next.config.ts
"""

sftp = c.open_sftp()
with open('/tmp/chk.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/chk.sh', '/tmp/chk.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/chk.sh', timeout=30)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])
c.close()
