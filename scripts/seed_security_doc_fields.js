const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SECURITY_DOC_FIELDS = [
  { name: "report_type", label: "报告类型", fieldType: "SELECT", options: "渗透测试报告,等保测评报告,风险评估报告,安全审计报告,应急响应报告,代码审计报告,其他", required: true, sortOrder: 1 },
  { name: "assessment_date", label: "测评时间", fieldType: "DATE", required: true, sortOrder: 2 },
  { name: "assessment_org", label: "测评机构", fieldType: "TEXT", required: false, sortOrder: 3 },
  { name: "compliance_standard", label: "合规标准", fieldType: "SELECT", options: "GB/T 22239-2019,ISO 27001,等保2.0三级,等保2.0二级,GDPR,其他", required: false, sortOrder: 4 },
  { name: "assessment_result", label: "测评结论", fieldType: "SELECT", options: "符合,基本符合,不符合,不适用", required: false, sortOrder: 5 },
  { name: "certificate_no", label: "证书编号", fieldType: "TEXT", required: false, sortOrder: 6 },
];

async function seed() {
  console.log("初始化安全文档(SECURITY_DOCUMENT)推荐自定义字段...");

  const group = await prisma.categoryGroup.findUnique({ where: { name: "SECURITY_DOCUMENT" } });
  if (!group) {
    console.log("  SECURITY_DOCUMENT 类型不存在，跳过");
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let updated = 0;

  for (const field of SECURITY_DOC_FIELDS) {
    const existing = await prisma.customField.findUnique({
      where: { categoryGroupId_name: { categoryGroupId: group.id, name: field.name } },
    });

    if (existing) {
      await prisma.customField.update({
        where: { id: existing.id },
        data: {
          label: field.label,
          fieldType: field.fieldType,
          options: field.options || null,
          required: field.required,
          sortOrder: field.sortOrder,
        },
      });
      updated++;
      console.log(`  [U] ${field.name} -> ${field.label} (${field.fieldType})`);
    } else {
      await prisma.customField.create({
        data: {
          categoryGroupId: group.id,
          ...field,
        },
      });
      created++;
      console.log(`  [C] ${field.name} -> ${field.label} (${field.fieldType})`);
    }
  }

  console.log(`\n安全文档字段: 创建 ${created} 个, 更新 ${updated} 个`);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("种子脚本执行失败:", e);
  prisma.$disconnect();
  process.exit(1);
});
