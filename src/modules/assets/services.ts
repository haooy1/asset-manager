import { db } from "@/lib/db/client";
import type {
  AssetStatus, AssetCategory, CreateAssetInput, UpdateAssetInput,
} from "./types";
import { STATUS_TRANSITIONS } from "./types";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface AssetQueryParams {
  branchId?: string;
  status?: AssetStatus;
  category?: AssetCategory;
  keyword?: string;
  page?: number;
  pageSize?: number;
  userRole?: string;
  userId?: string;
}

/**
 * 分页查询资产列表，支持按分支/状态/品类/关键词筛选
 * 普通员工（EMPLOYEE）自动限制为仅查看已分配给自己的资产
 */
export async function getAssetList(params: AssetQueryParams) {
  const { branchId, status, category, keyword, page = 1, pageSize = 20, userRole, userId } = params;

  const where: Record<string, unknown> = {};

  if (userRole === "EMPLOYEE" && userId) {
    where.assignedUserId = userId;
  }

  if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  if (category) where.category = category;
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { assetNo: { contains: keyword, mode: "insensitive" } },
      { model: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    db.asset.count({ where }),
    db.asset.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, realName: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { documents: true, approvals: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

/**
 * 获取单个资产详情
 */
export async function getAssetById(id: string) {
  return db.asset.findUnique({
    where: { id },
    include: {
      assignedUser: { select: { id: true, realName: true, username: true } },
      branch: { select: { id: true, name: true } },
      creator: { select: { id: true, realName: true } },
      documents: true,
      approvals: {
        include: {
          applicant: { select: { id: true, realName: true } },
          approver: { select: { id: true, realName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

/**
 * 创建新资产（入库）
 */
export async function createAsset(input: CreateAssetInput) {
  return db.asset.create({
    data: input,
    include: {
      branch: { select: { id: true, name: true } },
    },
  });
}

/**
 * 更新资产信息
 */
export async function updateAsset(id: string, input: UpdateAssetInput) {
  return db.asset.update({
    where: { id },
    data: input,
    include: {
      assignedUser: { select: { id: true, realName: true } },
      branch: { select: { id: true, name: true } },
    },
  });
}

/**
 * 校验状态流转是否合法
 */
export function validateStatusTransition(from: AssetStatus, to: AssetStatus): boolean {
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * 删除资产
 */
export async function deleteAsset(id: string) {
  return db.asset.delete({ where: { id } });
}

/**
 * 上传资产附件（安全文档等）
 */
export async function uploadDocument(
  assetId: string,
  name: string,
  file: File,
  expiryDate?: string,
) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", assetId);
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  return db.assetDocument.create({
    data: {
      assetId,
      name,
      fileName: file.name,
      filePath: `/uploads/${assetId}/${fileName}`,
      fileType: file.type,
      fileSize: file.size,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });
}

/**
 * 获取资产的所有文档
 */
export async function getAssetDocuments(assetId: string) {
  return db.assetDocument.findMany({
    where: { assetId },
    orderBy: { uploadedAt: "desc" },
  });
}

/**
 * 删除资产文档
 */
export async function deleteDocument(id: string) {
  return db.assetDocument.delete({ where: { id } });
}
