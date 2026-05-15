"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, type AssetInfo, type AssetStatus, type AssetCategory, ASSET_STATUS, ASSET_CATEGORIES } from "@/modules/assets/types";

function AssetListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [data, setData] = useState<{ total: number; items: AssetInfo[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  const isEmployee = session?.user?.role === "EMPLOYEE";

  /**
   * 获取资产列表数据（支持关键词、状态、品类筛选及分页）
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    params.set("page", String(page));
    params.set("pageSize", "20");

    try {
      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) {
        let msg = "获取资产列表失败";
        try {
          const err = await res.json();
          msg = err.message ?? msg;
        } catch {}
        console.error(msg);
      } else {
        setData(await res.json());
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [keyword, status, category, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(data.total / 20);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">资产列表</h1>
        {!isEmployee && (
          <Link
            href="/assets/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 新增资产
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="搜索编号/名称/型号..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">全部状态</option>
          {ASSET_STATUS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">全部品类</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">资产编号</th>
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">品类</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">归属人</th>
                  <th className="px-4 py-3 font-medium">所属分支</th>
                  <th className="px-4 py-3 font-medium">文档</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      暂无资产数据
                    </td>
                  </tr>
                ) : (
                  data.items.map((asset) => {
                    const docCount = asset._count?.documents ?? 0;
                    return (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{asset.assetNo}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/assets/${asset.id}`} className="hover:text-blue-600">
                          {asset.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {asset.categoryGroup?.label || CATEGORY_LABELS[asset.category]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
                          {STATUS_LABELS[asset.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{asset.assignedUser?.realName ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{asset.branch?.name ?? "-"}</td>
                      <td className="px-4 py-3">
                        {docCount > 0 ? (
                          <Link href={`/assets/${asset.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            {docCount}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:underline text-xs">
                          查看
                        </Link>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-30"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages}（共 {data.total} 条）
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-30"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AssetListPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <AssetListContent />
    </Suspense>
  );
}
