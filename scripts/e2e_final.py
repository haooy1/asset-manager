#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

# E2E login test
script = """#!/bin/bash
rm -f /tmp/cjar.txt

echo "=== Get CSRF ==="
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
echo "CSRF: ${CSRF:0:20}..."

echo "=== Login ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar2.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" \
  >/dev/null

echo "=== Session ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('User:', d.get('user',{}).get('name','NO_USER'))" 2>/dev/null

echo "=== Dashboard (authenticated) ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/ 2>/dev/null | grep -o '<h1[^>]*>[^<]*' | head -3

echo "=== Assets page ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/assets 2>/dev/null | grep -o '<h1[^>]*>[^<]*' | head -3

echo "=== Approvals page ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/approvals 2>/dev/null | grep -o '<h1[^>]*>[^<]*' | head -3

echo "=== Org page ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/org 2>/dev/null | grep -o '<h1[^>]*>[^<]*' | head -3
"""

run(f"cat > /tmp/e2e_test.sh << 'HEREDOC_END'\n{script}\nHEREDOC_END")
run("bash /tmp/e2e_test.sh")
print(run("bash /tmp/e2e_test.sh"))

c.close()
