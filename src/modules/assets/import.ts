import { db } from "@/lib/db/client";
import type { AssetCategory } from "@/modules/assets/types";

interface ImportRow {
  assetNo: string;
  name: string;
  model?: string;
  brand?: string;
  category?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  location?: string;
  value?: string;
  description?: string;
}

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: ImportError[];
}

const VALID_CATEGORIES = ["PC","PERIPHERAL","NETWORK","SERVER_STORAGE","MOBILE","MEETING","SECURITY_DEVICE","SECURITY_DOCUMENT","CUSTOM"];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function validateRow(row: ImportRow, lineNumber: number): string | null {
  if (!row.assetNo || row.assetNo.trim() === "") return `第 ${lineNumber} 行: 资产编号为必填项`;
  if (row.assetNo.length > 50) return `第 ${lineNumber} 行: 资产编号超过50字符`;
  if (!row.name || row.name.trim() === "") return `第 ${lineNumber} 行: 资产名称为必填项`;
  if (row.name.length > 200) return `第 ${lineNumber} 行: 资产名称超过200字符`;
  if (row.category && !VALID_CATEGORIES.includes(row.category)) {
    return `第 ${lineNumber} 行: 无效的品类 "${row.category}"，可选: ${VALID_CATEGORIES.join("/")}`;
  }
  if (row.purchaseDate && isNaN(Date.parse(row.purchaseDate))) return `第 ${lineNumber} 行: 购置日期格式无效`;
  if (row.warrantyExpiry && isNaN(Date.parse(row.warrantyExpiry))) return `第 ${lineNumber} 行: 维保截止日格式无效`;
  if (row.value && isNaN(Number(row.value))) return `第 ${lineNumber} 行: 设备价值不是有效数字`;
  if (row.location && row.location.length > 100) return `第 ${lineNumber} 行: 存放位置超过100字符`;
  return null;
}

/**
 * 解析 CSV 内容并返回结构化行数据
 */
export function parseCSV(csvContent: string): ImportRow[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row as unknown as ImportRow);
  }

  return rows;
}

/**
 * CSV 模板内容
 */
export function getCSVTemplate(): string {
  return (
    "资产编号,资产名称,品类,型号,品牌,购置日期,维保截止日,存放位置,设备价值,备注\n" +
    "PC-2026-001,ThinkPad X1 Carbon,PC,20XS,联想,2026-01-15,2029-01-15,3楼办公室,8999.00,新员工入职设备\n" +
    "NET-2026-001,华为交换机 S5735,NETWORK,S5735-L24T4X,华为,2025-06-01,2028-06-01,1楼机房,3500.00,核心交换机\n"
  );
}

/**
 * 批量导入资产，返回详细的导入结果
 */
export async function importAssets(
  rows: ImportRow[],
  branchId?: string,
  createdBy?: string,
): Promise<ImportResult> {
  const errors: ImportError[] = [];
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNumber = i + 2;

    const validationError = validateRow(row, lineNumber);
    if (validationError) {
      errors.push({ row: lineNumber, message: validationError });
      continue;
    }

    try {
      // 检查资产编号是否已存在
      const existing = await db.asset.findUnique({ where: { assetNo: row.assetNo } });
      if (existing) {
        errors.push({ row: lineNumber, message: `第 ${lineNumber} 行: 资产编号 "${row.assetNo}" 已存在` });
        continue;
      }

      const data: Record<string, unknown> = {
        assetNo: row.assetNo,
        name: row.name,
        category: (row.category ?? "PC") as AssetCategory,
        model: row.model ?? null,
        brand: row.brand ?? null,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
        location: row.location ?? null,
        value: row.value ? Number(row.value) : null,
        description: row.description ?? null,
        status: "IDLE",
      };

      if (branchId) data.branchId = branchId;
      if (createdBy) data.createdBy = createdBy;

      await db.asset.create({ data: data as Parameters<typeof db.asset.create>[0]["data"] });
      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      errors.push({ row: lineNumber, message: `第 ${lineNumber} 行: 导入失败 - ${msg}` });
    }
  }

  return { total: rows.length, success, failed: errors.length, errors };
}
