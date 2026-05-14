import { getBranches, updateBranch } from "@/modules/org/services";
import { requireAuth, requireRole } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取指定分支的详细信息
 * @param _request - Next.js 请求对象（未使用）
 * @param params - 路由参数，包含分支 ID
 * @returns 返回分支详情的 JSON 响应，或 404/500 错误响应
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

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

/**
 * 更新指定分支的信息（需要 SUPER_ADMIN 角色）
 * @param request - Next.js 请求对象，包含更新数据的 JSON 请求体
 * @param params - 路由参数，包含分支 ID
 * @returns 返回更新后分支的 JSON 响应，或 500 错误响应
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireRole("SUPER_ADMIN");
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const updated = await updateBranch(id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("更新分支失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
