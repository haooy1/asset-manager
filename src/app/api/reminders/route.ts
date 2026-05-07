import { getWarrantyReminders, getDocumentReminders, getExpiredWarrantyAssets, getExpiredDocuments } from "@/modules/reminders/services";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
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
