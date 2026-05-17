import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requireRole, requireAuth } from "@/lib/auth/middleware";

/**
 * 获取单个自定义字段详情
 * GET /api/fields/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;
    const { id } = await params;
    const field = await db.customField.findUnique({
      where: { id },
      include: { categoryGroup: true },
    });

    if (!field) {
      return NextResponse.json({ message: "自定义字段不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: field });
  } catch (error) {
    console.error("GET /api/fields/[id] error:", error);
    return NextResponse.json({ message: "获取自定义字段失败" }, { status: 500 });
  }
}

/**
 * 更新自定义字段
 * PUT /api/fields/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
  if (authError) return authError;

  try {
    const { id } = await params;
    const existing = await db.customField.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "自定义字段不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { label, fieldType, options, required, sortOrder } = body;

    const field = await db.customField.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(fieldType !== undefined && { fieldType }),
        ...(options !== undefined && { options }),
        ...(required !== undefined && { required }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({ data: field });
  } catch (error) {
    console.error("PUT /api/fields/[id] error:", error);
    return NextResponse.json({ message: "更新自定义字段失败" }, { status: 500 });
  }
}

/**
 * 删除自定义字段
 * DELETE /api/fields/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
  if (authError) return authError;

  try {
    const { id } = await params;
    const existing = await db.customField.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "自定义字段不存在" }, { status: 404 });
    }

    await db.customField.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/fields/[id] error:", error);
    return NextResponse.json({ message: "删除自定义字段失败" }, { status: 500 });
  }
}
