import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function seed() {
  console.log("开始初始化数据...\n");

  const passwordHash = await bcrypt.hash("admin123", 12);

  const branch = await db.branch.create({
    data: {
      name: "总部",
      code: "HQ",
      address: "北京市朝阳区某大厦",
      contact: "IT部门",
    },
  });
  console.log("✓ 创建分支:", branch.name);

  const dept = await db.department.create({
    data: {
      name: "研发部",
      branchId: branch.id,
    },
  });
  console.log("✓ 创建部门:", dept.name);

  await db.user.create({
    data: {
      username: "admin",
      password: passwordHash,
      realName: "系统管理员",
      role: "SUPER_ADMIN",
      branchId: branch.id,
    },
  });
  console.log("✓ 创建管理员: admin / admin123");

  await db.user.create({
    data: {
      username: "zhangsan",
      password: passwordHash,
      realName: "张三",
      role: "EMPLOYEE",
      branchId: branch.id,
      departmentId: dept.id,
    },
  });
  console.log("✓ 创建员工: zhangsan / admin123");

  console.log("\n=============================");
  console.log("初始化完成！");
  console.log("=============================");
}

seed()
  .catch((e) => {
    console.error("初始化失败:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
