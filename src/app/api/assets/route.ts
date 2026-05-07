import { getAssetList, createAsset } from "@/modules/assets/services";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const params = {
      branchId: searchParams.get("branchId") ?? undefined,
      status: searchParams.get("status") as never,
      category: searchParams.get("category") as never,
      keyword: searchParams.get("keyword") ?? undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    };
    const result = await getAssetList(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error("获取资产列表失败:", error);
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
    const { assetNo, name, category } = body;

    if (!assetNo || !name || !category) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "资产编号、名称、品类为必填项" },
        { status: 400 },
      );
    }

    const asset = await createAsset(body);
    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "CONFLICT", message: "资产编号已存在" },
        { status: 409 },
      );
    }
    console.error("创建资产失败:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
