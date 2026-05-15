import { db } from "@/lib/db/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/zip",
  "application/x-rar-compressed",
];
const BLOCKED_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".msi", ".dll", ".scr"];

/**
 * 获取指定分类组的所有共享文档
 * @param categoryGroupId - 分类组 ID
 * @returns 文档列表
 */
export async function getCategoryDocuments(categoryGroupId: string) {
  return db.categoryDocument.findMany({
    where: { categoryGroupId },
    include: { uploader: { select: { id: true, realName: true } } },
    orderBy: { uploadedAt: "desc" },
  });
}

/**
 * 获取资产所属分类的共享文档（通过资产的 categoryGroupId 关联）
 * @param assetId - 资产 ID
 * @returns 共享文档列表
 */
export async function getSharedDocumentsForAsset(assetId: string) {
  const asset = await db.asset.findUnique({
    where: { id: assetId },
    select: { categoryGroupId: true },
  });
  if (!asset?.categoryGroupId) return [];
  return getCategoryDocuments(asset.categoryGroupId);
}

/**
 * 上传分类共享文档
 * @param categoryGroupId - 分类组 ID
 * @param name - 文档显示名称
 * @param file - 上传的文件对象
 * @param uploadedBy - 上传用户 ID
 * @returns 创建后的文档记录
 */
export async function uploadCategoryDocument(
  categoryGroupId: string,
  name: string,
  file: File,
  uploadedBy?: string,
) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件大小超过限制（最大 50MB），当前文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`不支持的文件类型: ${file.type}`);
  }

  const ext = path.extname(file.name).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new Error(`禁止上传可执行文件: ${ext}`);
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "category", categoryGroupId);
  await mkdir(uploadDir, { recursive: true });

  const timestamp = Date.now();
  const safeName = `${timestamp}-${file.name}`;
  const filePath = path.join(uploadDir, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const relativePath = `/uploads/category/${categoryGroupId}/${safeName}`;

  return db.categoryDocument.create({
    data: {
      categoryGroupId,
      name,
      fileName: file.name,
      filePath: relativePath,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: uploadedBy ?? null,
    },
    include: { uploader: { select: { id: true, realName: true } } },
  });
}

/**
 * 删除分类共享文档
 * @param id - 文档 ID
 * @returns 被删除的文档记录
 */
export async function deleteCategoryDocument(id: string) {
  return db.categoryDocument.delete({ where: { id } });
}
