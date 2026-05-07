export const APPROVAL_TYPES = ["BORROW", "RETURN", "TRANSFER", "SCRAP"] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "EXECUTED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const TYPE_LABELS: Record<ApprovalType, string> = {
  BORROW: "领用申请",
  RETURN: "归还申请",
  TRANSFER: "调拨申请",
  SCRAP: "报废申请",
};

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "待审批",
  APPROVED: "待执行",
  REJECTED: "已驳回",
  EXECUTED: "已完成",
};

export const STATUS_COLORS: Record<ApprovalStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  EXECUTED: "bg-green-100 text-green-800",
};

export interface ApprovalInfo {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  assetId: string;
  asset: { id: string; assetNo: string; name: string; category: string };
  applicantId: string;
  applicant: { id: string; realName: string; username: string } | null;
  approverId: string | null;
  approver: { id: string; realName: string } | null;
  executorId: string | null;
  executor: { id: string; realName: string } | null;
  reason: string | null;
  rejectReason: string | null;
  operatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
