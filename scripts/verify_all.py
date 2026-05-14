#!/usr/bin/env python3
"""Final E2E login test"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

test = """#!/bin/bash
rm -f /tmp/cjar.txt

# Get CSRF
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
echo "CSRF: ${CSRF:0:20}..."

# Login
curl -s -X POST http://localhost:3000/api/auth/callback/credentials \
  -b /tmp/cjar.txt -c /tmp/cjar2.txt \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" > /tmp/login_resp.txt

echo "Login RC: $?"
echo "Login body: $(head -1 /tmp/login_resp.txt)"

# Session
echo "SESSION:"
curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session | python3 -m json.tool 2>/dev/null | head -10

# Dashboard
echo "DASHBOARD H1:"
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -o '<h1[^>]*>[^<]*' | head -5

echo "STATS:"
curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -o '[0-9]*[^<]*台设备已录入\|设备总数\|使用中\|即将到期' | head -5

echo "ASSETS PAGE:"
curl -s -b /tmp/cjar2.txt http://localhost:3000/assets | grep -o '<h1[^>]*>[^<]*' | head -3

echo "APPROVALS PAGE:"
curl -s -b /tmp/cjar2.txt http://localhost:3000/approvals | grep -o '<h1[^>]*>[^<]*' | head -3

echo "ORG PAGE:"
curl -s -b /tmp/cjar2.txt http://localhost:3000/org | grep -o '<h1[^>]*>[^<]*' | head -3

echo "ALL DONE"
"""

with open('/tmp/verify.sh','w') as f:
    f.write(test)

sftp = c.open_sftp()
sftp.put('/tmp/verify.sh','/tmp/verify.sh')
sftp.close()

s,o,e = c.exec_command('bash /tmp/verify.sh', timeout=60)
out = o.read().decode('utf-8',errors='replace')
print(out[:5000])
c.close()
