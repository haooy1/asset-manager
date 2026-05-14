import { importAssets, parseCSV, getCSVTemplate } from "@/modules/assets/import";
import { getAssetList } from "@/modules/assets/services";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 通过 CSV 文件批量导入资产
 * @param request - Next.js 请求对象，包含 FormData（file）
 * @returns 返回导入结果的 JSON 响应，或 400/401/500 错误响应
 */
export async function POST(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "请上传CSV文件" }, { status: 400 });
    }

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "CSV文件中无有效数据行" }, { status: 400 });
    }

    if (rows.length > 1000) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "单次导入最多1000行" }, { status: 400 });
    }

    const result = await importAssets(rows, user.branchId ?? undefined, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("导入资产失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 获取 CSV 导入模板文件
 * @returns 返回 CSV 模板文件的下载响应，或 500 错误响应
 */
export async function GET() {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const template = getCSVTemplate();
    return new Response(template, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=import-template.csv",
      },
    });
  } catch (error) {
    console.error("获取导入模板失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
