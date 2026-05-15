"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface DocumentInfo {
  id: string;
  assetId: string;
  name: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  expiryDate: string | null;
  uploadedAt: string;
}

/**
 * 根据文件扩展名返回图标颜色和类型标签
 */
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
    csv: { color: "text-green-600", label: "CSV", bg: "bg-green-50" },
    png: { color: "text-purple-600", label: "PNG", bg: "bg-purple-50" },
    jpg: { color: "text-purple-600", label: "JPG", bg: "bg-purple-50" },
    jpeg: { color: "text-purple-600", label: "JPEG", bg: "bg-purple-50" },
    gif: { color: "text-purple-600", label: "GIF", bg: "bg-purple-50" },
    svg: { color: "text-purple-600", label: "SVG", bg: "bg-purple-50" },
    zip: { color: "text-yellow-600", label: "ZIP", bg: "bg-yellow-50" },
    rar: { color: "text-yellow-600", label: "RAR", bg: "bg-yellow-50" },
    "7z": { color: "text-yellow-600", label: "7Z", bg: "bg-yellow-50" },
    apk: { color: "text-teal-600", label: "APK", bg: "bg-teal-50" },
  };
  return map[ext] ?? { color: "text-gray-500", label: ext.toUpperCase() || "FILE", bg: "bg-gray-50" };
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number | null): string {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [asset, setAsset] = useState<{ assetNo: string; name: string } | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * 加载资产及其文档
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${id}`);
      if (!res.ok) return;
      const { data } = await res.json();
      if (data) {
        setAsset({ assetNo: data.assetNo, name: data.name });
        setDocuments(data.documents || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.back()} className="mb-2 text-sm text-gray-500 hover:text-gray-700">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-900">附件文档</h1>
        {asset && (
          <p className="mt-1 text-sm text-gray-500">
            <Link href={`/assets/${id}`} className="hover:text-blue-600">{asset.assetNo}</Link>
            <span className="mx-1">·</span>
            <span>{asset.name}</span>
            <span className="ml-2 text-xs text-gray-400">共 {documents.length} 个文件</span>
          </p>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="rounded-lg border bg-white py-16 text-center shadow-sm">
          <svg className="mx-auto mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">暂未上传任何附件文档</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
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
                  {doc.expiryDate && (
                    <>
                      <span>·</span>
                      <span className={new Date(doc.expiryDate) < new Date() ? "text-red-500" : ""}>
                        到期 {new Date(doc.expiryDate).toLocaleDateString("zh-CN")}
                      </span>
                    </>
                  )}
                </div>

                <a
                  href={doc.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
