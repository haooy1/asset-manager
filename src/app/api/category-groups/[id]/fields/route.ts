import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireRole, requireAuth } from "@/lib/auth/middleware";

/**
 * 获取某设备类型下的自定义字段列表
 * GET /api/category-groups/[id]/fields
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await db.categoryGroup.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ message: "设备类型不存在" }, { status: 404 });
    }

    const fields = await db.customField.findMany({
      where: { categoryGroupId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: fields });
  } catch (error) {
    console.error("GET /api/category-groups/[id]/fields error:", error);
    return NextResponse.json({ message: "获取自定义字段失败" }, { status: 500 });
  }
}

/**
 * 创建自定义字段
 * POST /api/category-groups/[id]/fields
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
  if (authError) return authError;

  try {
    const { id } = await params;
    const group = await db.categoryGroup.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ message: "设备类型不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { name, label, fieldType, options, required, sortOrder } = body;

    if (!name || !label) {
      return NextResponse.json({ message: "字段标识和名称不能为空" }, { status: 400 });
    }

    const existing = await db.customField.findUnique({
      where: { categoryGroupId_name: { categoryGroupId: id, name } },
    });
    if (existing) {
      return NextResponse.json({ message: "该字段标识已存在" }, { status: 409 });
    }

    const maxOrder = await db.customField.aggregate({
      where: { categoryGroupId: id },
      _max: { sortOrder: true },
    });

    const field = await db.customField.create({
      data: {
        categoryGroupId: id,
        name,
        label,
        fieldType: fieldType || "TEXT",
        options: options || null,
        required: required || false,
        sortOrder: sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ data: field }, { status: 201 });
  } catch (error) {
    console.error("POST /api/category-groups/[id]/fields error:", error);
    return NextResponse.json({ message: "创建自定义字段失败" }, { status: 500 });
  }
}
