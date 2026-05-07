import { getBranches, updateBranch } from "@/modules/org/services";
import { requireAuth, requireRole } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const branch = await getBranches();
    const found = branch.find((b) => b.id === id);
    if (!found) {
      return NextResponse.json({ error: "NOT_FOUND", message: "分支不存在" }, { status: 404 });
    }
    return NextResponse.json({ data: found });
  } catch (error) {
    console.error("获取分支详情失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireRole("SUPER_ADMIN");
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateBranch(id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("更新分支失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
