"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { AssetInfo } from "@/modules/assets/types";

function NewApprovalForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: searchParams.get("type") || "BORROW",
    assetId: searchParams.get("assetId") || "",
    reason: "",
  });

  /**
   * 加载可用资产列表（状态为 IDLE 且非安全文档）
   */
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const r = await fetch("/api/assets?status=IDLE&pageSize=9999");
        if (!r.ok) return;
        const d = await r.json();
        setAssets(d.items.filter((a: AssetInfo) => a.category !== "SECURITY_DOCUMENT"));
      } catch {}
    })();
  }, [session]);

  /**
   * 提交审批申请表单
   * @param e - React 表单提交事件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.assetId) { setError("请选择资产"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        let msg = "发起失败";
        try {
          const err = await res.json();
          msg = err.message ?? msg;
        } catch {}
        setError(msg);
        setLoading(false);
        return;
      }
      const result = await res.json();
      router.push(`/approvals/${result.data.id}`);
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900 sm:text-2xl">发起申请</h1>
      <div className="rounded-lg border bg-white p-6 shadow-sm max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">申请类型 *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="BORROW">领用申请</option>
              <option value="RETURN">归还申请</option>
              <option value="TRANSFER">调拨申请</option>
              <option value="SCRAP">报废申请</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">选择资产 *</label>
            <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">-- 请选择 --</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.assetNo} - {a.name}{a.brand ? ` (${a.brand})` : ""}</option>
              ))}
            </select>
            {assets.length === 0 && <p className="mt-1 text-xs text-gray-400">暂无可用资产，请先录入设备</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">申请原因</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3}
              placeholder="请简要说明申请原因..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:shadow-md disabled:opacity-50 transition-all duration-200 cursor-pointer">
              {loading ? "提交中..." : "提交申请"}
            </button>
            <button type="button" onClick={() => router.back()} className="rounded-md border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 px-4 py-2 text-sm transition-all duration-200 cursor-pointer">取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewApprovalPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <NewApprovalForm />
    </Suspense>
  );
}
