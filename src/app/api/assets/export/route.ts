import { getAssetList, getAssetById } from "@/modules/assets/services";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";
import type { AssetStatus, AssetCategory, AssetInfo } from "@/modules/assets/types";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/modules/assets/types";

/**
 * 将日期值格式化为中文本地化日期格式
 * @param d - Date 对象、ISO 日期字符串或 null
 * @returns 格式化后的日期字符串，输入为 null 时返回空字符串
 */
function formatDate(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("zh-CN");
}

/**
 * 导出资产数据，支持 CSV 和 JSON 格式，支持按 ID 列表或筛选条件导出
 * @param request - Next.js 请求对象，包含查询参数（format, ids, status, category, keyword）
 * @returns 返回 CSV 文件下载响应或 JSON 数据响应，或 500 错误响应
 */
export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const ids = searchParams.get("ids");

    let items: AssetInfo[];

    if (ids) {
      const idList = ids.split(",");
      items = await Promise.all(idList.map((id) => getAssetById(id).then((a) => a!))) as unknown as AssetInfo[];
    } else {
      const result = await getAssetList({
        status: searchParams.get("status") as AssetStatus | undefined,
        category: searchParams.get("category") as AssetCategory | undefined,
        keyword: searchParams.get("keyword") ?? undefined,
        page: 1,
        pageSize: 9999,
      });
      items = result.items as unknown as AssetInfo[];
    }

    if (format === "csv") {
      const header = "资产编号,资产名称,品类,型号,品牌,状态,购置日期,维保截止日,归属人,存放位置,设备价值,备注";
      const rows = items.map((a) =>
        [
          a.assetNo,
          `"${(a.name ?? "").replace(/"/g, '""')}"`,
          CATEGORY_LABELS[a.category as AssetCategory],
          a.model ?? "",
          a.brand ?? "",
          STATUS_LABELS[a.status as AssetStatus],
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
