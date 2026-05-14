#!/usr/bin/env python3
"""Compare planned features vs actual deployed code"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

print("=== ALL SOURCE FILES ===")
print(run("find /opt/asset-manager/src -name '*.ts' -o -name '*.tsx' | sort"))

print("\n=== PRISMA MODELS ===")
print(run("grep '^model ' /opt/asset-manager/prisma/schema.prisma"))

print("\n=== API ROUTES ===")
print(run("find /opt/asset-manager/src/app/api -name 'route.ts' | sort"))

print("\n=== PAGES ===")
print(run("find /opt/asset-manager/src/app -name 'page.tsx' | sort"))

c.close()
