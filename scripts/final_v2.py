#!/usr/bin/env python3
"""Fix: add allowedDevOrigins + update next.config + verify login"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# 1. Fix next.config.ts
next_config = """import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: ["100.87.31.92", "localhost"],
};

export default nextConfig;
"""

sftp = c.open_sftp()
with open('/tmp/nc.ts', 'w') as f:
    f.write(next_config)
sftp.put('/tmp/nc.ts', '/opt/asset-manager/next.config.ts')
sftp.close()

# 2. Verify login with verbose mode
test = """#!/bin/bash
rm -f /tmp/cjar.txt

echo "=== Get CSRF from signin page ==="
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/signin >/dev/null

echo "=== Get CSRF token ==="
CSRF=$(curl -s -b /tmp/cjar.txt -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")

echo "=== Login (verbose for Set-Cookie) ==="
curl -v -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" \
  2>&1 | grep -i '< set-cookie\|< location\|< HTTP'
"""

sftp = c.open_sftp()
with open('/tmp/verify.sh', 'w') as f:
    f.write(test)
sftp.put('/tmp/verify.sh', '/tmp/verify.sh')
sftp.close()

# Restart
s, o, e = c.exec_command("systemctl restart asset-manager && sleep 6 && echo 'READY'", timeout=30)
print(o.read().decode())

s, o, e = c.exec_command('bash /tmp/verify.sh', timeout=60)
out = o.read().decode('utf-8', errors='replace')
print(out[:5000])

c.close()
