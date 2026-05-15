import { importAssets, parseCSV, parseExcel, isExcelFile } from "@/modules/assets/import";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { writeAuditLog } from "@/lib/db/audit";
import { db } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 通过 CSV/Excel 文件批量导入资产（支持自定义字段）
 * @param request - Next.js 请求对象，包含 FormData（file, categoryGroupId）
 * @returns 返回导入结果的 JSON 响应
 */
export async function POST(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const categoryGroupId = (formData.get("categoryGroupId") as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "请上传CSV或Excel文件" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".csv") && !filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "仅支持 CSV、XLSX、XLS 格式文件" }, { status: 400 });
    }

    let customFields: { id: string; name: string; label: string; fieldType: string; options: string | null; required: boolean }[] = [];
    if (categoryGroupId) {
      customFields = await db.customField.findMany({
        where: { categoryGroupId },
        orderBy: { sortOrder: "asc" },
      });
    }

    let rows;
    if (isExcelFile(filename)) {
      const buffer = await file.arrayBuffer();
      rows = parseExcel(buffer, customFields);
    } else {
      const content = await file.text();
      rows = parseCSV(content, customFields);
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "文件中无有效数据行" }, { status: 400 });
    }

    if (rows.length > 1000) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "单次导入最多1000行" }, { status: 400 });
    }

    const result = await importAssets(rows, categoryGroupId, user.branchId ?? undefined, user.id);

    writeAuditLog({
      userId: user.id,
      username: user.username,
      action: "IMPORT_ASSETS",
      targetType: "ASSET",
      detail: `批量导入资产: 共${result.total}条, 成功${result.success}条, 失败${result.failed}条`,
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    console.error("导入资产失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 获取 Excel 导入模板文件（带品类下拉框）
 * @returns 返回 Excel 模板文件的下载响应
 */
export async function GET() {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const templatePath = join(process.cwd(), "public", "templates", "asset-import-template.xlsx");
    const fileBuffer = readFileSync(templatePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=asset-import-template.xlsx",
      },
    });
  } catch (error) {
    console.error("获取导入模板失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
