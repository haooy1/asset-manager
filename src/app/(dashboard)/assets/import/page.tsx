"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [error, setError] = useState("");

  /**
   * 下载 CSV 导入模板
   */
  const handleDownloadTemplate = () => {
    window.open("/api/assets/import", "_blank");
  };

  /**
   * 上传 CSV 文件并导入资产
   * @param e - 文件输入变更事件
   */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">批量导入资产</h1>

      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">导入说明</h2>
          <ol className="ml-5 list-decimal space-y-2 text-sm text-gray-600">
            <li>下载 CSV 模板，按模板格式填写设备信息</li>
            <li>必填字段：资产编号、资产名称</li>
            <li>可选字段：品类、型号、品牌、购置日期、维保截止日、存放位置、设备价值、备注</li>
            <li>品类可选值：PC / PERIPHERAL / NETWORK / SERVER_STORAGE / MOBILE / MEETING / SECURITY_DEVICE / SECURITY_DOCUMENT</li>
            <li>日期格式：YYYY-MM-DD（如 2026-01-15）</li>
            <li>编码建议使用 UTF-8 with BOM（Excel 默认格式）</li>
            <li>单次最多导入 1000 行</li>
          </ol>
          <button onClick={handleDownloadTemplate}
            className="mt-4 rounded-md border border-blue-300 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
            📥 下载 CSV 模板
          </button>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">上传文件</h2>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            <span>{loading ? "导入中..." : "点击选择 CSV 文件上传"}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleUpload} disabled={loading} />
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
