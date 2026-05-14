#!/usr/bin/env python3
import paramiko, sys

HOST = "100.87.31.92"
USER = "root"
PASS = "Secu@7766"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=30):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

# Step 1: Delete root page.tsx (this was shadowing the dashboard)
out, _ = run("rm -fv /opt/asset-manager/src/app/page.tsx")
print("Delete root page:", out.strip())

# Step 2: Restore original login page from git
out, _ = run("cd /opt/asset-manager && git checkout -- src/app/'(auth)'/login/page.tsx 2>&1; echo rc=$?")
print("Restore login:", out.strip())

# Step 3: Check current state
out, _ = run("echo '--- ROOT PAGE ---'; ls /opt/asset-manager/src/app/page.tsx 2>/dev/null || echo 'GONE_OK'; echo '--- DASHBOARD PAGE ---'; ls /opt/asset-manager/src/app/'(dashboard)'/page.tsx 2>/dev/null; echo '--- LOGIN PAGE ---'; head -3 /opt/asset-manager/src/app/'(auth)'/login/page.tsx 2>/dev/null")
print(out)

# Step 4: Restart service
out, _ = run("systemctl restart asset-manager 2>&1; sleep 8; systemctl is-active asset-manager")
print("Service:", out.strip())

# Step 5: Verify
out, _ = run("curl -s -o /dev/null -w 'ROOT_HTTP:%{http_code}\n' http://localhost:3000/; curl -s -o /dev/null -w 'LOGIN_HTTP:%{http_code}\n' http://localhost:3000/login")
print(out)

# Step 6: Check CPU/process
out, _ = run("ps aux | grep 'next dev' | grep -v grep | wc -l")
print("Next.js processes:", out.strip())

c.close()
print("\nDONE - Try http://100.87.31.92:3000/login")
