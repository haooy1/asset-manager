import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireRole, requireAuth } from "@/lib/auth/middleware";

/**
 * 获取单个设备类型详情
 * GET /api/category-groups/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;
    const { id } = await params;
    const group = await db.categoryGroup.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        _count: { select: { assets: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ message: "设备类型不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: group });
  } catch (error) {
    console.error("GET /api/category-groups/[id] error:", error);
    return NextResponse.json({ message: "获取设备类型详情失败" }, { status: 500 });
  }
}

/**
 * 更新设备类型
 * PUT /api/category-groups/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
  if (authError) return authError;

  try {
    const { id } = await params;
    const existing = await db.categoryGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "设备类型不存在" }, { status: 404 });
    }
    if (existing.isBuiltin) {
      return NextResponse.json({ message: "内置设备类型不可修改" }, { status: 403 });
    }

    const body = await req.json();
    const { label } = body;

    if (!label) {
      return NextResponse.json({ message: "设备类型名称不能为空" }, { status: 400 });
    }

    const group = await db.categoryGroup.update({
      where: { id },
      data: { label },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        _count: { select: { assets: true } },
      },
    });

    return NextResponse.json({ data: group });
  } catch (error) {
    console.error("PUT /api/category-groups/[id] error:", error);
    return NextResponse.json({ message: "更新设备类型失败" }, { status: 500 });
  }
}

/**
 * 删除自定义设备类型
 * DELETE /api/category-groups/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
  if (authError) return authError;

  try {
    const { id } = await params;
    const existing = await db.categoryGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "设备类型不存在" }, { status: 404 });
    }
    if (existing.isBuiltin) {
      return NextResponse.json({ message: "内置设备类型不可删除" }, { status: 403 });
    }

    await db.categoryGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/category-groups/[id] error:", error);
    return NextResponse.json({ message: "删除设备类型失败" }, { status: 500 });
  }
}
