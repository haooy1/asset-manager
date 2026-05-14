import { getWarrantyReminders, getDocumentReminders, getExpiredWarrantyAssets, getExpiredDocuments } from "@/modules/reminders/services";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取维保和文档到期提醒，支持按类型和天数筛选
 * @param request - Next.js 请求对象，包含查询参数（type, days）
 * @returns 返回提醒数据的 JSON 响应，或 500 错误响应
 */
export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "all";
    const days = Number(searchParams.get("days")) || 30;

    const result: Record<string, unknown> = {};

    if (type === "all" || type === "warranty") {
      const [warranty, expiredWarranty] = await Promise.all([
        getWarrantyReminders(days),
        getExpiredWarrantyAssets(),
      ]);
      result.warranty = warranty;
      result.expiredWarranty = expiredWarranty;
    }

    if (type === "all" || type === "document") {
      const [docs, expiredDocs] = await Promise.all([
        getDocumentReminders(days),
        getExpiredDocuments(),
      ]);
      result.documents = docs;
      result.expiredDocuments = expiredDocs;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取提醒失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
