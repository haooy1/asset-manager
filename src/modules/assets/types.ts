import type { Branch } from "@/modules/org/types";

export const ASSET_STATUS = ["IDLE", "BORROWING", "IN_USE", "MAINTENANCE", "SCRAPPED"] as const;
export type AssetStatus = (typeof ASSET_STATUS)[number];

export const ASSET_CATEGORIES = [
  "PC", "PERIPHERAL", "NETWORK", "SERVER_STORAGE",
  "MOBILE", "MEETING", "SECURITY_DEVICE", "SECURITY_DOCUMENT", "CUSTOM",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const STATUS_LABELS: Record<AssetStatus, string> = {
  IDLE: "闲置",
  BORROWING: "领用中",
  IN_USE: "使用中",
  MAINTENANCE: "维保中",
  SCRAPPED: "已报废",
};

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  PC: "办公电脑",
  PERIPHERAL: "外设配件",
  NETWORK: "网络设备",
  SERVER_STORAGE: "服务器/存储",
  MOBILE: "移动设备",
  MEETING: "会议设备",
  SECURITY_DEVICE: "网络安全设备",
  SECURITY_DOCUMENT: "安全文档",
  CUSTOM: "自定义类型",
};

export const STATUS_COLORS: Record<AssetStatus, string> = {
  IDLE: "bg-green-100 text-green-800",
  BORROWING: "bg-orange-100 text-orange-800",
  IN_USE: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  SCRAPPED: "bg-gray-100 text-gray-800",
};

export interface AssetInfo {
  id: string;
  assetNo: string;
  name: string;
  model: string | null;
  brand: string | null;
  category: AssetCategory;
  status: AssetStatus;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  assignedUserId: string | null;
  assignedUser: { id: string; realName: string } | null;
  branchId: string | null;
  branch: Pick<Branch, "id" | "name"> | null;
  location: string | null;
  value: number | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  categoryGroupId?: string | null;
  categoryGroup?: { id: string; name: string; label: string } | null;
  customFieldValues?: {
    id: string;
    fieldId: string;
    value: string;
    field?: { id: string; name: string; label: string; fieldType: string; options: string | null };
  }[];
  _count?: { documents: number; approvals: number };
}

export interface AssetDocumentInfo {
  id: string;
  assetId: string;
  name: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  expiryDate: string | null;
  uploadedAt: string;
}

export type CreateAssetInput = {
  assetNo: string;
  name: string;
  model?: string;
  brand?: string;
  category: AssetCategory;
  purchaseDate?: string;
  warrantyExpiry?: string;
  branchId?: string;
  location?: string;
  value?: number;
  description?: string;
  createdBy?: string;
  categoryGroupId?: string;
  customFieldValues?: { fieldId: string; value: string }[];
};

export type UpdateAssetInput = Partial<CreateAssetInput> & {
  status?: AssetStatus;
  assignedUserId?: string | null;
};

export const STATUS_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  IDLE: ["BORROWING", "IN_USE", "MAINTENANCE", "SCRAPPED"],
  BORROWING: ["IN_USE", "IDLE"],
  IN_USE: ["IDLE", "MAINTENANCE", "SCRAPPED"],
  MAINTENANCE: ["IDLE", "IN_USE", "SCRAPPED"],
  SCRAPPED: [],
};
