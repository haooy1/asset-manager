"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CategoryGroup {
  id: string;
  name: string;
  label: string;
  _count: { fields: number; assets: number };
}

export default function ImportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [result, setResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [error, setError] = useState("");

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedGroupId) formData.append("categoryGroupId", selectedGroupId);
      const res = await fetch("/api/assets/import", { method: "POST", body: formData });
      if (!res.ok) {
        let msg = "导入失败";
        try {
          const err = await res.json();
          msg = err.message ?? msg;
        } catch {}
        setError(msg);
      } else {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      setError("网络错误，请重试");
    }
    setLoading(false);
    e.target.value = "";
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-900">批量导入资产</h1>
      </div>

      <div className="space-y-6">
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
            className="mt-4 rounded-md border border-blue-300 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
            📥 下载 Excel 模板
          </button>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">第三步：上传文件导入</h2>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            <span>{loading ? "导入中..." : "点击选择 Excel 或 CSV 文件上传"}</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleUpload} disabled={loading} />
          </label>

          {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        </div>

        {result && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">导入结果</h2>
            <div className="mb-4 flex gap-6 text-sm">
              <div><span className="text-gray-500">总计：</span><span className="font-bold">{result.total}</span> 行</div>
              <div><span className="text-gray-500">成功：</span><span className="font-bold text-green-600">{result.success}</span> 行</div>
              <div><span className="text-gray-500">失败：</span><span className="font-bold text-red-600">{result.failed}</span> 行</div>
            </div>
            {result.errors.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-red-700">错误详情</h3>
                <ul className="max-h-64 overflow-auto rounded-md border bg-red-50 p-3 text-xs text-red-700 space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={() => router.push("/assets")}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              返回资产列表
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
