import { db } from "@/lib/db/client";
import type { AssetCategory } from "@/modules/assets/types";
import * as XLSX from "xlsx";

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
  [key: string]: string | undefined;
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

interface PreviewResult {
  validRows: ImportRow[];
  invalidRows: { row: number; data: ImportRow; error: string }[];
}

interface CustomFieldDef {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  options: string | null;
  required: boolean;
}

const FIXED_HEADERS = [
  { key: "assetNo", label: "资产编号" },
  { key: "name", label: "资产名称" },
  { key: "category", label: "品类" },
  { key: "model", label: "型号" },
  { key: "brand", label: "品牌" },
  { key: "purchaseDate", label: "购置日期" },
  { key: "warrantyExpiry", label: "维保截止日" },
  { key: "location", label: "存放位置" },
  { key: "value", label: "设备价值" },
  { key: "description", label: "备注" },
];

const VALID_CATEGORIES = ["PC", "PERIPHERAL", "NETWORK", "SERVER_STORAGE", "MOBILE", "MEETING", "SECURITY_DEVICE", "SECURITY_DOCUMENT", "CUSTOM"];

const CATEGORY_LABEL_MAP: Record<string, string> = {
  "办公电脑": "PC",
  "PC": "PC",
  "台式机": "PC",
  "笔记本": "PC",
  "电脑": "PC",
  "外设配件": "PERIPHERAL",
  "PERIPHERAL": "PERIPHERAL",
  "外设": "PERIPHERAL",
  "网络设备": "NETWORK",
  "NETWORK": "NETWORK",
  "服务器/存储": "SERVER_STORAGE",
  "SERVER_STORAGE": "SERVER_STORAGE",
  "服务器": "SERVER_STORAGE",
  "存储": "SERVER_STORAGE",
  "移动设备": "MOBILE",
  "MOBILE": "MOBILE",
  "手机": "MOBILE",
  "平板": "MOBILE",
  "会议设备": "MEETING",
  "MEETING": "MEETING",
  "网络安全设备": "SECURITY_DEVICE",
  "SECURITY_DEVICE": "SECURITY_DEVICE",
  "安防设备": "SECURITY_DEVICE",
  "安全文档": "SECURITY_DOCUMENT",
  "SECURITY_DOCUMENT": "SECURITY_DOCUMENT",
  "自定义类型": "CUSTOM",
  "CUSTOM": "CUSTOM",
  "自定义": "CUSTOM",
};

function normalizeCategory(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (VALID_CATEGORIES.includes(trimmed)) return trimmed;
  const mapped = CATEGORY_LABEL_MAP[trimmed];
  if (mapped) return mapped;
  const upper = trimmed.toUpperCase();
  if (VALID_CATEGORIES.includes(upper)) return upper;
  return null;
}

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

function validateRow(row: ImportRow, lineNumber: number, customFields: CustomFieldDef[]): string | null {
  if (!row.assetNo || row.assetNo.trim() === "") return `第 ${lineNumber} 行: 资产编号为必填项`;
  if (row.assetNo.length > 50) return `第 ${lineNumber} 行: 资产编号超过50字符`;
  if (!row.name || row.name.trim() === "") return `第 ${lineNumber} 行: 资产名称为必填项`;
  if (row.name.length > 200) return `第 ${lineNumber} 行: 资产名称超过200字符`;
  if (row.category && !normalizeCategory(row.category)) {
    return `第 ${lineNumber} 行: 无效的品类 "${row.category}"，可选值：PC/台式机/笔记本、PERIPHERAL/外设、NETWORK/网络设备、SERVER_STORAGE/服务器/存储、MOBILE/移动设备/手机/平板、MEETING/会议设备、SECURITY_DEVICE/安防设备、SECURITY_DOCUMENT/安全文档、CUSTOM/自定义`;
  }
  if (row.purchaseDate && isNaN(Date.parse(row.purchaseDate))) return `第 ${lineNumber} 行: 购置日期格式无效`;
  if (row.warrantyExpiry && isNaN(Date.parse(row.warrantyExpiry))) return `第 ${lineNumber} 行: 维保截止日格式无效`;
  if (row.value && isNaN(Number(row.value))) return `第 ${lineNumber} 行: 设备价值不是有效数字`;
  if (row.location && row.location.length > 100) return `第 ${lineNumber} 行: 存放位置超过100字符`;

  for (const cf of customFields) {
    if (cf.required) {
      const val = row[`cf_${cf.name}`];
      if (!val || val.trim() === "") {
        return `第 ${lineNumber} 行: 自定义字段"${cf.label}"为必填项`;
      }
    }
  }

  return null;
}

async function getCustomFields(categoryGroupId?: string): Promise<CustomFieldDef[]> {
  if (!categoryGroupId) return [];
  const fields = await db.customField.findMany({
    where: { categoryGroupId },
    orderBy: { sortOrder: "asc" },
  });
  return fields;
}

/**
 * 预览导入数据，验证并分类有效/无效行
 * @param rows - 解析后的行数据数组
 * @param customFields - 自定义字段定义列表
 * @param categoryGroupId - 设备类型 ID
 * @param branchId - 当前用户所属分支 ID
 * @returns 预览结果（有效行和无效行）
 */
export async function previewImport(
  rows: ImportRow[],
  customFields: CustomFieldDef[],
  categoryGroupId?: string,
  branchId?: string,
): Promise<PreviewResult> {
  const validRows: ImportRow[] = [];
  const invalidRows: { row: number; data: ImportRow; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNumber = i + 2;

    const validationError = validateRow(row, lineNumber, customFields);
    if (validationError) {
      invalidRows.push({ row: lineNumber, data: row, error: validationError });
      continue;
    }

    // 检查资产编号是否已存在
    try {
      const existing = await db.asset.findUnique({ where: { assetNo: row.assetNo } });
      if (existing) {
        invalidRows.push({
          row: lineNumber,
          data: row,
          error: `第 ${lineNumber} 行: 资产编号 "${row.assetNo}" 已存在`,
        });
        continue;
      }
    } catch {
      // 查询失败时继续
    }

    validRows.push(row);
  }

  return { validRows, invalidRows };
}

/**
 * 生成 CSV 模板内容，根据设备类型动态添加自定义字段列
 * @param categoryGroupId - 可选的设备类型 ID，传入后模板会包含该类型的自定义字段列
 * @returns CSV 模板字符串（含 BOM 头，兼容 Excel 中文显示）
 */
export async function getCSVTemplate(categoryGroupId?: string): Promise<string> {
  const customFields = await getCustomFields(categoryGroupId);

  const headers = [...FIXED_HEADERS.map((h) => h.label)];
  for (const cf of customFields) {
    headers.push(cf.label);
  }

  const exampleRow = [
    "PC-2026-001",
    "ThinkPad X1 Carbon",
    "PC",
    "20XS",
    "联想",
    "2026-01-15",
    "2029-01-15",
    "3楼办公室",
    "8999.00",
    "新员工入职设备",
  ];
  for (const cf of customFields) {
    if (cf.fieldType === "SELECT" && cf.options) {
      exampleRow.push(cf.options.split(",")[0].trim());
    } else if (cf.fieldType === "BOOLEAN") {
      exampleRow.push("是");
    } else if (cf.fieldType === "NUMBER") {
      exampleRow.push("0");
    } else if (cf.fieldType === "DATE") {
      exampleRow.push("2026-01-15");
    } else {
      exampleRow.push("示例值");
    }
  }

  const categoryOptions = [
    "# 品类可选值（支持中文或英文代码）：",
    "# PC / 台式机 / 笔记本 / 电脑",
    "# PERIPHERAL / 外设",
    "# NETWORK / 网络设备",
    "# SERVER_STORAGE / 服务器 / 存储",
    "# MOBILE / 移动设备 / 手机 / 平板",
    "# MEETING / 会议设备",
    "# SECURITY_DEVICE / 安防设备",
    "# SECURITY_DOCUMENT / 安全文档",
    "# CUSTOM / 自定义",
    "",
  ];

  const csvContent = headers.join(",") + "\n" + exampleRow.join(",") + "\n" + categoryOptions.join("\n");
  return "\uFEFF" + csvContent;
}

/**
 * 解析 CSV 内容，返回结构化行数据（含自定义字段列）
 * @param csvContent - CSV 文件文本内容
 * @param customFields - 自定义字段定义列表，用于解析 cf_ 前缀的列
 * @returns 解析后的行数据数组
 */
export function parseCSV(csvContent: string, customFields: CustomFieldDef[]): ImportRow[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));

  const labelToKey: Record<string, string> = {};
  for (const h of FIXED_HEADERS) {
    labelToKey[h.label] = h.key;
  }
  for (const cf of customFields) {
    labelToKey[cf.label] = `cf_${cf.name}`;
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      const key = labelToKey[h] ?? h;
      row[key] = (values[idx] ?? "").trim();
    });
    rows.push(row as ImportRow);
  }

  return rows;
}

/**
 * 解析 Excel 文件内容，返回结构化行数据
 * @param buffer - Excel 文件的 ArrayBuffer
 * @param customFields - 自定义字段定义列表
 * @returns 解析后的行数据数组
 */
export function parseExcel(buffer: ArrayBuffer, customFields: CustomFieldDef[]): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | boolean | null | undefined)[][];

  if (jsonData.length < 2) return [];

  const labelToKey: Record<string, string> = {};
  for (const h of FIXED_HEADERS) {
    labelToKey[h.label] = h.key;
  }
  for (const cf of customFields) {
    labelToKey[cf.label] = `cf_${cf.name}`;
  }

  const firstRowFilled = (jsonData[0] as unknown[]).filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length;
  const secondRowFilled = (jsonData[1] as unknown[]).filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length;
  const hasTitleRow = firstRowFilled < secondRowFilled && firstRowFilled <= 2;

  const headerRowIndex = hasTitleRow ? 1 : 0;
  const headerRow = jsonData[headerRowIndex] as string[];

  const rows: ImportRow[] = [];
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const values = jsonData[i];
    if (!values || values.every((v) => v === null || v === undefined || v === "")) continue;

    const row: Record<string, string> = {};
    headerRow.forEach((h, idx) => {
      const key = labelToKey[h] ?? h;
      const val = values[idx];
      row[key] = val !== null && val !== undefined ? String(val).trim() : "";
    });
    rows.push(row as ImportRow);
  }

  return rows;
}

/**
 * 判断文件是否为 Excel 格式
 * @param filename - 文件名
 * @returns 是否为 Excel 文件
 */
export function isExcelFile(filename: string): boolean {
  return filename.endsWith(".xlsx") || filename.endsWith(".xls");
}

/**
 * 批量导入资产，支持自定义字段值
 * @param rows - 解析后的行数据数组
 * @param categoryGroupId - 设备类型 ID，用于关联自定义字段
 * @param branchId - 当前用户所属分支 ID
 * @param createdBy - 当前用户 ID
 * @param importBatchId - 导入批次 ID
 * @returns 导入结果（总数、成功数、失败数、错误详情）
 */
export async function importAssets(
  rows: ImportRow[],
  categoryGroupId?: string,
  branchId?: string,
  createdBy?: string,
  importBatchId?: string,
): Promise<ImportResult> {
  const errors: ImportError[] = [];
  let success = 0;

  const customFields = await getCustomFields(categoryGroupId);
  const fieldNameToField: Record<string, CustomFieldDef> = {};
  for (const cf of customFields) {
    fieldNameToField[cf.name] = cf;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNumber = i + 2;

    const validationError = validateRow(row, lineNumber, customFields);
    if (validationError) {
      errors.push({ row: lineNumber, message: validationError });
      continue;
    }

    try {
      const existing = await db.asset.findUnique({ where: { assetNo: row.assetNo } });
      if (existing) {
        errors.push({ row: lineNumber, message: `第 ${lineNumber} 行: 资产编号 "${row.assetNo}" 已存在` });
        continue;
      }

      const data: Record<string, unknown> = {
        assetNo: row.assetNo,
        name: row.name,
        category: normalizeCategory(row.category || "") || "PC" as AssetCategory,
        model: row.model || null,
        brand: row.brand || null,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
        warrantyExpiry: row.warrantyExpiry ? new Date(row.warrantyExpiry) : null,
        location: row.location || null,
        value: row.value ? Number(row.value) : null,
        description: row.description || null,
        status: "IDLE",
      };

      if (branchId) data.branchId = branchId;
      if (createdBy) data.createdBy = createdBy;
      if (categoryGroupId) data.categoryGroupId = categoryGroupId;
      if (importBatchId) data.importBatchId = importBatchId;

      const asset = await db.asset.create({ data: data as never });

      const cfValues: { assetId: string; fieldId: string; value: string }[] = [];
      for (const cf of customFields) {
        const val = row[`cf_${cf.name}`];
        if (val && val.trim() !== "") {
          cfValues.push({ assetId: asset.id, fieldId: cf.id, value: val.trim() });
        }
      }
      if (cfValues.length > 0) {
        await db.customFieldValue.createMany({ data: cfValues });
      }

      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      errors.push({ row: lineNumber, message: `第 ${lineNumber} 行: 导入失败 - ${msg}` });
    }
  }

  return { total: rows.length, success, failed: errors.length, errors };
}
