#!/usr/bin/env python3
"""Test login with CSRF"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Write test script to server
test = """#!/bin/bash
cd /opt/asset-manager

# Get CSRF token
echo "=== Getting CSRF ==="
CSRF_JSON=$(curl -s http://localhost:3000/api/auth/csrf 2>/dev/null)
echo "$CSRF_JSON" | head -3
TOKEN=$(echo "$CSRF_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null)
echo "TOKEN: $TOKEN"

echo ""
echo "=== Attempting login ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$TOKEN&username=admin&password=admin123&json=true" \
  -D /tmp/login_response.txt 2>/dev/null

echo ""
echo "=== Response headers ==="
grep -i "set-cookie\|location" /tmp/login_response.txt 2>/dev/null | head -5

echo ""
echo "=== Checking session ==="
SESSION_COOKIE=$(grep "next-auth.session-token" /tmp/login_response.txt | sed 's/.*next-auth.session-token=//' | sed 's/;.*//')
echo "Session token found: ${SESSION_COOKIE:0:20}..."

if [ -n "$SESSION_COOKIE" ]; then
  echo ""
  echo "=== Verifying with session ==="
  curl -s -b "next-auth.session-token=$SESSION_COOKIE" http://localhost:3000/api/auth/session 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('Logged in as:', d.get('user',{}).get('name','UNKNOWN'))" 2>/dev/null
  echo ""
  echo "=== Accessing dashboard ==="
  HTTP=$(curl -s -o /dev/null -w '%{http_code}' -b "next-auth.session-token=$SESSION_COOKIE" http://localhost:3000/ 2>/dev/null)
  echo "Dashboard HTTP: $HTTP"
fi
"""

sftp = c.open_sftp()
with open('/tmp/test_login.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/test_login.sh', '/tmp/test_login.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/test_login.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:3000])
if e.read().decode().strip():
    print('ERR:', e.read().decode()[:500])

c.close()
