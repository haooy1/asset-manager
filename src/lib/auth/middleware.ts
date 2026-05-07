import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

/**
 * 校验用户是否已登录，未登录返回 401
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "请先登录" },
      { status: 401 },
    );
  }
  return null;
}

/**
 * 校验用户是否具备指定角色，不具备返回 403
 */
export async function requireRole(...roles: string[]) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "请先登录" },
      { status: 401 },
    );
  }
  if (!roles.includes(session.user.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "权限不足" },
      { status: 403 },
    );
  }
  return null;
}

/**
 * 获取当前用户信息，未登录返回 null
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
