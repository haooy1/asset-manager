#!/usr/bin/env python3
"""Fix .env variable names for NextAuth v5"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=30):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace'), e.read().decode('utf-8', errors='replace')

# Fix .env
cmds = """cd /opt/asset-manager

# Backup original
cp .env .env.bak

# Replace AUTH_SECRET with NEXTAUTH_SECRET, AUTH_URL with NEXTAUTH_URL
sed -i 's/^AUTH_SECRET=/NEXTAUTH_SECRET=/' .env
sed -i 's/^AUTH_URL=/NEXTAUTH_URL=/' .env

echo "=== Fixed .env ==="
cat .env

echo ""
echo "=== Restarting service ==="
systemctl restart asset-manager
sleep 6

echo ""
echo "=== Test login ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrf=true&username=admin&password=admin123&redirect=false" \
  -c /tmp/cookies.txt 2>&1 | head -10

echo ""
echo "=== Callback response ==="
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" \
  -D /tmp/headers.txt 2>&1 | head -20

cat /tmp/headers.txt | head -10
"""

out, err = run(cmds, timeout=60)
print(out.encode('ascii', errors='replace').decode('ascii')[:3000])
if err.strip():
    print("ERR:", err.encode('ascii', errors='replace').decode('ascii')[:500])

c.close()
