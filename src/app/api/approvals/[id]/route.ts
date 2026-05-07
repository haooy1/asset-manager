import { getApprovalById, reviewApproval, executeApproval } from "@/modules/approvals/services";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const approval = await getApprovalById(id);
    if (!approval) {
      return NextResponse.json({ error: "NOT_FOUND", message: "审批单不存在" }, { status: 404 });
    }
    return NextResponse.json({ data: approval });
  } catch (error) {
    console.error("获取审批详情失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
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
        type: approval.type,
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
    console.error("处理审批失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
