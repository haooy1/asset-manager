import { getAuditLogs } from "@/lib/db/audit";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
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
