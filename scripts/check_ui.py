#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

# Login and check dashboard content
cmds = """rm -f /tmp/cjar.txt
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST http://localhost:3000/api/auth/callback/credentials -b /tmp/cjar.txt -c /tmp/cjar2.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" >/dev/null

echo "=== SESSION ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session | python3 -m json.tool 2>/dev/null | head -5

echo ""
echo "=== DASHBOARD TEXT CONTENT ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -oP '>[^<]{2,30}<' | grep -v 'script\|style\|next' | head -30

echo ""
echo "=== DASHBOARD H1 ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -oP '<h1[^>]*>[^<]*' | head -5

echo ""
echo "=== HAS STYLESHEET ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -c '<style\|stylesheet\|css' 2>/dev/null
"""

s, o, e = c.exec_command(cmds, timeout=30)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])

c.close()
