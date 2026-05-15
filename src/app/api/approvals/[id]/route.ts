import { getApprovalById, reviewApproval, executeApproval, cancelApproval } from "@/modules/approvals/services";
import type { ApprovalType } from "@/modules/approvals/types";
import { requireAuth, requireRole, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取单个审批单详情
 * - 申请人可查看自己的审批
 * - DEPT_MANAGER/BRANCH_ADMIN 可查看同分支的审批
 * - SUPER_ADMIN 可查看所有审批
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const id = (await params).id;
    const approval = await getApprovalById(id);
    if (!approval) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (user.role !== "SUPER_ADMIN") {
      const isApplicant = approval.applicantId === user.id;
      const isSameBranch = user.branchId && approval.asset?.branchId === user.branchId;
      const hasManagementRole = user.role === "BRANCH_ADMIN" || user.role === "DEPT_MANAGER";

      if (!isApplicant && !(isSameBranch && hasManagementRole)) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "无权查看该审批" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ data: approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("获取审批详情失败:", message);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}

/**
 * 处理审批操作（审批通过、审批驳回、执行审批、撤销申请）
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "approve" || action === "reject") {
      const roleError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
      if (roleError) return roleError;

      const result = await reviewApproval(
        id,
        action === "approve" ? "APPROVED" : "REJECTED",
        user.id,
        body.rejectReason,
      );
      return NextResponse.json({ data: result });
    }

    if (action === "execute") {
      const roleError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN");
      if (roleError) return roleError;

      const approval = await getApprovalById(id);
      if (!approval) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      const result = await executeApproval(id, user.id, {
        type: approval.type as ApprovalType,
        assetId: approval.assetId,
        applicantId: approval.applicantId,
      });
      return NextResponse.json({ data: result });
    }

    if (action === "cancel") {
      const result = await cancelApproval(id, user.id);
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "无效的操作类型" },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("处理审批失败:", message, error instanceof Error ? error.stack : "");
    return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
  }
}
