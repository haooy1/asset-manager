import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, inUse, expiring] = await Promise.all([
      db.asset.count(),
      db.asset.count({ where: { status: "IN_USE" } }),
      db.asset.count({
        where: {
          warrantyExpiry: { gte: now, lte: thirtyDaysLater },
          status: { not: "SCRAPPED" },
        },
      }),
    ]);

    return NextResponse.json({ total, inUse, expiring });
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
