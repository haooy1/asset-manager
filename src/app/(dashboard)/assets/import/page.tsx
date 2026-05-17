"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useDialog } from "@/shared/utils/dialogs";

interface CategoryGroup {
  id: string;
  name: string;
  label: string;
  _count: { fields: number; assets: number };
}

interface PreviewRow {
  assetNo: string;
  name: string;
  category?: string;
  model?: string;
  brand?: string;
  [key: string]: string | undefined;
}

interface InvalidRow {
  row: number;
  data: PreviewRow;
  error: string;
}

interface PreviewResult {
  batchId: string;
  preview: boolean;
  total: number;
  validCount: number;
  invalidCount: number;
  validRows: PreviewRow[];
  invalidRows: InvalidRow[];
  hasMore: boolean;
}

interface ImportResult {
  batchId: string;
  total: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

/**
 * 资产批量导入页面
 * 支持：选择设备类型 → 下载模板 → 上传预览 → 确认导入 → 撤销导入
 */
export default function ImportPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { confirm, alert, ConfirmDialog } = useDialog();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);

  // 普通用户无权批量导入，重定向到资产列表
  useEffect(() => {
    if (session?.user?.role === "EMPLOYEE") {
      router.replace("/assets");
    }
  }, [session, router]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    fetch("/api/category-groups")
      .then((res) => res.json())
      .then((data) => setGroups(data.data ?? []))
      .catch(() => {});
  }, []);

  const handleDownloadTemplate = () => {
    const url = selectedGroupId
      ? `/api/assets/import?categoryGroupId=${selectedGroupId}`
      : "/api/assets/import";
    window.open(url, "_blank");
  };

  /**
   * 上传文件进行预览（不实际导入）
   */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview(null);
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "preview");
      if (selectedGroupId) formData.append("categoryGroupId", selectedGroupId);
      const res = await fetch("/api/assets/import", { method: "POST", body: formData });
      if (!res.ok) {
        let msg = "预览失败";
        try {
          const err = await res.json();
          msg = err.message ?? msg;
        } catch {}
        setError(msg);
      } else {
        const data = await res.json();
        if (data.error) {
          setError(data.message);
        } else {
          setPreview(data);
        }
      }
    } catch {
      setError("网络错误，请重试");
    }
    setLoading(false);
    e.target.value = "";
  };

  /**
   * 确认执行导入
   */
  const handleConfirm = async () => {
    if (!preview?.batchId) return;
    setConfirming(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("action", "confirm");
      formData.append("batchId", preview.batchId);
      const res = await fetch("/api/assets/import", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setError(data.message);
      } else {
        setResult(data);
        setPreview(null);
      }
    } catch {
      setError("网络错误，请重试");
    }
    setConfirming(false);
  };

  /**
   * 撤销本次导入
   */
  const handleRevoke = async () => {
    if (!result?.batchId) return;
    const ok = await confirm({
      title: "撤销导入",
      message: "确定要撤销本次导入吗？这将删除该批次导入的所有资产。",
      confirmText: "撤销",
      cancelText: "取消",
      type: "danger",
    });
    if (!ok) return;
    setRevoking(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("action", "revoke");
      formData.append("batchId", result.batchId);
      const res = await fetch("/api/assets/import", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setError(data.message);
      } else {
        setResult(null);
        setError("");
        await alert({ title: "撤销成功", message: data.message, type: "success" });
      }
    } catch {
      setError("网络错误，请重试");
    }
    setRevoking(false);
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div>
      <ConfirmDialog />
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
        >
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-900">批量导入资产</h1>
      </div>

      <div className="space-y-6">
        {/* 第一步：选择设备类型 */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">第一步：选择设备类型</h2>
          <p className="mb-3 text-sm text-gray-500">
            选择设备类型后，下载的模板将自动包含该类型的自定义字段列。不选择则只包含通用字段。
          </p>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">通用模板（仅基础字段）</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}（{g._count.fields} 个自定义字段）
              </option>
            ))}
          </select>
          {selectedGroup && selectedGroup._count.fields > 0 && (
            <p className="mt-2 text-xs text-blue-600">
              已选择「{selectedGroup.label}」，模板将包含 {selectedGroup._count.fields} 个自定义字段列
            </p>
          )}
        </div>

        {/* 第二步：下载模板 */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">第二步：下载模板并填写</h2>
          <ol className="ml-5 list-decimal space-y-2 text-sm text-gray-600">
            <li>下载 Excel 模板，按模板格式填写设备信息</li>
            <li>必填字段：资产编号、资产名称</li>
            <li>可选字段：品类、型号、品牌、购置日期、维保截止日、存放位置、设备价值、备注</li>
            <li><span className="font-medium text-blue-600">品类列有下拉框，请从列表中选择</span></li>
            <li>日期格式：YYYY-MM-DD（如 2026-01-15）</li>
            <li>单次最多导入 1000 行</li>
          </ol>
          <button onClick={handleDownloadTemplate}
            className="mt-4 rounded-md border border-blue-300 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
            📥 下载 Excel 模板
          </button>
        </div>

        {/* 第三步：上传预览 */}
        {!preview && !result && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">第三步：上传文件预览</h2>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span>{loading ? "解析中..." : "点击选择 Excel 或 CSV 文件上传预览"}</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleUpload} disabled={loading} />
            </label>

            {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          </div>
        )}

        {/* 预览确认 */}
        {preview && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">数据预览</h2>
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              <div><span className="text-gray-500">总计：</span><span className="font-bold">{preview.total}</span> 行</div>
              <div><span className="text-gray-500">有效：</span><span className="font-bold text-green-600">{preview.validCount}</span> 行</div>
              <div><span className="text-gray-500">无效：</span><span className="font-bold text-red-600">{preview.invalidCount}</span> 行</div>
            </div>

            {/* 有效数据预览 */}
            {preview.validRows.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-medium text-green-700">✅ 有效数据（前 {preview.validRows.length} 行）</h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">资产编号</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">资产名称</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">品类</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">型号</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">品牌</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.validRows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900">{row.assetNo}</td>
                          <td className="px-3 py-2 text-gray-900">{row.name}</td>
                          <td className="px-3 py-2 text-gray-600">{row.category || "-"}</td>
                          <td className="px-3 py-2 text-gray-600">{row.model || "-"}</td>
                          <td className="px-3 py-2 text-gray-600">{row.brand || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.hasMore && (
                  <p className="mt-1 text-xs text-gray-400">仅显示前 10 行，实际导入时将处理全部有效数据</p>
                )}
              </div>
            )}

            {/* 无效数据 */}
            {preview.invalidRows.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-medium text-red-700">❌ 无效数据（前 {preview.invalidRows.length} 行）</h3>
                <ul className="max-h-48 overflow-auto rounded-md border bg-red-50 p-3 text-xs text-red-700 space-y-1">
                  {preview.invalidRows.map((item, i) => (
                    <li key={i}>
                      <span className="font-medium">第 {item.row} 行:</span> {item.error}
                    </li>
                  ))}
                </ul>
                {preview.hasMore && preview.invalidCount > preview.invalidRows.length && (
                  <p className="mt-1 text-xs text-gray-400">还有 {preview.invalidCount - preview.invalidRows.length} 条错误未显示</p>
                )}
              </div>
            )}

            {/* 确认/取消按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={confirming || preview.validCount === 0}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 transition-all duration-200 cursor-pointer"
              >
                {confirming ? "导入中..." : `确认导入 (${preview.validCount} 条)`}
              </button>
              <button
                onClick={() => { setPreview(null); setError(""); }}
                className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
              >
                取消
              </button>
            </div>

            {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          </div>
        )}

        {/* 导入结果 */}
        {result && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">导入结果</h2>
            <div className="mb-4 flex flex-wrap gap-6 text-sm">
              <div><span className="text-gray-500">总计：</span><span className="font-bold">{result.total}</span> 行</div>
              <div><span className="text-gray-500">成功：</span><span className="font-bold text-green-600">{result.success}</span> 行</div>
              <div><span className="text-gray-500">失败：</span><span className="font-bold text-red-600">{result.failed}</span> 行</div>
            </div>
            {result.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-medium text-red-700">错误详情</h3>
                <ul className="max-h-64 overflow-auto rounded-md border bg-red-50 p-3 text-xs text-red-700 space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRevoke}
                disabled={revoking || result.success === 0}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 transition-all duration-200 cursor-pointer"
              >
                {revoking ? "撤销中..." : "撤销本次导入"}
              </button>
              <button onClick={() => router.push("/assets")}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-all duration-200 cursor-pointer">
                返回资产列表
              </button>
              <button onClick={() => { setResult(null); setError(""); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
                继续导入
              </button>
            </div>

            {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
