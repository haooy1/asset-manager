#!/usr/bin/env python3
"""Test login properly with cookie jar"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cookies.txt

echo "=== Step 1: Get CSRF token (with cookies) ==="
CSRF_JSON=$(curl -s -c /tmp/cookies.txt http://localhost:3000/api/auth/csrf)
TOKEN=$(echo "$CSRF_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null)
echo "CSRF Token: ${TOKEN:0:20}..."
echo "Cookies:"
cat /tmp/cookies.txt

echo ""
echo "=== Step 2: Login ==="
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cookies.txt -c /tmp/cookies2.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -D /tmp/login_headers.txt \
  -d "csrfToken=$TOKEN&username=admin&password=admin123&redirect=false&json=true")

echo "Result: $LOGIN_RESULT"
echo ""
echo "Headers:"
cat /tmp/login_headers.txt | head -10

echo ""
echo "=== Step 3: Check session ==="
SESSION_URL=$(echo "$LOGIN_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url','no-url'))" 2>/dev/null)
echo "Session URL: $SESSION_URL"

SESSION=$(curl -s -b /tmp/cookies2.txt http://localhost:3000/api/auth/session)
echo "Session data: $SESSION"

if echo "$SESSION" | grep -q "realName\|name"; then
  echo ""
  echo "=== Step 4: Test dashboard ==="
  DASH_HTTP=$(curl -s -o /dev/null -w '%{http_code}' -b /tmp/cookies2.txt http://localhost:3000/ 2>/dev/null)
  echo "Dashboard HTTP: $DASH_HTTP"
fi
"""

sftp = c.open_sftp()
with open('/tmp/test_fix.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/test_fix.sh', '/tmp/test_fix.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/test_fix.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:4000])
c.close()
