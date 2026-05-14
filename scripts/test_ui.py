#!/usr/bin/env python3
"""Test login + fetch dashboard HTML"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

script = """#!/bin/bash
rm -f /tmp/cjar.txt
curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf >/dev/null
CSRF=$(curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
curl -s -X POST http://localhost:3000/api/auth/callback/credentials -b /tmp/cjar.txt -c /tmp/cjar.txt -H 'Content-Type: application/x-www-form-urlencoded' -d "csrfToken=$CSRF&username=admin&password=admin123&redirect=false" >/dev/null
echo SESSION:
curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/session
echo ""
echo DASHBOARD_HEAD:
curl -s -b /tmp/cjar.txt http://localhost:3000/ | grep -o '<h1[^>]*>[^<]*' | head -10
echo ""
echo SIDEBAR:
curl -s -b /tmp/cjar.txt http://localhost:3000/ | grep -o '>首页\|>资产\|>审批\|>组织\|>退出' | head -10
echo ""
echo STATS:
curl -s -b /tmp/cjar.txt http://localhost:3000/ | grep -o '设备总数\|使用中\|即将到期\|台设备\|使用率' | head -10
"""

with open('/tmp/hi.sh','w') as f:
    f.write(script)

sftp = c.open_sftp()
sftp.put('/tmp/hi.sh','/tmp/hi.sh')
sftp.close()

s,o,e = c.exec_command('bash /tmp/hi.sh', timeout=60)
out = o.read().decode('utf-8',errors='replace')
print(out[:6000])
c.close()
