import { getDepartments, createDepartment, updateDepartment } from "@/modules/org/services";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取部门列表，支持按分支筛选
 * @param request - Next.js 请求对象，包含查询参数（branchId）
 * @returns 返回部门列表的 JSON 响应，或 500 错误响应
 */
export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") ?? undefined;
    const departments = await getDepartments(branchId);
    return NextResponse.json({ data: departments });
  } catch (error) {
    console.error("获取部门列表失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 创建新部门
 * @param request - Next.js 请求对象，包含部门数据的 JSON 请求体（name, branchId）
 * @returns 返回创建的部门 JSON 响应（201），或 400/500 错误响应
 */
export async function POST(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

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
