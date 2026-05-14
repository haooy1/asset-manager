#!/usr/bin/env python3
"""Step 3: Start PostgreSQL + init DB + build app"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Start PostgreSQL and create DB
cmds1 = """
echo "=== Start PostgreSQL ==="
systemctl start postgresql 2>&1 || true
sleep 2
systemctl status postgresql --no-pager 2>&1 | head -3

echo "=== Create DB ==="
su - postgres -c "psql -c \\\"ALTER USER postgres PASSWORD 'postgres';\\\"" 2>/dev/null || true
su - postgres -c "psql -c \\\"CREATE DATABASE asset_manager;\\\"" 2>/dev/null || true
echo "DB ready"
"""
_, out, _ = c.exec_command(cmds1, timeout=60)
print(out.read().decode('utf-8', errors='replace'))

# Prisma
cmds2 = """
echo "=== Prisma generate ==="
cd /opt/asset-manager
npx prisma generate 2>&1 | tail -5

echo "=== Prisma db push ==="
npx prisma db push --accept-data-loss 2>&1 | tail -10
"""
_, out, _ = c.exec_command(cmds2, timeout=120)
print(out.read().decode('utf-8', errors='replace'))

c.close()
