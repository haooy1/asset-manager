import {
  getAssetById, updateAsset, deleteAsset, validateStatusTransition,
  uploadDocument, getAssetDocuments, deleteDocument,
} from "@/modules/assets/services";
import type { AssetStatus } from "@/modules/assets/types";
import { requireAuth, requireRole, getCurrentUser } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取指定资产的详细信息
 * 普通员工（EMPLOYEE）仅可查看闲置状态的办公电脑和外设配件
 * @param _request - Next.js 请求对象（未使用）
 * @param params - 路由参数，包含资产 ID
 * @returns 返回资产详情的 JSON 响应，或 403/404/500 错误响应
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    const { id } = await params;
    const asset = await getAssetById(id);
    if (!asset) {
      return NextResponse.json({ error: "NOT_FOUND", message: "资产不存在" }, { status: 404 });
    }

    if (user?.role === "EMPLOYEE") {
      if (!["IDLE", "BORROWING"].includes(asset.status) || !["PC", "PERIPHERAL"].includes(asset.category)) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "您仅可查看闲置和领用中的办公电脑及外设配件" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("获取资产详情失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 更新指定资产的信息，包含状态流转校验
 * 仅管理员角色（SUPER_ADMIN/BRANCH_ADMIN/DEPT_MANAGER）可操作
 * @param request - Next.js 请求对象，包含更新数据的 JSON 请求体
 * @param params - 路由参数，包含资产 ID
 * @returns 返回更新后资产的 JSON 响应，或 400/403/500 错误响应
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    const normalizedBody = {
      ...body,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
      value: body.value != null && body.value !== "" ? Number(body.value) : undefined,
    };

    if (normalizedBody.status) {
      const current = await getAssetById(id);
      if (current && !validateStatusTransition(current.status as AssetStatus, normalizedBody.status as AssetStatus)) {
        return NextResponse.json(
          { error: "INVALID_TRANSITION", message: `不允许从「${current.status}」变更为「${normalizedBody.status}」` },
          { status: 400 },
        );
      }
    }

    const asset = await updateAsset(id, normalizedBody);
    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("更新资产失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 删除指定资产
 * 仅管理员角色（SUPER_ADMIN/BRANCH_ADMIN/DEPT_MANAGER）可操作
 * @param _request - Next.js 请求对象（未使用）
 * @param params - 路由参数，包含资产 ID
 * @returns 返回删除成功的 JSON 响应，或 403/500 错误响应
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
    if (authError) return authError;

    const { id } = await params;
    await deleteAsset(id);
    return NextResponse.json({ data: null });
  } catch (error) {
    console.error("删除资产失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 为指定资产上传文档附件
 * 仅管理员角色（SUPER_ADMIN/BRANCH_ADMIN/DEPT_MANAGER）可操作
 * @param request - Next.js 请求对象，包含 FormData（file, name, expiryDate）
 * @param routeParams - 路由参数，包含资产 ID
 * @returns 返回上传文档信息的 JSON 响应（201），或 400/403/500 错误响应
 */
export async function POST(
  request: Request,
  routeParams?: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireRole("SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER");
    if (authError) return authError;

    const { id } = await routeParams!.params;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const expiryDate = formData.get("expiryDate") as string;

    if (!file || !name) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "文件名称和文件为必填项" },
        { status: 400 },
      );
    }

    const doc = await uploadDocument(id, name, file, expiryDate);
    console.log(`[upload] 文档上传成功: assetId=${id} docId=${doc.id} name=${name}`);
    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    console.error("[upload] 上传文档失败:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: `上传失败: ${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 },
    );
  }
}
