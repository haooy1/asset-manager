const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const UPLOADS = path.join(__dirname, "..", "public", "uploads");

async function sync() {
  console.log("扫描上传目录...");
  if (!fs.existsSync(UPLOADS)) {
    console.log("uploads/ 目录不存在");
    await prisma.$disconnect();
    return;
  }

  const dirs = fs.readdirSync(UPLOADS);
  let recovered = 0;
  let skipped = 0;

  for (const assetId of dirs) {
    const assetDir = path.join(UPLOADS, assetId);
    const stat = fs.statSync(assetDir);
    if (!stat.isDirectory()) continue;

    const files = fs.readdirSync(assetDir);
    for (const filename of files) {
      const filePath = path.join(assetDir, filename);
      const fstat = fs.statSync(filePath);
      if (fstat.isDirectory()) continue;

      const relativePath = `/uploads/${assetId}/${filename}`;

      const existing = await prisma.assetDocument.findFirst({
        where: { filePath: relativePath },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const tsMatch = filename.match(/^(\d+)-(.+)$/);
      const originalName = tsMatch ? tsMatch[2] : filename;

      try {
        await prisma.assetDocument.create({
          data: {
            assetId,
            name: originalName,
            fileName: originalName,
            filePath: relativePath,
            fileType: path.extname(filename) || null,
            fileSize: fstat.size,
          },
        });
        recovered++;
        console.log(`  [RECOVERED] ${assetId}: ${originalName}`);
      } catch (e) {
        console.log(`  [SKIP] ${assetId}/${originalName}: ${e.message}`);
      }
    }
  }

  console.log(`\n完成: 恢复 ${recovered} 个，跳过 ${skipped} 个`);
  await prisma.$disconnect();
}

sync().catch((e) => {
  console.error("同步失败:", e);
  prisma.$disconnect();
  process.exit(1);
});
