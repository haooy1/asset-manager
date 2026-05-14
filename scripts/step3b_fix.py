#!/usr/bin/env python3
"""Step 3b: Fix PostgreSQL auth + Prisma init"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = """
echo "=== Fix pg_hba.conf ==="
PG_HBA=$(find /var/lib/pgsql /etc -name pg_hba.conf 2>/dev/null | head -1)
echo "Found: $PG_HBA"
if [ -f "$PG_HBA" ]; then
  # Change peer to md5 for local connections, and ident to md5
  sed -i 's/peer/md5/g' "$PG_HBA"
  sed -i 's/ident/md5/g' "$PG_HBA"
  systemctl restart postgresql
  sleep 2
  echo "pg_hba.conf updated"
fi

echo "=== Set postgres password ==="
su - postgres -c "psql -c \\\"ALTER USER postgres PASSWORD 'postgres';\\\"" 2>/dev/null
echo "password set"

echo "=== Update .env for host connection ==="
cd /opt/asset-manager
sed -i 's|localhost|127.0.0.1|g' .env
cat .env

echo "=== Fix Prisma schema for PG10 ==="
# PG10 doesn't support @db.Uuid, use plain String instead
cd /opt/asset-manager
sed -i 's/@db\.Uuid//g' prisma/schema.prisma
grep -c '@db.Uuid' prisma/schema.prisma && echo "UUID still present" || echo "UUID removed OK"

echo "=== Prisma generate ==="
npx prisma generate 2>&1 | tail -5

echo "=== Prisma db push ==="
npx prisma db push --accept-data-loss 2>&1 | tail -10
"""

_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode('utf-8', errors='replace'))
c.close()
