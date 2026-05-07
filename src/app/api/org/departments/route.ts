import { getDepartments, createDepartment, updateDepartment } from "@/modules/org/services";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") ?? undefined;
    const departments = await getDepartments(branchId);
    return NextResponse.json({ data: departments });
  } catch (error) {
    console.error("获取部门列表失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, branchId } = body;

    if (!name || !branchId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "部门名称和所属分支为必填项" },
        { status: 400 },
      );
    }

    const department = await createDepartment({ name, branchId });
    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error) {
    console.error("创建部门失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
