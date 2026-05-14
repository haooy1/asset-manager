#!/usr/bin/env python3
"""Full login flow test with cookie jar - confirm success or failure"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt /tmp/login_out.txt /tmp/login_err.txt

echo "=== Step 1: Get CSRF ==="
curl -s -c /tmp/cjar.txt -D /tmp/csrf_h.txt http://localhost:3000/api/auth/csrf >/tmp/csrf_body.txt
CSRF=$(python3 -c "import json;print(json.load(open('/tmp/csrf_body.txt'))['csrfToken'])")

echo "=== Step 2: Get signin page (also sets cookies) ==="
curl -s -b /tmp/cjar.txt -c /tmp/cjar.txt -D /tmp/signin_h.txt http://localhost:3000/api/auth/signin >/dev/null

echo "=== Step 3: Login ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar2.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -D /tmp/login_h.txt \
  -d "csrfToken=$CSRF&username=admin&password=admin123&callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F" \
  >/tmp/login_body.txt 2>/tmp/login_err.txt

echo "=== Login response code ==="
head -1 /tmp/login_h.txt

echo ""
echo "=== All cookies from login ==="
grep -v '^#' /tmp/cjar2.txt | grep -v '^\$'

echo ""
echo "=== CSRF cookie from login ==="
grep 'csrf-token' /tmp/cjar2.txt

echo ""
echo "=== Session token cookie from login ==="
grep 'session-token' /tmp/cjar2.txt

echo ""
echo "=== Login body ==="
cat /tmp/login_body.txt | head -3

echo ""
echo "=== Login headers (relevant) ==="
grep -i 'location\|set-cookie' /tmp/login_h.txt

echo ""
echo "=== Verify session ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session
"""

sftp = c.open_sftp()
with open('/tmp/flow.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/flow.sh', '/tmp/flow.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/flow.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:8000])
c.close()
