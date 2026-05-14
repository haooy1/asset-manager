#!/usr/bin/env python3
"""Test login with verbose headers"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
echo "=== CSRF endpoint response headers ==="
curl -s -D /tmp/csrf_headers.txt http://localhost:3000/api/auth/csrf 2>/dev/null | head -3
echo ""
echo "Headers:"
cat /tmp/csrf_headers.txt

echo ""
echo "=== Direct cookie approach ==="
# Get CSRF token from cookie header
COOKIE_HEADER=$(grep -i 'set-cookie' /tmp/csrf_headers.txt | grep 'csrf-token' | head -1)
echo "CSRF Cookie line: $COOKIE_HEADER"

# Make the login request with that cookie
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Cookie: $COOKIE_HEADER" \
  -d "csrfToken=test&username=admin&password=admin123&redirect=false" \
  -D /tmp/login_h2.txt 2>/dev/null

echo ""
echo "Login response:"
cat /tmp/login_h2.txt
"""

sftp = c.open_sftp()
with open('/tmp/test3.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/test3.sh', '/tmp/test3.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/test3.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:4000])
c.close()
