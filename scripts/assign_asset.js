const { PrismaClient } = require('@prisma/client');

async function main() {
  const assetNo = process.argv[2];
  const username = process.argv[3] || '123';
  const prisma = new PrismaClient();

  if (!assetNo) {
    // Show current assignments
    const assets = await prisma.asset.findMany({ select: { id: true, assetNo: true, name: true, assignedUserId: true } });
    console.log("Current assets:");
    assets.forEach(a => console.log(`  ${a.assetNo} ${a.name} -> assignedUserId=${a.assignedUserId || 'null'}`));
    await prisma.$disconnect();
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) { console.log(`User ${username} not found`); process.exit(1); }

  const asset = await prisma.asset.update({
    where: { assetNo },
    data: { assignedUserId: user.id, status: 'IN_USE' },
  });
  console.log(`Asset ${asset.assetNo} assigned to ${username} (${user.id})`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
