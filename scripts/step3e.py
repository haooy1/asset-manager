#!/usr/bin/env python3
"""Step 3e: Re-clone schema, fix PG10 compat, push"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = """
cd /opt/asset-manager

# Restore original schema from git
git checkout prisma/schema.prisma
echo "Schema restored from git"

# Remove ONLY @db.XXX decorators for PG10 compat (but keep VarChar params etc)
# @db.Uuid -> nothing
# @db.VarChar(N) -> keep (PG supports it)
# @db.Text -> keep (PG supports it)
# @db.Date -> nothing (PG uses regular DateTime)
# @db.Decimal(p,s) -> keep
# @db.Timestamptz() -> keep

# Actually PG10 does support VarChar, Text, Timestamptz, Decimal
# Only @db.Uuid is problematic (requires pgcrypto extension)
# So remove only @db.Uuid

sed -i 's/@db\\.Uuid//g' prisma/schema.prisma

# Add missing relation fields
sed -i '/executedBy.*ApprovalExecutor/ a\\  accounts         Account[]\\n  sessions         Session[]' prisma/schema.prisma

# Check
grep -n "@db.Uuid" prisma/schema.prisma && echo "UUID remains" || echo "No UUID OK"
grep -n "accounts\|sessions" prisma/schema.prisma | head -3

echo "=== Prisma generate ==="
npx prisma generate 2>&1 | tail -5

echo "=== Prisma db push ==="
npx prisma db push --accept-data-loss 2>&1 | tail -15
"""

_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode('utf-8', errors='replace'))
c.close()
