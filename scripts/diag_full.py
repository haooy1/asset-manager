#!/usr/bin/env python3
"""Debug login by capturing full response"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt

# 1. Get CSRF
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
COOKIE_VAL=$(grep csrf-token /tmp/cjar.txt | awk '{print $NF}')
API_TOKEN=$(curl -s http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")

echo "=== Test DB connection ==="
cd /opt/asset-manager && node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
(async () => {
  const user = await db.user.findUnique({ where: { username: 'admin' } });
  console.log('User found:', user ? user.username + ' role=' + user.role : 'NOT FOUND');
  if (user) {
    const valid = await bcrypt.compare('admin123', user.password);
    console.log('Password valid:', valid);
  }
  await db.\$disconnect();
})();
" 2>/dev/null

echo ""
echo "=== Login with full response ==="
curl -v -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar2.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$COOKIE_VAL&username=admin&password=admin123&redirect=false" \
  -D /tmp/login_headers.txt 2>/tmp/login_stderr.txt 1>/tmp/login_body.txt

echo "STATUS: $(head -1 /tmp/login_stderr.txt | grep -o '< HTTP.*')"
echo "BODY: $(cat /tmp/login_body.txt)"
echo "SET-COOKIE: $(grep -i 'set-cookie' /tmp/login_headers.txt | head -3)"
echo "LOCATION: $(grep -i 'location' /tmp/login_headers.txt)"

echo ""
echo "=== Server errors ==="
journalctl -u asset-manager --no-pager -n 20 2>/dev/null | grep -i 'error\|fail\|exception' | tail -5
"""

sftp = c.open_sftp()
with open('/tmp/diag5.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/diag5.sh', '/tmp/diag5.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/diag5.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])
c.close()
