#!/usr/bin/env python3
"""Debug session and cookie issues"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt

# Get CSRF and save cookies properly (use --cookie-jar)
echo "=== Get CSRF ==="
curl -s -c /tmp/cjar.txt -D /tmp/h1.txt http://localhost:3000/api/auth/csrf 2>/dev/null
echo "Cookie jar:"
cat /tmp/cjar.txt

TOKEN=$(grep 'csrfToken' /tmp/h1.txt -A 1 | tail -1 | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null || echo "")
echo "TOKEN=$TOKEN"

if [ -n "$TOKEN" ]; then
  echo ""
  echo "=== Login ==="
  curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
    -b /tmp/cjar.txt -c /tmp/cjar2.txt \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "csrfToken=$TOKEN&username=admin&password=admin123&redirect=false" \
    -D /tmp/login_h.txt 2>/dev/null

  echo "Cookie jar after login:"
  cat /tmp/cjar2.txt

  echo ""
  echo "=== Check session ==="
  curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session 2>/dev/null
fi
echo ""
echo "=== Server logs ==="
journalctl -u asset-manager --no-pager -n 5 2>/dev/null | grep -i 'error\|fail\|auth\|csrf' | tail -3
"""

sftp = c.open_sftp()
with open('/tmp/diag.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/diag.sh', '/tmp/diag.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/diag.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])
c.close()
