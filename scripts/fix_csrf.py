#!/usr/bin/env python3
"""Fixed CSRF token extraction"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt

echo '=== Get CSRF ==='
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf 2>/dev/null
echo "Response: $(curl -s http://localhost:3000/api/auth/csrf 2>/dev/null)"

# The API returns {"csrfToken":"abc123..."}
# The cookie value is "token|hash" (URL encoded as "token%7Chash")
# For the POST body, use the API token value directly

API_TOKEN=$(curl -s http://localhost:3000/api/auth/csrf 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
echo "API_TOKEN=$API_TOKEN"

# Also get cookie value (token|hash format)
COOKIE_VAL=$(grep csrf-token /tmp/cjar.txt | awk '{print $NF}')
echo "COOKIE_VAL=$COOKIE_VAL"

# URL decode
COOKIE_DECODED=$(echo "$COOKIE_VAL" | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read()))" 2>/dev/null)
echo "DECODED=$COOKIE_DECODED"

# Try: cookie value hash part (after |)
CSRF_HASH=$(echo "$COOKIE_DECODED" | cut -d'|' -f2)
echo "HASH=$CSRF_HASH"

echo ""
echo "=== Try login with API token ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar2.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$API_TOKEN&username=admin&password=admin123&redirect=false" 2>/dev/null

echo "=== Session response ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session 2>/dev/null
echo ""

echo "=== Cookies after login ==="
grep 'session-token' /tmp/cjar2.txt

echo ""
echo "=== Also try with hash ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar3.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_HASH&username=admin&password=admin123&redirect=false" 2>/dev/null
echo "=== Session with hash ==="
curl -s -b /tmp/cjar3.txt http://localhost:3000/api/auth/session 2>/dev/null
grep 'session-token' /tmp/cjar3.txt
"""

sftp = c.open_sftp()
with open('/tmp/fix4.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/fix4.sh', '/tmp/fix4.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/fix4.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])
c.close()
