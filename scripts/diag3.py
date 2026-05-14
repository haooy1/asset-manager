#!/usr/bin/env python3
"""Fix CSRF - use /api/auth/signin instead of /api/auth/csrf"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt

echo "=== Visit signin page (this sets CSRF cookie) ==="
curl -s -c /tmp/cjar.txt -D /tmp/signin_h.txt http://localhost:3000/api/auth/signin 2>/dev/null | head -5

echo ""
echo "=== Cookie jar ==="
cat /tmp/cjar.txt

echo ""
echo "=== Headers ==="
grep -i 'set-cookie' /tmp/signin_h.txt | head -3

echo ""
echo "=== Get CSRF token value ==="
CSRF_RAW=$(grep 'csrf-token' /tmp/signin_h.txt -A 1 | grep "Set-Cookie" | head -1)
echo "CSRF cookie line: $CSRF_RAW"

# Get token from cookie
CSRF_COOKIE_VAL=$(echo "$CSRF_RAW" | sed 's/.*csrf-token=//' | sed 's/;.*//' | cut -d'|' -f1)
echo "CSRF value: $CSRF_COOKIE_VAL"

if [ -n "$CSRF_COOKIE_VAL" ]; then
  echo ""
  echo "=== Attempt login ==="
  curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
    -b /tmp/cjar.txt -c /tmp/cjar2.txt \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "csrfToken=$CSRF_COOKIE_VAL&username=admin&password=admin123&redirect=false" \
    -D /tmp/login_h.txt 2>/dev/null

  echo "Login response headers:"
  grep -i "location\|set-cookie" /tmp/login_h.txt | head -5

  echo ""
  echo "=== Session check ==="
  curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session 2>/dev/null
fi
"""

sftp = c.open_sftp()
with open('/tmp/diag3.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/diag3.sh', '/tmp/diag3.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/diag3.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])
c.close()
