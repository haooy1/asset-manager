#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92',22,'root','Secu@7766',timeout=30,allow_agent=False,look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

print("=== globals.css ===")
print(run("cat /opt/asset-manager/src/app/globals.css"))

print("\n=== layout.tsx (full) ===")
print(run("cat /opt/asset-manager/src/app/layout.tsx"))

print("\n=== tailwind.config.ts ===")
print(run("cat /opt/asset-manager/tailwind.config.ts"))

print("\n=== postcss.config.mjs ===")
print(run("cat /opt/asset-manager/postcss.config.mjs"))

print("\n=== shared/utils/cn.ts ===")
print(run("cat /opt/asset-manager/src/shared/utils/cn.ts"))

print("\n=== package.json (key deps) ===")
print(run("grep -A2 'tailwindcss\\|postcss\\|autoprefixer' /opt/asset-manager/package.json"))

print("\n=== REMOTE git (latest from GitHub) ===")
print(run("cd /opt/asset-manager && git fetch origin 2>&1 && git log origin/main --oneline -3"))

print("\n=== tsconfig.json ===")
print(run("cat /opt/asset-manager/tsconfig.json"))

c.close()
