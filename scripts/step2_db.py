#!/usr/bin/env python3
"""Step 2: Install PostgreSQL + Prisma init"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

cmds = """
echo "=== 1. Install PostgreSQL ==="
yum install -y postgresql-server 2>&1 | tail -5 || true
postgresql-setup --initdb 2>/dev/null || initdb -D /var/lib/pgsql/data 2>/dev/null || true
systemctl enable postgresql 2>/dev/null || true
systemctl start postgresql 2>/dev/null || true
systemctl status postgresql --no-pager 2>&1 | head -3

echo "=== 2. Setup DB ==="
su - postgres -c "psql -c \\"ALTER USER postgres PASSWORD 'postgres';\\"" 2>/dev/null || true
su - postgres -c "psql -c \\"CREATE DATABASE asset_manager;\\"" 2>/dev/null || true
echo "DB setup done"

echo "=== 3. Prisma generate ==="
cd /opt/asset-manager
npx prisma generate 2>&1 | tail -3

echo "=== 4. Prisma db push ==="
npx prisma db push --accept-data-loss 2>&1 | tail -10

echo "=== DONE ==="
"""

_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode('utf-8', errors='replace'))
c.close()
