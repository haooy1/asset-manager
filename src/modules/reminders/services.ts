import { db } from "@/lib/db/client";

export interface ReminderInfo {
  id: string;
  assetNo: string;
  name: string;
  model: string | null;
  brand: string | null;
  category: string;
  status: string;
  warrantyExpiry: string | null;
  branchName: string | null;
  daysUntilExpiry: number;
}

export interface DocumentReminderInfo {
  id: string;
  name: string;
  fileName: string;
  assetId: string;
  assetNo: string;
  assetName: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

/**
 * 扫描即将到期的资产（维保到期）
 */
export async function getWarrantyReminders(daysThreshold = 30): Promise<ReminderInfo[]> {
  const now = new Date();
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  const assets = await db.asset.findMany({
    where: {
      warrantyExpiry: {
        gte: now,
        lte: threshold,
      },
      status: { not: "SCRAPPED" },
    },
    include: {
      branch: { select: { name: true } },
    },
    orderBy: { warrantyExpiry: "asc" },
  });

  return assets.map((a: {
    id: string; assetNo: string; name: string; model: string | null; brand: string | null;
    category: string; status: string; warrantyExpiry: Date | null; branch: { name: string } | null;
  }) => ({
    id: a.id,
    assetNo: a.assetNo,
    name: a.name,
    model: a.model,
    brand: a.brand,
    category: a.category,
    status: a.status,
    warrantyExpiry: a.warrantyExpiry?.toISOString() ?? null,
    branchName: a.branch?.name ?? null,
    daysUntilExpiry: a.warrantyExpiry
      ? Math.ceil((a.warrantyExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0,
  }));
}

/**
 * 扫描已过期的资产（维保已过但未报废）
 */
export async function getExpiredWarrantyAssets() {
  const now = new Date();

  const assets = await db.asset.findMany({
    where: {
      warrantyExpiry: { lt: now },
      status: { not: "SCRAPPED" },
    },
    include: { branch: { select: { name: true } } },
    orderBy: { warrantyExpiry: "asc" },
  });

  return assets.map((a: {
    id: string; assetNo: string; name: string;
    warrantyExpiry: Date | null; branch: { name: string } | null;
  }) => ({
    id: a.id,
    assetNo: a.assetNo,
    name: a.name,
    warrantyExpiry: a.warrantyExpiry?.toISOString() ?? null,
    branchName: a.branch?.name ?? null,
    daysSinceExpiry: a.warrantyExpiry
      ? Math.ceil((now.getTime() - a.warrantyExpiry.getTime()) / (24 * 60 * 60 * 1000))
      : 0,
  }));
}

/**
 * 扫描即将到期的安全文档
 */
export async function getDocumentReminders(daysThreshold = 30): Promise<DocumentReminderInfo[]> {
  const now = new Date();
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  const docs = await db.assetDocument.findMany({
    where: {
      expiryDate: {
        gte: now,
        lte: threshold,
      },
    },
    include: {
      asset: { select: { assetNo: true, name: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  return docs.map((d: {
    id: string; name: string; fileName: string; assetId: string;
    expiryDate: Date | null; asset: { assetNo: string; name: string };
  }) => ({
    id: d.id,
    name: d.name,
    fileName: d.fileName,
    assetId: d.assetId,
    assetNo: d.asset.assetNo,
    assetName: d.asset.name,
    expiryDate: d.expiryDate!.toISOString(),
    daysUntilExpiry: Math.ceil(
      (d.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    ),
  }));
}

/**
 * 扫描已过期的安全文档
 */
export async function getExpiredDocuments() {
  const now = new Date();
  return db.assetDocument.findMany({
    where: { expiryDate: { lt: now } },
    include: { asset: { select: { assetNo: true, name: true } } },
    orderBy: { expiryDate: "asc" },
  });
}
