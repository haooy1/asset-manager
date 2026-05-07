import { getUsers, createUser, updateUser } from "@/modules/org/services";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";
import type { UserRole } from "@/modules/org/types";

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
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

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
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

export async function PUT(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
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
