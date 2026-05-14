#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

def run(cmd, timeout=15):
    s,o,e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8',errors='replace')

print("=== route.ts content ===")
print(run("cat /opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts"))

print("\n=== config.ts export lines ===")
print(run("cat /opt/asset-manager/src/app/api/auth/[...nextauth]/route.ts | head -10"))

print("\n=== Server error after restart ===")
print(run("journalctl -u asset-manager --no-pager -n 15 2>/dev/null | grep -i error | tail -5"))

print("\n=== Curl with verbose ===")
print(run("curl -sv http://localhost:3000/api/auth/csrf 2>&1 | grep -E 'HTTP|error|Error|Cannot' | head -10", timeout=20))

# Check what auth.ts actually got restored to
print("\n=== Current config.ts exports ===")
print(run("grep 'export' /opt/asset-manager/src/lib/auth/config.ts"))
print(run("grep 'handlers' /opt/asset-manager/src/lib/auth/config.ts"))

c.close()
