import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireRole, requireAuth } from "@/lib/auth/middleware";

/**
 * 获取所有设备类型列表（内置 + 自定义）
 * GET /api/category-groups
 */
export async function GET(_req: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;
    const groups = await db.categoryGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      include: {
        _count: { select: { assets: true, fields: true } },
      },
    });
    return NextResponse.json({ data: groups });
  } catch (error) {
    console.error("GET /api/category-groups error:", error);
    return NextResponse.json({ message: "获取设备类型列表失败" }, { status: 500 });
  }
}

/**
 * 创建自定义设备类型
 * POST /api/category-groups
 */
export async function POST(req: NextRequest) {
  const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
  if (authError) return authError;

  try {
    const body = await req.json();
    const { name, label } = body;

    if (!name || !label) {
      return NextResponse.json({ message: "设备类型标识和名称不能为空" }, { status: 400 });
    }

    const existing = await db.categoryGroup.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ message: "设备类型标识已存在" }, { status: 409 });
    }

    const maxOrder = await db.categoryGroup.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const group = await db.categoryGroup.create({
      data: {
        name,
        label,
        isBuiltin: false,
        sortOrder,
      },
      include: {
        _count: { select: { assets: true, fields: true } },
      },
    });

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    console.error("POST /api/category-groups error:", error);
    return NextResponse.json({ message: "创建设备类型失败" }, { status: 500 });
  }
}
