#!/usr/bin/env python3
# encoding: utf-8
import paramiko, sys

HOST = "100.87.31.92"
USER = "root"
PASS = "Secu@7766"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30, allow_agent=False, look_for_keys=False)

# Check schema state + try push
cmds = "cd /opt/asset-manager\n"
cmds += "echo CHECK_NS:$(grep -c '@db.Uuid' prisma/schema.prisma 2>/dev/null)\n"
cmds += "echo CHECK_AC:$(grep -c 'accounts.*Account' prisma/schema.prisma 2>/dev/null)\n"
cmds += "echo CHECK_SE:$(grep -c 'sessions.*Session' prisma/schema.prisma 2>/dev/null)\n"
cmds += "echo '=== Prisma generate ==='\n"
cmds += "npx prisma generate 2>&1 | tail -5\n"
cmds += "echo '=== Prisma db push ==='\n"
cmds += "npx prisma db push --accept-data-loss 2>&1 | tail -15\n"

stdin, stdout, stderr = c.exec_command(cmds, timeout=120)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print(out[:3000])
if err.strip():
    print("STDERR:", err[:500])
c.close()
