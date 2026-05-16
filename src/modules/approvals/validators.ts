import type { ApprovalType, ApprovalStatus } from "./types";

/**
 * 审批流纯逻辑校验函数（不依赖数据库）
 */

/** 校验撤销审批的前置条件 */
export function validateCancelApproval(params: {
  approval: { applicantId: string; status: ApprovalStatus } | null;
  applicantId: string;
}): { valid: boolean; error?: string } {
  const { approval, applicantId } = params;

  if (!approval) {
    return { valid: false, error: "审批单不存在" };
  }
  if (approval.applicantId !== applicantId) {
    return { valid: false, error: "仅申请人可撤销自己的申请" };
  }
  if (approval.status !== "PENDING") {
    return { valid: false, error: "仅待审批状态的申请可撤销" };
  }

  return { valid: true };
}

/** 校验审批操作（通过/驳回）的前置条件 */
export function validateReviewApproval(params: {
  approval: { status: ApprovalStatus; type: ApprovalType; asset: { status: string } } | null;
  decision: "APPROVED" | "REJECTED";
}): { valid: boolean; error?: string } {
  const { approval, decision } = params;

  if (!approval) {
    return { valid: false, error: "审批单不存在" };
  }
  if (approval.status !== "PENDING") {
    return { valid: false, error: "该审批已处理，无法重复操作" };
  }
  if (decision === "APPROVED" && approval.type === "BORROW") {
    if (approval.asset.status !== "BORROWING") {
      return { valid: false, error: `资产状态异常（当前: ${approval.asset.status}，期望: BORROWING）` };
    }
  }

  return { valid: true };
}

/** 校验执行操作的前置条件 */
export function validateExecuteApproval(params: {
  approval: { status: ApprovalStatus } | null;
}): { valid: boolean; error?: string } {
  const { approval } = params;

  if (!approval) {
    return { valid: false, error: "审批单不存在" };
  }
  if (approval.status !== "APPROVED") {
    return { valid: false, error: "只能执行已审批通过的单据" };
  }

  return { valid: true };
}

/** 根据审批类型计算执行后的资产状态变更 */
export function resolveAssetStatusAfterExecution(type: ApprovalType): {
  status: string;
  clearAssignedUser: boolean;
} | null {
  switch (type) {
    case "BORROW":
      return { status: "IN_USE", clearAssignedUser: false };
    case "RETURN":
      return { status: "IDLE", clearAssignedUser: true };
    case "TRANSFER":
      return { status: "IDLE", clearAssignedUser: true };
    case "SCRAP":
      return { status: "SCRAPPED", clearAssignedUser: true };
    default:
      return null;
  }
}

/** 审批状态流转合法性（状态机定义） */
export const APPROVAL_STATUS_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["EXECUTED"],
  REJECTED: [],
  EXECUTED: [],
  CANCELLED: [],
};

/** 校验审批状态流转是否合法 */
export function validateApprovalStatusTransition(from: ApprovalStatus, to: ApprovalStatus): boolean {
  const allowed = APPROVAL_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
