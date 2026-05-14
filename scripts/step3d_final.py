#!/usr/bin/env python3
"""Step 3d: Direct schema fix + push"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Fix: add missing relations + remove remaining @db.Timestamptz
cmds = """
cd /opt/asset-manager

# 1. Remove all @db.* decorators (PG10 compatibility)
sed -i 's/@db\.[A-Za-z()]*//g' prisma/schema.prisma

# 2. Add missing accounts/sessions to User model
sed -i '/executedBy    Approval\[\]/a\\  accounts         Account[]\\n  sessions         Session[]' prisma/schema.prisma

# 3. Verify
grep -n "accounts\|sessions" prisma/schema.prisma | head -5
grep -n "@db\." prisma/schema.prisma && echo "Has @db" || echo "No @db OK"

echo "=== Prisma generate ==="
npx prisma generate 2>&1 | tail -5

echo "=== Prisma db push ==="
npx prisma db push --accept-data-loss 2>&1 | tail -15
"""

_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode('utf-8', errors='replace'))
c.close()
