#!/usr/bin/env python3
"""Diagnose login issue"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=30):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')[:3000], e.read().decode('utf-8', errors='replace')[:500]

out, err = run("cd /opt/asset-manager && cat .env")
print("=== .env ===")
print(out)

out, err = run("cd /opt/asset-manager && cat src/lib/auth/config.ts")
print("=== auth/config.ts ===")
print(out)

out, err = run("cd /opt/asset-manager && grep -n 'secret\|NEXTAUTH\|AUTH_SECRET' .env src/lib/auth/config.ts 2>/dev/null")
print("=== SECRET check ===")
print(out)

out, err = run("cd /opt/asset-manager && journalctl -u asset-manager --no-pager -n 20 2>/dev/null | grep -i 'nextauth\|signin\|jwt\|error\|fail' | tail -10")
print("=== LOGS ===")
print(out)

c.close()
