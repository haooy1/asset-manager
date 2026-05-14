#!/usr/bin/env python3
"""Proper end-to-end login test"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt

echo "=== 1. Visit signin page (sets CSRF cookie) ==="
curl -s -c /tmp/cjar.txt -o /dev/null http://localhost:3000/api/auth/signin
echo "Cookie count: $(grep -c -v '^#' /tmp/cjar.txt | tr -d '\n') cookies"

echo ""
echo "=== 2. Get CSRF token ==="
CSRF_JSON=$(curl -s -b /tmp/cjar.txt -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf)
CSRF=$(echo "$CSRF_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
echo "Token: ${CSRF:0:20}..."
echo "Cookie count after CSRF: $(grep -c -v '^#' /tmp/cjar.txt | tr -d '\n') cookies"

echo ""
echo "=== 3. Login ==="
LOGIN_RESP=$(curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar.txt \
  -D /tmp/login_h.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false")

echo "Response: $LOGIN_RESP"
echo ""
echo "=== 4. Headers ==="
grep -i 'set-cookie\|location' /tmp/login_h.txt | head -5

echo ""
echo "=== 5. Session ==="
SESSION=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/session)
echo "$SESSION"

if echo "$SESSION" | grep -q '"name"'; then
  NAME=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('name','?'))" 2>/dev/null)
  echo "SUCCESS: Logged in as $NAME"
else
  echo "FAILED: No session found"
  echo ""
  echo "=== Debug: cookies ==="
  cat /tmp/cjar.txt
  echo ""
  echo "=== Debug: login body ==="
  cat /tmp/login_h.txt
fi
"""

sftp = c.open_sftp()
with open('/tmp/e2e.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/e2e.sh', '/tmp/e2e.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/e2e.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:8000])
c.close()
