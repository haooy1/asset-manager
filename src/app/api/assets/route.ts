import { getAssetList, createAsset } from "@/modules/assets/services";
import { requireAuth, requireRole, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取资产列表，支持按分支/状态/品类/关键词筛选
 * 普通员工仅可查看闲置状态的办公电脑和外设配件
 * @param request - HTTP 请求对象
 * @returns 资产列表分页结果
 */
export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const params = {
      branchId: searchParams.get("branchId") ?? undefined,
      status: searchParams.get("status") as never,
      category: searchParams.get("category") as never,
      keyword: searchParams.get("keyword") ?? undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
      userRole: user?.role ?? undefined,
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

/**
 * 创建新资产（入库）
 * @param request - HTTP 请求对象，body 包含资产信息
 * @returns 创建的资产数据
 */
export async function POST(request: Request) {
  try {
    const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
    if (authError) return authError;

    const body = await request.json();
    const { assetNo, name, category } = body;

    if (!assetNo || !name || !category) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "资产编号、名称、品类为必填项" },
        { status: 400 },
      );
    }

    const { customFieldValues, categoryGroupId, ...restBody } = body;

    const normalizedBody = {
      ...restBody,
      categoryGroupId: categoryGroupId || undefined,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
      value: body.value != null && body.value !== "" ? Number(body.value) : undefined,
      model: body.model || null,
      brand: body.brand || null,
      location: body.location || null,
      description: body.description || null,
      customFieldValues: customFieldValues || [],
    };

    const asset = await createAsset(normalizedBody);
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
