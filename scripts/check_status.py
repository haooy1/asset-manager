#!/usr/bin/env python3
"""Check and fix dashboard page"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

print("=== ROOT page.tsx ===")
print(run("cat /opt/asset-manager/src/app/page.tsx"))

print("\n=== Service status ===")
print(run("systemctl is-active asset-manager"))

print("\n=== Curl root page (no auth) ===")
out = run("curl -s http://localhost:3000/ 2>/dev/null | grep -oE '<(h1|title)[^>]*>[^<]*' | head -5")
print(out)

# Check if error shows in logs
print("\n=== Server logs (last 10 lines) ===")
out = run("journalctl -u asset-manager --no-pager -n 10 2>/dev/null", 20)
print(out[:2000])

# Check the dashboard layout
print("\n=== Dashboard layout auth check ===")
out = run("head -10 /opt/asset-manager/src/app/(dashboard)/layout.tsx")
print(out)

# Check the dashboard page
print("\n=== Dashboard page ===")
out = run("head -10 /opt/asset-manager/src/app/(dashboard)/page.tsx")
print(out)

c.close()
