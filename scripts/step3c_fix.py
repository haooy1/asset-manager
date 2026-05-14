#!/usr/bin/env python3
"""Step 3c: Fix Prisma schema + push"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Fix Prisma schema - add missing relation fields to User model
cmds = """
cd /opt/asset-manager/prisma

# Read current schema
cat > /tmp/fix_schema.py << 'PYEOF'
import re

with open('schema.prisma', 'r') as f:
    content = f.read()

# Find the line before "@@map" in User model and add relation arrays
user_end_marker = '  @@map("users")'
relations = '''  accounts         Account[]
  sessions         Session[]'''

new_content = content.replace(user_end_marker, relations + '\\n' + user_end_marker)

with open('schema.prisma', 'w') as f:
    f.write(new_content)

print("Schema fixed")
PYEOF

cd /opt/asset-manager
python /tmp/fix_schema.py

echo "=== Prisma generate ==="
npx prisma generate 2>&1 | tail -5

echo "=== Prisma db push ==="
npx prisma db push --accept-data-loss 2>&1 | tail -15
"""

_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode('utf-8', errors='replace'))
c.close()
