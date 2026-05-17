import { importAssets, parseCSV, parseExcel, isExcelFile, previewImport } from "@/modules/assets/import";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { writeAuditLog } from "@/lib/db/audit";
import { db } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 批量导入资产 API
 * 支持三种模式：
 * 1. preview - 预览模式：解析文件返回数据预览，不实际导入
 * 2. confirm - 确认导入：传入预览时返回的 batchId，执行实际导入
 * 3. revoke - 撤销导入：传入 batchId，删除该批次导入的所有资产
 *
 * @param request - Next.js 请求对象
 * @returns 返回导入结果或预览数据的 JSON 响应
 */
export async function POST(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const formData = await request.formData();
    const action = (formData.get("action") as string) || "preview";
    const batchId = (formData.get("batchId") as string) || undefined;

    // 撤销导入
    if (action === "revoke" && batchId) {
      const result = await revokeImport(batchId, user.id, user.username);
      return NextResponse.json(result);
    }

    // 确认导入
    if (action === "confirm" && batchId) {
      const result = await confirmImport(batchId, user.id, user.username);
      return NextResponse.json(result);
    }

    // 预览模式（默认）
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

    // 预览：验证数据并生成 batchId
    const preview = await previewImport(rows, customFields, categoryGroupId, user.branchId ?? undefined);

    // 将预览数据暂存到数据库（创建待确认的导入批次）
    const batch = await db.importBatch.create({
      data: {
        status: "PENDING",
        totalRows: rows.length,
        validRows: preview.validRows.length,
        invalidRows: preview.invalidRows.length,
        previewData: JSON.stringify(preview),
        categoryGroupId: categoryGroupId || null,
        branchId: user.branchId || null,
        createdBy: user.id,
      },
    });

    return NextResponse.json({
      batchId: batch.id,
      preview: true,
      total: rows.length,
      validCount: preview.validRows.length,
      invalidCount: preview.invalidRows.length,
      validRows: preview.validRows.slice(0, 10),
      invalidRows: preview.invalidRows.slice(0, 10),
      hasMore: preview.validRows.length > 10 || preview.invalidRows.length > 10,
    });
  } catch (error) {
    console.error("导入资产失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 确认执行导入
 * @param batchId - 导入批次 ID
 * @param userId - 当前用户 ID
 * @param username - 当前用户名
 */
async function confirmImport(batchId: string, userId: string, username: string) {
  const batch = await db.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return { error: "NOT_FOUND", message: "导入批次不存在" };
  }
  if (batch.status !== "PENDING") {
    return { error: "INVALID_STATUS", message: `该批次已${batch.status === "COMPLETED" ? "完成" : "撤销"}，无法重复操作` };
  }

  const preview = JSON.parse(batch.previewData as string);
  const rows = preview.validRows;

  if (rows.length === 0) {
    await db.importBatch.update({ where: { id: batchId }, data: { status: "COMPLETED" } });
    return { batchId, total: 0, success: 0, failed: 0, errors: [], message: "没有有效数据可导入" };
  }

  const result = await importAssets(rows, batch.categoryGroupId ?? undefined, batch.branchId ?? undefined, userId, batchId);

  await db.importBatch.update({
    where: { id: batchId },
    data: {
      status: "COMPLETED",
      successCount: result.success,
      failedCount: result.failed,
      resultData: JSON.stringify(result),
      completedAt: new Date(),
    },
  });

  writeAuditLog({
    userId,
    username,
    action: "IMPORT_ASSETS",
    targetType: "ASSET",
    detail: `批量导入资产(批次${batchId}): 共${result.total}条, 成功${result.success}条, 失败${result.failed}条`,
  }).catch(() => {});

  return { ...result, batchId };
}

/**
 * 撤销导入批次
 * @param batchId - 导入批次 ID
 * @param userId - 当前用户 ID
 * @param username - 当前用户名
 */
async function revokeImport(batchId: string, userId: string, username: string) {
  const batch = await db.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return { error: "NOT_FOUND", message: "导入批次不存在" };
  }
  if (batch.status !== "COMPLETED") {
    return { error: "INVALID_STATUS", message: `该批次状态为${batch.status}，无法撤销` };
  }

  // 获取该批次导入的所有资产
  const assets = await db.asset.findMany({
    where: { importBatchId: batchId },
    select: { id: true, assetNo: true },
  });

  if (assets.length === 0) {
    await db.importBatch.update({ where: { id: batchId }, data: { status: "REVOKED" } });
    return { batchId, revokedCount: 0, message: "该批次无资产可撤销" };
  }

  const assetIds = assets.map((a) => a.id);

  // 删除关联数据（自定义字段值、文档、审批记录等）
  await db.customFieldValue.deleteMany({ where: { assetId: { in: assetIds } } });
  await db.assetDocument.deleteMany({ where: { assetId: { in: assetIds } } });
  await db.approval.deleteMany({ where: { assetId: { in: assetIds } } });

  // 删除资产
  const deleted = await db.asset.deleteMany({ where: { id: { in: assetIds } } });

  await db.importBatch.update({
    where: { id: batchId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  writeAuditLog({
    userId,
    username,
    action: "REVOKE_IMPORT",
    targetType: "ASSET",
    detail: `撤销导入批次${batchId}: 删除${deleted.count}条资产`,
  }).catch(() => {});

  return { batchId, revokedCount: deleted.count, message: `成功撤销导入，删除了 ${deleted.count} 条资产` };
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
