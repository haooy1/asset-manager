import { getApprovals, createApproval } from "@/modules/approvals/services";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取审批列表，支持按视图类型、状态等条件筛选
 * - view=my: 我的申请（所有角色可用，EMPLOYEE 强制此视图）
 * - view=pending: 待审批（DEPT_MANAGER+）
 * - view=execute: 待执行（SUPER_ADMIN/BRANCH_ADMIN）
 * - view=all: 全部审批（SUPER_ADMIN/BRANCH_ADMIN）
 * @param request - Next.js 请求对象，包含查询参数（view, status, page, pageSize）
 * @returns 返回审批列表分页结果的 JSON 响应，或 401/403/500 错误响应
 */
export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const viewRaw = (searchParams.get("view") as "my" | "pending" | "execute" | "all") ?? "my";
    const view = user.role === "EMPLOYEE" ? "my" : viewRaw;

    const result = await getApprovals({
      view,
      userId: user.id,
      branchId: user.branchId,
      userRole: user.role,
      status: searchParams.get("status") as never,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("获取审批列表失败:", message, stack);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}

/**
 * 创建新的审批申请
 * @param request - Next.js 请求对象，包含审批数据的 JSON 请求体（type, assetId, reason）
 * @returns 返回创建的审批单 JSON 响应（201），或 400/401/500 错误响应
 */
export async function POST(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await request.json();
    const { type, assetId, reason } = body;

    if (!type || !assetId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "申请类型和资产为必填项" },
        { status: 400 },
      );
    }

    const approval = await createApproval({
      type,
      assetId,
      applicantId: user.id,
      reason,
    });

    return NextResponse.json({ data: approval }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("创建审批失败:", message, error instanceof Error ? error.stack : "");
    return NextResponse.json({ error: "INTERNAL_ERROR", message }, { status: 500 });
  }
}
