const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BUILTIN_CATEGORIES = [
  { name: "PC", label: "办公电脑", sortOrder: 1 },
  { name: "PERIPHERAL", label: "外设配件", sortOrder: 2 },
  { name: "NETWORK", label: "网络设备", sortOrder: 3 },
  { name: "SERVER_STORAGE", label: "服务器/存储", sortOrder: 4 },
  { name: "MOBILE", label: "移动设备", sortOrder: 5 },
  { name: "MEETING", label: "会议设备", sortOrder: 6 },
  { name: "SECURITY_DEVICE", label: "网络安全设备", sortOrder: 7 },
  { name: "SECURITY_DOCUMENT", label: "安全文档", sortOrder: 8 },
];

async function seed() {
  console.log("开始初始化内置设备类型...");
  let created = 0;
  let updated = 0;

  for (const cat of BUILTIN_CATEGORIES) {
    const existing = await prisma.categoryGroup.findUnique({
      where: { name: cat.name },
    });

    if (existing) {
      await prisma.categoryGroup.update({
        where: { name: cat.name },
        data: { label: cat.label, sortOrder: cat.sortOrder, isBuiltin: true },
      });
      updated++;
      console.log(`  [U] ${cat.name} -> ${cat.label}`);
    } else {
      await prisma.categoryGroup.create({
        data: { ...cat, isBuiltin: true },
      });
      created++;
      console.log(`  [C] ${cat.name} -> ${cat.label}`);
    }
  }

  console.log(`\n完成: 创建 ${created} 个, 更新 ${updated} 个`);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("种子脚本执行失败:", e);
  prisma.$disconnect();
  process.exit(1);
});
