const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const username = process.argv[2] || '123';
  const newPwd = process.argv[3] || 'test123';
  const prisma = new PrismaClient();
  
  const hash = await bcrypt.hash(newPwd, 12);
  const user = await prisma.user.update({
    where: { username },
    data: { password: hash },
  });
  console.log(`Password for user "${user.username}" (${user.realName}) reset to: ${newPwd}`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
