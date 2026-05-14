#!/usr/bin/env python3
"""Fix: install @tailwindcss/postcss for Tailwind v4"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=30):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

print("=== Install @tailwindcss/postcss ===")
print(run("cd /opt/asset-manager && npm install @tailwindcss/postcss 2>&1 | tail -5", timeout=120))

print("\n=== Verify ===")
print(run("ls /opt/asset-manager/node_modules/@tailwindcss/postcss/package.json && echo OK || echo MISSING"))

print("\n=== Restart ===")
print(run("systemctl restart asset-manager && sleep 8 && echo RESTARTED", timeout=30))

print("\n=== Test ===")
print(run("curl -s -o /dev/null -w 'ROOT:%{http_code} ' http://localhost:3000/; curl -s -o /dev/null -w 'LOGIN:%{http_code} ' http://localhost:3000/login; curl -s -o /dev/null -w 'SESSION:%{http_code}' http://localhost:3000/api/auth/session; echo"))

print("\n=== Login Test ===")
print(run("""rm -f /tmp/cjar.txt
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST http://localhost:3000/api/auth/callback/credentials -b /tmp/cjar.txt -c /tmp/cjar2.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" >/dev/null 2>&1
echo "User: $(curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get(\"user\",{}).get(\"name\",\"FAIL\"))' 2>/dev/null)"
echo "Dash has sidebar: $(curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -c 'flex min-h-screen flex-col md:flex-row')" """, timeout=30))

print("\n=== Errors ===")
print(run("journalctl -u asset-manager --no-pager -n 5 2>/dev/null | grep -i error | tail -3"))

c.close()
print("\nDONE - Try http://100.87.31.92:3000/login (Ctrl+Shift+R)")
