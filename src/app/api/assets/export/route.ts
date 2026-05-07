import { getAssetList, getAssetById } from "@/modules/assets/services";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";
import type { AssetStatus, AssetCategory } from "@/modules/assets/types";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/modules/assets/types";

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("zh-CN");
}

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const ids = searchParams.get("ids");

    let items: Awaited<ReturnType<typeof getAssetList>>["items"];

    if (ids) {
      const idList = ids.split(",");
      items = await Promise.all(idList.map((id) => getAssetById(id).then((a) => a!)));
    } else {
      const result = await getAssetList({
        status: searchParams.get("status") as AssetStatus | undefined,
        category: searchParams.get("category") as AssetCategory | undefined,
        keyword: searchParams.get("keyword") ?? undefined,
        page: 1,
        pageSize: 9999,
      });
      items = result.items;
    }

    if (format === "csv") {
      const header = "资产编号,资产名称,品类,型号,品牌,状态,购置日期,维保截止日,归属人,存放位置,设备价值,备注";
      const rows = items.map((a) =>
        [
          a.assetNo,
          `"${(a.name ?? "").replace(/"/g, '""')}"`,
          CATEGORY_LABELS[a.category],
          a.model ?? "",
          a.brand ?? "",
          STATUS_LABELS[a.status],
          formatDate(a.purchaseDate),
          formatDate(a.warrantyExpiry),
          a.assignedUser?.realName ?? "",
          a.location ?? "",
          a.value ? Number(a.value).toString() : "",
          `"${(a.description ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      );
      const csv = [header, ...rows].join("\n");
      return new Response("\uFEFF" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=asset-export-${new Date().toISOString().slice(0, 10)}.csv`,
        },
      });
    }

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("导出失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
