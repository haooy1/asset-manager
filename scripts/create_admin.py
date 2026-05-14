#!/usr/bin/env python3
"""Create admin user on remote server"""
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('100.87.31.92', 22, 'root', 'Secu@7766', timeout=30, allow_agent=False, look_for_keys=False)

# Write a JS script, upload via SFTP, then execute
js_script = r"""
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();

(async () => {
  try {
    const hash = await bcrypt.hash('admin123', 12);
    const user = await db.user.upsert({
      where: { username: 'admin' },
      update: { password: hash, role: 'SUPER_ADMIN' },
      create: {
        username: 'admin',
        password: hash,
        realName: 'SystemAdmin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('User: ' + user.username + ' (ID: ' + user.id + ')');

    const branch = await db.branch.upsert({
      where: { code: 'HQ' },
      update: {},
      create: { name: 'Headquarters', code: 'HQ' },
    });
    console.log('Branch: ' + branch.name + ' (ID: ' + branch.id + ')');

    await db.user.update({
      where: { id: user.id },
      data: { branchId: branch.id },
    });

    const count = await db.user.count();
    console.log('Total users: ' + count);

    // Also create a demo employee
    const empHash = await bcrypt.hash('123456', 12);
    await db.user.upsert({
      where: { username: 'zhangsan' },
      update: {},
      create: {
        username: 'zhangsan',
        password: empHash,
        realName: 'Zhang San',
        role: 'EMPLOYEE',
        branchId: branch.id,
      },
    });

    console.log('=== DONE ===');
    await db.$disconnect();
  } catch(e) {
    console.error('ERROR: ' + e.message);
    console.error(e.stack);
    await db.$disconnect();
  }
})();
"""

with open('E:/08_code/asystem/scripts/create_admin.js', 'w') as f:
    f.write(js_script)

sftp = c.open_sftp()
sftp.put('E:/08_code/asystem/scripts/create_admin.js', '/tmp/create_admin.js')
sftp.close()

stdin, stdout, stderr = c.exec_command('cd /opt/asset-manager && node /tmp/create_admin.js', timeout=60)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace').strip()
print(out)
if err:
    print('ERR:', err[:500])

c.close()
