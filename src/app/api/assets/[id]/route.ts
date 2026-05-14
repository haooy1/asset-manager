import {
  getAssetById, updateAsset, deleteAsset, validateStatusTransition,
  uploadDocument, getAssetDocuments, deleteDocument,
} from "@/modules/assets/services";
import type { AssetStatus } from "@/modules/assets/types";
import { requireAuth } from "@/lib/auth/middleware";
import { NextResponse } from "next/server";

/**
 * 获取指定资产的详细信息
 * @param _request - Next.js 请求对象（未使用）
 * @param params - 路由参数，包含资产 ID
 * @returns 返回资产详情的 JSON 响应，或 404/500 错误响应
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    const asset = await getAssetById(id);
    if (!asset) {
      return NextResponse.json({ error: "NOT_FOUND", message: "资产不存在" }, { status: 404 });
    }
    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("获取资产详情失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 更新指定资产的信息，包含状态流转校验
 * @param request - Next.js 请求对象，包含更新数据的 JSON 请求体
 * @param params - 路由参数，包含资产 ID
 * @returns 返回更新后资产的 JSON 响应，或 400/500 错误响应
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    if (body.status) {
      const current = await getAssetById(id);
      if (current && !validateStatusTransition(current.status as AssetStatus, body.status as AssetStatus)) {
        return NextResponse.json(
          { error: "INVALID_TRANSITION", message: `不允许从「${current.status}」变更为「${body.status}」` },
          { status: 400 },
        );
      }
    }

    const asset = await updateAsset(id, body);
    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("更新资产失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 删除指定资产
 * @param _request - Next.js 请求对象（未使用）
 * @param params - 路由参数，包含资产 ID
 * @returns 返回删除成功的 JSON 响应，或 500 错误响应
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
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
 * @param request - Next.js 请求对象，包含 FormData（file, name, expiryDate）
 * @param routeParams - 路由参数，包含资产 ID
 * @returns 返回上传文档信息的 JSON 响应（201），或 400/500 错误响应
 */
export async function POST(
  request: Request,
  routeParams?: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
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
    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    console.error("上传文档失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
