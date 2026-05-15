import { db } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/audit";
import type { ApprovalType, ApprovalStatus, ApprovalInfo } from "./types";

/**
 * 创建审批申请，BORROW类型自动将资产置为"领用中"
 * @param data.type - 审批类型（BORROW/RETURN/TRANSFER/SCRAP）
 * @param data.assetId - 资产ID
 * @param data.applicantId - 申请人ID
 * @param data.reason - 申请原因
 */
export async function createApproval(data: {
  type: ApprovalType;
  assetId: string;
  applicantId: string;
  reason?: string;
}) {
  const asset = await db.asset.findUnique({ where: { id: data.assetId }, select: { status: true, name: true } });
  if (!asset) throw new Error("资产不存在");

  if (data.type === "BORROW" && asset.status !== "IDLE") {
    throw new Error(`资产 "${asset.name}" 当前不可领用（状态: ${asset.status}）`);
  }

  const approval = await db.approval.create({
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

  if (data.type === "BORROW") {
    await db.asset.update({
      where: { id: data.assetId },
      data: { status: "BORROWING" },
    });
  }

  writeAuditLog({
    userId: data.applicantId,
    action: "CREATE_APPROVAL",
    targetType: "APPROVAL",
    targetId: approval.id,
    detail: `创建${approval.type}审批申请: ${approval.asset.name}(${approval.asset.assetNo})`,
  }).catch(() => {});

  return approval;
}

/**
 * 查询审批列表（多视角复用）
 * @param view "my"=我的申请 / "pending"=待审批(部门级) / "execute"=待我执行 / "all"=全部
 * @param userId 当前用户ID
 * @param branchId 当前用户分支ID（限制数据范围）
 * @param userRole 当前用户角色（控制视图访问）
 * @param status 按状态筛选
 */
export async function getApprovals(params: {
  view: "my" | "pending" | "execute" | "all";
  userId: string;
  branchId?: string | null;
  userRole?: string;
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

  if (view === "my") {
    where.applicantId = userId;
  } else {
    if (branchId) {
      where.asset = { branchId };
    }

    if (view === "pending") {
      where.status = "PENDING";
    } else if (view === "execute") {
      where.executorId = userId;
      where.status = "APPROVED";
    }
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
 * @param id - 审批单ID
 * @param decision - 审批决定（APPROVED 或 REJECTED）
 * @param approverId - 审批人ID
 * @param rejectReason - 驳回原因（仅驳回时需要）
 * @throws 审批状态校验失败、资产不可用时抛出错误
 */
export async function reviewApproval(
  id: string,
  decision: "APPROVED" | "REJECTED",
  approverId: string,
  rejectReason?: string,
) {
  const approval = await db.approval.findUnique({
    where: { id },
    include: { asset: { select: { id: true, status: true, name: true } } },
  });

  if (!approval) {
    throw new Error("审批单不存在");
  }
  if (approval.status !== "PENDING") {
    throw new Error("该审批已处理，无法重复操作");
  }

  if (decision === "APPROVED" && approval.type === "BORROW") {
    if (approval.asset.status !== "BORROWING") {
      throw new Error(`资产 "${approval.asset.name}" 状态异常（当前: ${approval.asset.status}，期望: 领用中）`);
    }
  }

  const updateData: Record<string, unknown> = {
    status: decision,
    approverId,
    rejectReason: decision === "REJECTED" ? rejectReason ?? null : null,
    operatedAt: new Date(),
  };

  const result = await db.approval.update({
    where: { id },
    data: updateData,
    include: {
      asset: { select: { id: true, name: true, status: true } },
      applicant: { select: { id: true, realName: true } },
    },
  });

  if (decision === "REJECTED" && approval.type === "BORROW") {
    await db.asset.update({
      where: { id: approval.assetId },
      data: { status: "IDLE" },
    });
  }

  writeAuditLog({
    userId: approverId,
    action: decision === "APPROVED" ? "APPROVE" : "REJECT",
    targetType: "APPROVAL",
    targetId: id,
    detail: `${decision === "APPROVED" ? "通过" : "驳回"}审批: ${result.asset.name}${decision === "REJECTED" && rejectReason ? ` (原因: ${rejectReason})` : ""}`,
  }).catch(() => {});

  return result;
}

/**
 * IT 管理员执行操作，更新审批单和资产状态
 * @param id - 审批单ID
 * @param executorId - 执行人ID
 * @param action - 操作详情（类型、资产ID、申请人ID等）
 * @throws 审批状态校验失败时抛出错误
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
  const existing = await db.approval.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("审批单不存在");
  }
  if (existing.status !== "APPROVED") {
    throw new Error("只能执行已审批通过的单据");
  }

  const approval = await db.approval.update({
    where: { id },
    data: {
      status: "EXECUTED",
      executorId,
      operatedAt: new Date(),
    },
  });

  const assetUpdates: Record<string, unknown> = {};

  if (action.type === "BORROW") {
    assetUpdates.status = "IN_USE";
    assetUpdates.assignedUserId = action.applicantId;
  } else if (action.type === "RETURN") {
    assetUpdates.status = "IDLE";
    assetUpdates.assignedUserId = null;
  } else if (action.type === "TRANSFER") {
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

  writeAuditLog({
    userId: executorId,
    action: "EXECUTE",
    targetType: "APPROVAL",
    targetId: id,
    detail: `执行${action.type}审批`,
  }).catch(() => {});

  return approval;
}
