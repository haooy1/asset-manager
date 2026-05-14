import { getApprovalById, reviewApproval, executeApproval } from "@/modules/approvals/services";
import type { ApprovalType } from "@/modules/approvals/types";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取指定审批单的详细信息
 * @param _request - Next.js 请求对象（未使用）
 * @param params - 路由参数，包含审批单 ID
 * @returns 返回审批单详情的 JSON 响应，或 404/500 错误响应
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    const approval = await getApprovalById(id);
    if (!approval) {
      return NextResponse.json({ error: "NOT_FOUND", message: "审批单不存在" }, { status: 404 });
    }
    return NextResponse.json({ data: approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("获取审批详情失败:", message, error instanceof Error ? error.stack : "");
    return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
  }
}

/**
 * 处理审批操作（审批通过、审批驳回、执行审批）
 * @param request - Next.js 请求对象，包含操作数据的 JSON 请求体（action, rejectReason）
 * @param params - 路由参数，包含审批单 ID
 * @returns 返回操作结果的 JSON 响应，或 400/401/404/500 错误响应
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
      const result = await reviewApproval(
        id,
        action === "approve" ? "APPROVED" : "REJECTED",
        user.id,
        body.rejectReason,
      );
      return NextResponse.json({ data: result });
    }

    if (action === "execute") {
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
