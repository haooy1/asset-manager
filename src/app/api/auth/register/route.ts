import { createUser } from "@/modules/org/services";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, realName, role, branchId, departmentId } = body;

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
      role,
      branchId,
      departmentId,
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "CONFLICT", message: "用户名已存在" },
        { status: 409 },
      );
    }
    console.error("创建用户失败:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
