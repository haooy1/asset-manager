"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDialog } from "@/shared/utils/dialogs";

interface SharedDoc {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedAt: string;
  uploader: { realName: string } | null;
}

interface CategoryGroupInfo {
  id: string;
  label: string;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, { color: string; label: string; bg: string }> = {
    pdf: { color: "text-red-600", label: "PDF", bg: "bg-red-50" },
    doc: { color: "text-blue-600", label: "DOC", bg: "bg-blue-50" },
    docx: { color: "text-blue-600", label: "DOCX", bg: "bg-blue-50" },
    xls: { color: "text-green-600", label: "XLS", bg: "bg-green-50" },
    xlsx: { color: "text-green-600", label: "XLSX", bg: "bg-green-50" },
    ppt: { color: "text-orange-600", label: "PPT", bg: "bg-orange-50" },
    pptx: { color: "text-orange-600", label: "PPTX", bg: "bg-orange-50" },
    txt: { color: "text-gray-600", label: "TXT", bg: "bg-gray-50" },
    png: { color: "text-purple-600", label: "PNG", bg: "bg-purple-50" },
    jpg: { color: "text-purple-600", label: "JPG", bg: "bg-purple-50" },
    jpeg: { color: "text-purple-600", label: "JPEG", bg: "bg-purple-50" },
    gif: { color: "text-purple-600", label: "GIF", bg: "bg-purple-50" },
    zip: { color: "text-yellow-600", label: "ZIP", bg: "bg-yellow-50" },
    rar: { color: "text-yellow-600", label: "RAR", bg: "bg-yellow-50" },
  };
  return map[ext] ?? { color: "text-gray-500", label: ext.toUpperCase() || "FILE", bg: "bg-gray-50" };
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CategoryDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { confirm, ConfirmDialog } = useDialog();

  const [group, setGroup] = useState<CategoryGroupInfo | null>(null);
  const [docs, setDocs] = useState<SharedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [groupRes, docsRes] = await Promise.all([
        fetch("/api/category-groups"),
        fetch(`/api/category-groups/${id}/documents`),
      ]);
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        const found = (groupData.data || []).find((g: CategoryGroupInfo) => g.id === id);
        if (found) setGroup(found);
      }
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocs(docsData.data || []);
      }
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      const res = await fetch(`/api/category-groups/${id}/documents`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        setError(err.message || "上传失败");
      } else {
        await load();
      }
    } catch {
      setError("网络错误，请重试");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (docId: string) => {
    const ok = await confirm({
      title: "删除文档",
      message: "确定要删除此文档吗？",
      confirmText: "删除",
      cancelText: "取消",
      type: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/category-groups/${id}/documents?docId=${docId}`, { method: "DELETE" });
      if (res.ok) await load();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <ConfirmDialog />
      <div className="mb-6">
        <button onClick={() => router.back()} className="mb-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 cursor-pointer">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">共享文档管理</h1>
        {group && (
          <p className="mt-1 text-sm text-gray-500">
            设备类型：{group.label}
            <span className="ml-2 text-xs text-gray-400">共 {docs.length} 个共享文件</span>
          </p>
        )}
      </div>

      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">上传共享文档</h2>
            <p className="mt-1 text-sm text-gray-500">
              上传后，该类型下所有资产均可查看和下载此文档（如用户手册、安全指南等）
            </p>
          </div>
          <label className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-all duration-200 cursor-pointer ${
            uploading ? "bg-gray-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
          }`}>
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            {uploading ? "上传中..." : "上传文件"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border bg-white py-16 text-center shadow-sm">
          <svg className="mx-auto mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">暂无共享文档，上传后同类型资产均可查看</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => {
            const icon = getFileIcon(doc.fileName);
            return (
              <div key={doc.id} className="group rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="mb-3 flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${icon.bg}`}>
                    <span className={`text-xs font-bold ${icon.color}`}>{icon.label}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-gray-900" title={doc.name}>
                      {doc.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-gray-400" title={doc.fileName}>
                      {doc.fileName}
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-3 text-xs text-gray-400">
                  <span>{formatSize(doc.fileSize)}</span>
                  <span>·</span>
                  <span>{new Date(doc.uploadedAt).toLocaleDateString("zh-CN")}</span>
                  {doc.uploader && (
                    <>
                      <span>·</span>
                      <span>{doc.uploader.realName}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={doc.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    下载
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-all duration-200 hover:bg-red-100 cursor-pointer"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
