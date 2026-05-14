import { getAuditLogs } from "@/lib/db/audit";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 查询审计日志，支持按用户、操作类型、目标类型筛选
 * @param request - Next.js 请求对象，包含查询参数（userId, action, targetType, page, pageSize）
 * @returns 返回审计日志分页结果的 JSON 响应，或 500 错误响应
 */
export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
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
