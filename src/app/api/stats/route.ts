import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/lib/db/client";
import { NextResponse } from "next/server";

/**
 * 获取资产统计数据
 * 返回总数、各状态数量、即将到期数量、品类分布等
 */
export async function GET() {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      inUse,
      available,
      maintenance,
      scrapped,
      expiring,
      categoryGroups,
    ] = await Promise.all([
      db.asset.count(),
      db.asset.count({ where: { status: "IN_USE" } }),
      db.asset.count({ where: { status: "IDLE" } }),
      db.asset.count({ where: { status: "MAINTENANCE" } }),
      db.asset.count({ where: { status: "SCRAPPED" } }),
      db.asset.count({
        where: {
          warrantyExpiry: { gte: now, lte: thirtyDaysLater },
          status: { not: "SCRAPPED" },
        },
      }),
      db.categoryGroup.findMany({
        select: { id: true, name: true, label: true },
      }),
    ]);

    // 按品类统计资产数量
    const categoryDistribution = await Promise.all(
      categoryGroups.map(async (cg) => {
        const count = await db.asset.count({
          where: { categoryGroupId: cg.id },
        });
        return {
          category: cg.name,
          label: cg.label,
          count,
        };
      }),
    );

    return NextResponse.json({
      total,
      inUse,
      available,
      maintenance,
      scrapped,
      expiring,
      categoryDistribution: categoryDistribution
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
