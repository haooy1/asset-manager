#!/usr/bin/env python3
"""Debug login step by step"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

def run(cmd, timeout=15):
    s,o,e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8',errors='replace')

# Check config
print("=== config.ts ===")
print(run("head -70 /opt/asset-manager/src/lib/auth/config.ts"))

print("\n=== route.ts ===")
print(run("cat /opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts"))

print("\n=== middleware.ts ===")
print(run("cat /opt/asset-manager/src/lib/auth/middleware.ts"))

# Try direct CMD login with verbose output
print("\n=== Direct login test ===")
out = run("""
rm -f /tmp/cjar.txt
# Get CSRF
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
echo "CSRF=$CSRF"

# Login with verbose
curl -v -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar2.txt \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" \
  2>/tmp/login_v.txt 1>/tmp/login_b.txt

echo "=== STDERR ==="
head -20 /tmp/login_v.txt | grep -E 'HTTP|location|Set-Cookie'
echo "=== BODY ==="
cat /tmp/login_b.txt
echo "=== SESSION ==="
curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session
""", timeout=30)
print(out)

print("\n=== Server errors ===")
out = run("journalctl -u asset-manager --no-pager -n 10 2>/dev/null | grep -i error | tail -5")
print(out)

c.close()
