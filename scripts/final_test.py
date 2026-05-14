#!/usr/bin/env python3
"""E2E test using paramiko exec"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

def run(cmd, timeout=15):
    s,o,e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8',errors='replace'), s.channel.recv_exit_status()

# Step 1: Get CSRF cookie
run("rm -f /tmp/cjar.txt")

out,_ = run("curl -s -c /tmp/cjar.txt http://localhost:3000/api/auth/csrf")
print("CSRF:", out[:100])

# Step 2: Get CSRF token from cookie
out,_ = run("curl -s -b /tmp/cjar.txt http://localhost:3000/api/auth/csrf")
csrf = out.strip().split('"csrfToken":"')[1].split('"')[0]
print("Token:", csrf[:20]+"...")

# Step 3: Login
import urllib.parse
data = f"csrfToken={csrf}&username=admin&password=admin123&redirect=false"
cmd = f'curl -s -X POST "http://localhost:3000/api/auth/callback/credentials" -b /tmp/cjar.txt -c /tmp/cjar2.txt -H "Content-Type: application/x-www-form-urlencoded" -d "{data}"'
out,rc = run(cmd)
print("Login RC:", rc)

# Step 4: Session
out,_ = run("curl -s -b /tmp/cjar2.txt http://localhost:3000/api/auth/session")
print("Session:", out[:300])

# Step 5: Dashboard
out,_ = run("curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -o '<h1[^>]*>[^<]*' | head -5")
print("Dashboard H1:", out[:200])

out,_ = run("curl -s -b /tmp/cjar2.txt http://localhost:3000/ | grep -c 'sidebar\|nav-\|flex min-h-screen'")
print("Has sidebar:", out.strip())

out,_ = run("curl -s -b /tmp/cjar2.txt http://localhost:3000/assets | grep -o '<h1[^>]*>[^<]*' | head -3")
print("Assets:", out[:200])

out,_ = run("curl -s -b /tmp/cjar2.txt http://localhost:3000/approvals | grep -o '<h1[^>]*>[^<]*' | head -3")
print("Approvals:", out[:200])

c.close()
