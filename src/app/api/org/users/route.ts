import { getUsers, createUser, updateUser } from "@/modules/org/services";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";
import type { UserRole } from "@/modules/org/types";

/**
 * 获取用户列表，支持按分支和部门筛选
 * @param request - Next.js 请求对象，包含查询参数（branchId, departmentId）
 * @returns 返回用户列表的 JSON 响应，或 500 错误响应
 */
export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") ?? undefined;
    const departmentId = searchParams.get("departmentId") ?? undefined;
    const users = await getUsers(branchId, departmentId);
    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 创建新用户
 * @param request - Next.js 请求对象，包含用户数据的 JSON 请求体（username, password, realName, role, email, branchId, departmentId）
 * @returns 返回创建的用户 JSON 响应（201），或 400/409/500 错误响应
 */
export async function POST(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { username, password, realName, role, email, branchId, departmentId } = body;

    if (!username || !password || !realName || !role) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "用户名、密码、姓名、角色为必填项" },
        { status: 400 },
      );
    }

    const user = await createUser({
      username,
      password,
      realName,
      role: role as UserRole,
      email,
      branchId,
      departmentId,
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "CONFLICT", message: "用户名已存在" }, { status: 409 });
    }
    console.error("创建用户失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 更新用户信息
 * @param request - Next.js 请求对象，包含用户数据的 JSON 请求体（id 及其他更新字段）
 * @returns 返回更新后用户的 JSON 响应，或 400/500 错误响应
 */
export async function PUT(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "用户ID为必填项" }, { status: 400 });
    }
    const user = await updateUser(id, data);
    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("更新用户失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
