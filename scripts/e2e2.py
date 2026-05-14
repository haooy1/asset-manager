#!/usr/bin/env python3
"""Test: check if login actually works programmatically"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Try with -v to see EVERYTHING
test = """#!/bin/bash
rm -f /tmp/cjar.txt

# Get CSRF cookie
curl -s -c /tmp/cjar.txt -o /dev/null http://localhost:3000/api/auth/csrf

# Get token
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")

echo "=== CSRF token ==="
echo "$CSRF"

echo ""
echo "=== Login with verbose STDOUT ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" 2>/dev/null

echo ""
echo "=== Login RC: $? ==="

echo ""
echo "=== Server logs ==="
journalctl -u asset-manager --no-pager -n 8 2>/dev/null | grep -v '^\$' | tail -5
"""

sftp = c.open_sftp()
with open('/tmp/e2e2.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/e2e2.sh', '/tmp/e2e2.sh')
sftp.close()

s, o, e = c.exec_command('bash /tmp/e2e2.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])
c.close()
