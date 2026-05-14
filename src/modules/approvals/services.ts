import { db } from "@/lib/db/client";
import type { ApprovalType, ApprovalStatus, ApprovalInfo } from "./types";

/**
 * 创建审批申请
 */
export async function createApproval(data: {
  type: ApprovalType;
  assetId: string;
  applicantId: string;
  reason?: string;
}) {
  return db.approval.create({
    data: {
      type: data.type,
      assetId: data.assetId,
      applicantId: data.applicantId,
      reason: data.reason,
      status: "PENDING",
    },
    include: {
      asset: { select: { id: true, assetNo: true, name: true, category: true } },
      applicant: { select: { id: true, realName: true, username: true } },
    },
  });
}

/**
 * 查询审批列表（多视角复用）
 * @param view "my"=我的申请 / "pending"=待我审批 / "execute"=待我执行 / "all"=全部
 * @param userId 当前用户ID
 * @param branchId 当前用户分支ID（限制数据范围）
 * @param status 按状态筛选
 */
export async function getApprovals(params: {
  view: "my" | "pending" | "execute" | "all";
  userId: string;
  branchId?: string | null;
  status?: ApprovalStatus;
  page?: number;
  pageSize?: number;
}) {
  const { view, userId, branchId, status, page = 1, pageSize = 20 } = params;

  const where: {
    applicantId?: string;
    approverId?: string;
    executorId?: string;
    status?: ApprovalStatus;
    asset?: { branchId: string };
  } = {};

  if (branchId) {
    where.asset = { branchId };
  }

  if (view === "my") {
    where.applicantId = userId;
  } else if (view === "pending") {
    where.approverId = userId;
    where.status = "PENDING";
  } else if (view === "execute") {
    where.executorId = userId;
    where.status = "APPROVED";
  }

  if (status && (view === "my" || view === "all")) {
    where.status = status;
  }

  const [total, items] = await Promise.all([
    db.approval.count({ where: where as Record<string, unknown> }),
    db.approval.findMany({
      where: where as Record<string, unknown>,
      include: {
        asset: { select: { id: true, assetNo: true, name: true, category: true } },
        applicant: { select: { id: true, realName: true, username: true } },
        approver: { select: { id: true, realName: true } },
        executor: { select: { id: true, realName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items: items as unknown as ApprovalInfo[] };
}

/**
 * 获取单个审批详情
 */
export async function getApprovalById(id: string) {
  return db.approval.findUnique({
    where: { id },
    include: {
      asset: {
        select: {
          id: true,
          assetNo: true,
          name: true,
          model: true,
          category: true,
          status: true,
          location: true,
          branch: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, realName: true } },
        },
      },
      applicant: { select: { id: true, realName: true, username: true, department: { select: { id: true, name: true } } } },
      approver: { select: { id: true, realName: true } },
      executor: { select: { id: true, realName: true } },
    },
  });
}

/**
 * 审批操作（通过/驳回）
 */
export async function reviewApproval(
  id: string,
  decision: "APPROVED" | "REJECTED",
  approverId: string,
  rejectReason?: string,
) {
  const updateData: Record<string, unknown> = {
    status: decision,
    approverId,
    rejectReason: decision === "REJECTED" ? rejectReason ?? null : null,
    operatedAt: decision === "REJECTED" ? new Date() : undefined,
  };

  return db.approval.update({
    where: { id },
    data: updateData,
    include: {
      asset: { select: { id: true, name: true, status: true } },
      applicant: { select: { id: true, realName: true } },
    },
  });
}

/**
 * IT 管理员执行操作
 */
export async function executeApproval(
  id: string,
  executorId: string,
  action: {
    type: ApprovalType;
    assetId: string;
    applicantId: string;
  },
) {
  // 1. 更新审批状态
  const approval = await db.approval.update({
    where: { id },
    data: {
      status: "EXECUTED",
      executorId,
      operatedAt: new Date(),
    },
  });

  // 2. 更新资产状态和归属
  const assetUpdates: Record<string, unknown> = {};

  if (action.type === "BORROW") {
    assetUpdates.status = "IN_USE";
    assetUpdates.assignedUserId = action.applicantId;
  } else if (action.type === "RETURN") {
    assetUpdates.status = "IDLE";
    assetUpdates.assignedUserId = null;
  } else if (action.type === "SCRAP") {
    assetUpdates.status = "SCRAPPED";
    assetUpdates.assignedUserId = null;
  }

  if (Object.keys(assetUpdates).length > 0) {
    await db.asset.update({
      where: { id: action.assetId },
      data: assetUpdates,
    });
  }

  return approval;
}
