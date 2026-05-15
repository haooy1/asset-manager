import { requireAuth, getCurrentUser } from "@/lib/auth/middleware";
import { getCategoryDocuments, uploadCategoryDocument, deleteCategoryDocument } from "@/modules/categories/services";
import { writeAuditLog } from "@/lib/db/audit";
import { NextResponse } from "next/server";

/**
 * 获取分类组的共享文档列表
 * GET /api/category-groups/[id]/documents
 */
export async function GET(
  _request: Request,
  routeParams?: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { id: categoryGroupId } = routeParams ? await routeParams.params : { id: "" };
    const docs = await getCategoryDocuments(categoryGroupId);
    return NextResponse.json({ data: docs });
  } catch (error) {
    console.error("获取分类文档失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 上传分类共享文档
 * POST /api/category-groups/[id]/documents
 */
export async function POST(
  request: Request,
  routeParams?: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (user.role !== "SUPER_ADMIN" && user.role !== "BRANCH_ADMIN" && user.role !== "DEPT_MANAGER") {
      return NextResponse.json({ error: "FORBIDDEN", message: "权限不足" }, { status: 403 });
    }

    const { id: categoryGroupId } = routeParams ? await routeParams.params : { id: "" };
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = (formData.get("name") as string) || file?.name || "未命名文档";

    if (!file) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "请上传文件" }, { status: 400 });
    }

    const doc = await uploadCategoryDocument(categoryGroupId, name, file, user.id);

    writeAuditLog({
      userId: user.id,
      username: user.username,
      action: "DOCUMENT_UPLOAD",
      targetType: "CATEGORY_DOCUMENT",
      targetId: doc.id,
      detail: `上传分类共享文档: ${name} (${file.name})`,
    }).catch(() => {});

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    console.error("上传分类文档失败:", error);
    const msg = error instanceof Error ? error.message : "服务器内部错误";
    return NextResponse.json({ error: "UPLOAD_FAILED", message: msg }, { status: 400 });
  }
}

/**
 * 删除分类共享文档
 * DELETE /api/category-groups/[id]/documents?docId=xxx
 */
export async function DELETE(
  request: Request,
  routeParams?: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (user.role !== "SUPER_ADMIN" && user.role !== "BRANCH_ADMIN") {
      return NextResponse.json({ error: "FORBIDDEN", message: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("docId");
    if (!docId) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "缺少 docId 参数" }, { status: 400 });
    }

    await deleteCategoryDocument(docId);

    writeAuditLog({
      userId: user.id,
      username: user.username,
      action: "DOCUMENT_UPLOAD",
      targetType: "CATEGORY_DOCUMENT",
      targetId: docId,
      detail: "删除分类共享文档",
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除分类文档失败:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "服务器内部错误" }, { status: 500 });
  }
}
