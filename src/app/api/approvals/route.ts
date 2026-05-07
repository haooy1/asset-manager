import { getApprovals, createApproval } from "@/modules/approvals/services";
import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const result = await getApprovals({
      view: (searchParams.get("view") as "my" | "pending" | "execute" | "all") ?? "my",
      userId: user.id,
      branchId: user.branchId,
      status: searchParams.get("status") as never,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("获取审批列表失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
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
    console.error("创建审批失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
