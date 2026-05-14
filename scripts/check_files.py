#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=15):
    s, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', errors='replace')

commands = """
echo "=== GIT LOG ==="
cd /opt/asset-manager && git log --oneline -5

echo ""
echo "=== KEY CONFIG FILES ==="
ls -la /opt/asset-manager/tailwind.config.ts 2>/dev/null || echo "tailwind.config.ts MISSING"
ls -la /opt/asset-manager/postcss.config.mjs 2>/dev/null || echo "postcss.config.mjs MISSING"
ls -la /opt/asset-manager/globals.css 2>/dev/null || echo "globals.css MISSING (root)"

echo ""
echo "=== ALL CSS FILES ==="
find /opt/asset-manager/src -name "*.css" 2>/dev/null

echo ""
echo "=== shared/ directory ==="
ls -la /opt/asset-manager/src/shared/ 2>/dev/null || echo "shared/ MISSING"

echo ""
echo "=== layout.tsx (check css import) ==="
grep -n "globals.css\|import.*css\|className" /opt/asset-manager/src/app/layout.tsx 2>/dev/null | head -5

echo ""
echo "=== tailwind modules ==="
ls /opt/asset-manager/node_modules/tailwindcss/package.json 2>/dev/null && echo "tailwindcss OK" || echo "tailwindcss MISSING"
ls /opt/asset-manager/node_modules/postcss/package.json 2>/dev/null && echo "postcss OK" || echo "postcss MISSING"
ls /opt/asset-manager/node_modules/autoprefixer/package.json 2>/dev/null && echo "autoprefixer OK" || echo "autoprefixer MISSING"

echo ""
echo "=== DIFF from git (all modified files) ==="
cd /opt/asset-manager && git status --short | head -20
"""

s, o, e = c.exec_command(commands, timeout=30)
print(o.read().decode('utf-8', errors='replace'))

c.close()
