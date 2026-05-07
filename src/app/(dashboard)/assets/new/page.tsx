"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ASSET_CATEGORIES, CATEGORY_LABELS, type AssetCategory } from "@/modules/assets/types";

export default function NewAssetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    assetNo: "",
    name: "",
    model: "",
    brand: "",
    category: "PC" as AssetCategory,
    purchaseDate: "",
    warrantyExpiry: "",
    location: "",
    value: "",
    description: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          value: form.value ? Number(form.value) : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message ?? "创建失败");
        setLoading(false);
        return;
      }

      router.push(`/assets/${result.data.id}`);
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  };

  if (form.category === "SECURITY_DOCUMENT") {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">新增安全文档</h1>
        <div className="rounded-lg border bg-white p-6 shadow-sm max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">文档编号 *</label>
                <input name="assetNo" required value={form.assetNo} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="如 DOC-2026-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">文档名称 *</label>
                <input name="name" required value={form.name} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="如 2025年度渗透测试报告" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">生效日期</label>
                <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">到期日期</label>
                <input name="warrantyExpiry" type="date" value={form.warrantyExpiry} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <input type="hidden" name="category" value="SECURITY_DOCUMENT" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">备注说明</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div className="flex gap-3">
              <button type="submit" disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? "提交中..." : "确认入库"}
              </button>
              <button type="button" onClick={() => router.back()}
                className="rounded-md border px-4 py-2 text-sm">取消</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">新增资产</h1>
      <div className="rounded-lg border bg-white p-6 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">资产编号 *</label>
              <input name="assetNo" required value={form.assetNo} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="如 PC-2026-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">资产名称 *</label>
              <input name="name" required value={form.name} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="如 ThinkPad X1 Carbon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">型号</label>
              <input name="model" value={form.model} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">品牌</label>
              <input name="brand" value={form.brand} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">品类 *</label>
              <select name="category" required value={form.category} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {ASSET_CATEGORIES.filter(c => c !== "SECURITY_DOCUMENT").map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">购置日期</label>
              <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">维保截止日</label>
              <input name="warrantyExpiry" type="date" value={form.warrantyExpiry} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">存放位置</label>
              <input name="location" value={form.location} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="如 3楼A区机房" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">设备价值 (元)</label>
              <input name="value" type="number" step="0.01" value={form.value} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">备注</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "提交中..." : "确认入库"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="rounded-md border px-4 py-2 text-sm">取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
