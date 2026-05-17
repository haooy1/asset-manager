import { getUsers, createUser, updateUser, updateUserPassword, getUserById } from "@/modules/org/services";
import { requireAuth, requireRole, getCurrentUser } from "@/lib/auth/middleware";
import { USER_ROLES } from "@/modules/org/types";
import { db } from "@/lib/db/client";
import { compare } from "bcryptjs";
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
    const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN");
    if (authError) return authError;

    const body = await request.json();
    const { username, password, realName, role, email, branchId, departmentId } = body;

    if (!username || !password || !realName || !role) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "用户名、密码、姓名、角色为必填项" },
        { status: 400 },
      );
    }

    if (!USER_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "无效的角色值" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "密码长度不能少于6位" },
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
 * 更新用户基础信息（管理员可更新任意用户，普通用户仅能更新自己）
 * @param request - Next.js 请求对象，包含用户数据的 JSON 请求体（id 及其他更新字段）
 * @returns 返回更新后用户的 JSON 响应，或 400/403/500 错误响应
 */
export async function PUT(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "用户ID为必填项" }, { status: 400 });
    }

    const isAdmin = ["SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER"].includes(currentUser.role);
    const isSelf = currentUser.id === id;

    // 非管理员且不是修改自己 → 无权限
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "FORBIDDEN", message: "无权修改其他用户信息" }, { status: 403 });
    }

    // 普通用户只能修改自己的基础信息（不能改角色、分支、部门、状态）
    if (!isAdmin && isSelf) {
      const allowedFields = ["realName", "email"];
      const filteredData: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in data) filteredData[key] = data[key];
      }
      const user = await updateUser(id, filteredData);
      return NextResponse.json({ data: user });
    }

    // 管理员可以修改更多信息（白名单过滤）
    const adminAllowedFields = ["realName", "email", "role", "branchId", "departmentId", "isActive"];
    const filteredData: Record<string, unknown> = {};
    for (const key of adminAllowedFields) {
      if (key in data) filteredData[key] = data[key];
    }

    if (filteredData.role && !USER_ROLES.includes(filteredData.role as UserRole)) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "无效的角色值" }, { status: 400 });
    }

    const user = await updateUser(id, filteredData);
    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("更新用户失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 修改密码
 * - 管理员可直接重置任意用户密码（无需原密码）
 * - 普通用户只能修改自己的密码，且必须验证原密码
 * @param request - Next.js 请求对象，包含密码数据的 JSON 请求体
 * @returns 返回成功响应，或 400/403/500 错误响应
 */
export async function PATCH(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { id, newPassword, oldPassword } = body;

    if (!id || !newPassword) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "用户ID和新密码为必填项" },
        { status: 400 },
      );
    }

    const isAdmin = ["SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER"].includes(currentUser.role);
    const isSelf = currentUser.id === id;

    // 非管理员且不是修改自己 → 无权限
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "FORBIDDEN", message: "无权修改其他用户密码" }, { status: 403 });
    }

    // 普通用户修改自己的密码 → 需要验证原密码
    if (!isAdmin && isSelf) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "请输入原密码" },
          { status: 400 },
        );
      }

      // 验证原密码
      const user = await db.user.findUnique({ where: { id } });
      if (!user) {
        return NextResponse.json({ error: "NOT_FOUND", message: "用户不存在" }, { status: 404 });
      }

      const isValid = await compare(oldPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "UNAUTHORIZED", message: "原密码不正确" }, { status: 401 });
      }

      if (oldPassword === newPassword) {
        return NextResponse.json({ error: "VALIDATION_ERROR", message: "新密码不能与原密码相同" }, { status: 400 });
      }
    }

    // 管理员重置密码时也需要检查新旧密码是否相同
    if (isAdmin) {
      const targetUser = await db.user.findUnique({ where: { id } });
      if (targetUser && await compare(newPassword, targetUser.password)) {
        return NextResponse.json({ error: "VALIDATION_ERROR", message: "新密码不能与原密码相同" }, { status: 400 });
      }
    }

    // 执行密码更新
    await updateUserPassword(id, newPassword);
    return NextResponse.json({ message: "密码修改成功" });
  } catch (error) {
    console.error("修改密码失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
