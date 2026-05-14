
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
