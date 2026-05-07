import { getBranches, createBranch, updateBranch } from "@/modules/org/services";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const branches = await getBranches();
    return NextResponse.json({ data: branches });
  } catch (error) {
    console.error("获取分支列表失败:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "服务器内部错误" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, code, address, contact } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "分支名称和编码为必填项" },
        { status: 400 },
      );
    }

    const branch = await createBranch({ name, code, address, contact });
    return NextResponse.json({ data: branch }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "CONFLICT", message: "分支编码已存在" },
        { status: 409 },
      );
    }
    console.error("创建分支失败:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
