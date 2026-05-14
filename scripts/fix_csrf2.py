#!/usr/bin/env python3
"""Fix: use single cookie jar for both CSRF fetch and login"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt

# ONE request for CSRF - both cookie and token
echo "=== Get CSRF (single request) ==="
RESP=$(curl -s -c /tmp/cjar.txt -D /tmp/csrf_h.txt http://localhost:3000/api/auth/csrf 2>/dev/null)
echo "Response: $RESP"

# Extract token from the same response
API_TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
echo "Token from response: $API_TOKEN"

# Check cookie value
COOKIE_VAL=$(grep 'csrf-token' /tmp/cjar.txt | awk '{print $NF}')
echo "Cookie value: $COOKIE_VAL"

echo ""
echo "=== Login with matching cookie + token ==="
curl -v -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar2.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$API_TOKEN&username=admin&password=admin123&redirect=false" \
  2>/tmp/login_stderr.txt 1>/tmp/login_body.txt

echo "Location: $(grep '< location:' /tmp/login_stderr.txt | head -1)"
echo "Set-Cookie: $(grep '< set-cookie' /tmp/login_stderr.txt | head -3)"

echo ""
echo "=== Session ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session 2>/dev/null
echo ""

echo "=== Dashboard ==="
curl -s -o /dev/null -w 'HTTP:%{http_code}' -b /tmp/cjar2.txt http://localhost:3000/ 2>/dev/null
echo ""
"""

sftp = c.open_sftp()
with open('/tmp/fix6.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/fix6.sh', '/tmp/fix6.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/fix6.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])
c.close()
