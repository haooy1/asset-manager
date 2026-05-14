#!/usr/bin/env python3
"""E2E: login and fetch dashboard HTML"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt

echo "=== Login ==="
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" >/dev/null

echo "=== Session ==="
curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/session | python3 -m json.tool 2>/dev/null

echo ""
echo "=== Dashboard HTML (first 80 lines) ==="
curl -s -b /tmp/cjar.txt http://localhost:3000/ 2>/dev/null | head -80

echo ""
echo "=== Login page HTML (first 30 lines) ==="
curl -s http://localhost:3000/login 2>/dev/null | head -30
"""

s, o, e = c.exec_command('cat > /tmp/e2e_real.sh << XXXX\n' + test + '\nXXXX\nbash /tmp/e2e_real.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:8000])
c.close()
