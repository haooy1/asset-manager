import { getAuditLogs } from "@/lib/db/audit";
import { requireRole } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 查询审计日志（仅管理员可访问）
 */
export async function GET(request: Request) {
  try {
    const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const result = await getAuditLogs({
      userId: searchParams.get("userId") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      targetType: searchParams.get("targetType") ?? undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 50,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("查询审计日志失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
