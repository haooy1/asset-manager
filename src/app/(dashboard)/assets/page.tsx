"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, type AssetInfo, ASSET_STATUS, ASSET_CATEGORIES } from "@/modules/assets/types";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const isEmployee = session?.user?.role === "EMPLOYEE";
  const isAdmin = !isEmployee;

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
        const result = await res.json();
        setData(result);
        setSelectedIds(new Set());
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

  /**
   * 切换单条资产选中状态
   */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * 切换全选/取消全选
   */
  const toggleSelectAll = () => {
    if (selectedIds.size === data.items.length && data.items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.items.map((item) => item.id)));
    }
  };

  /**
   * 删除单条资产（二次确认）
   */
  const handleDelete = async (asset: AssetInfo) => {
    if (!confirm(`确定要删除资产「${asset.name}」(${asset.assetNo}) 吗？此操作不可恢复。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "删除失败");
      } else {
        fetchData();
      }
    } catch {
      alert("网络错误，请重试");
    }
    setDeleting(false);
  };

  /**
   * 批量删除选中资产（二次确认）
   */
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const names = data.items
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.name)
      .slice(0, 5);
    const more = selectedIds.size > 5 ? ` 等共 ${selectedIds.size} 条资产` : ` 共 ${selectedIds.size} 条资产`;
    if (!confirm(`确定要删除以下资产吗？此操作不可恢复。\n\n${names.join("、")}${more}`)) return;

    setDeleting(true);
    let success = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    if (failed > 0) {
      alert(`删除完成：成功 ${success} 条，失败 ${failed} 条`);
    }
    setSelectedIds(new Set());
    fetchData();
    setDeleting(false);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">资产列表</h1>
        {!isEmployee && (
          <div className="flex gap-2">
            <Link
              href="/assets/import"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:px-4"
            >
              📥 批量导入
            </Link>
            <Link
              href="/assets/new"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
            >
              + 新增资产
            </Link>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          type="text"
          placeholder="搜索编号/名称/型号..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
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

      {/* 批量操作栏 */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2 text-sm">
          <span className="text-blue-800">已选择 <span className="font-bold">{selectedIds.size}</span> 条资产</span>
          <button
            onClick={handleBatchDelete}
            disabled={deleting}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "删除中..." : "批量删除"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            取消选择
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* 移动端卡片列表 */}
          <div className="md:hidden space-y-3">
            {data.items.length === 0 ? (
              <div className="rounded-lg border bg-white py-12 text-center text-gray-500 shadow-sm">
                暂无资产数据
              </div>
            ) : (
              data.items.map((asset) => {
                const docCount = asset._count?.documents ?? 0;
                const isSelected = selectedIds.has(asset.id);
                return (
                  <div key={asset.id} className={`rounded-lg border bg-white p-4 shadow-sm ${isSelected ? "ring-2 ring-blue-300" : ""}`}>
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(asset.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        <Link href={`/assets/${asset.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {asset.name}
                        </Link>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
                        {STATUS_LABELS[asset.status]}
                      </span>
                    </div>
                    <div className="mb-2 font-mono text-xs text-gray-500">{asset.assetNo}</div>
                    <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                      <span>{asset.categoryGroup?.label || CATEGORY_LABELS[asset.category]}</span>
                      <span className="text-gray-300">|</span>
                      <span>{asset.assignedUser?.realName ?? "未分配"}</span>
                      <span className="text-gray-300">|</span>
                      <span>{asset.branch?.name ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {docCount > 0 ? (
                        <Link href={`/assets/${asset.id}/documents`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          文档 {docCount}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-300">无文档</span>
                      )}
                      <div className="flex gap-2">
                        <Link href={`/assets/${asset.id}`}
                          className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">
                          查看
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(asset)}
                            disabled={deleting}
                            className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 桌面端表格 */}
          <div className="hidden md:block overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  {isAdmin && (
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={data.items.length > 0 && selectedIds.size === data.items.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
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
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-12 text-center text-gray-500">
                      暂无资产数据
                    </td>
                  </tr>
                ) : (
                  data.items.map((asset) => {
                    const docCount = asset._count?.documents ?? 0;
                    const isSelected = selectedIds.has(asset.id);
                    return (
                    <tr key={asset.id} className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}>
                      {isAdmin && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(asset.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
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
                          <Link href={`/assets/${asset.id}/documents`} title="查看附件文档"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
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
                        <div className="flex items-center gap-2">
                          <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:underline text-xs">
                            查看
                          </Link>
                          {isAdmin && (
                            <>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDelete(asset)}
                                disabled={deleting}
                                className="text-xs text-red-600 hover:underline disabled:opacity-50"
                              >
                                删除
                              </button>
                            </>
                          )}
                        </div>
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
                className="rounded-md border px-4 py-2 text-sm disabled:opacity-30 active:bg-gray-100"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages}（共 {data.total} 条）
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border px-4 py-2 text-sm disabled:opacity-30 active:bg-gray-100"
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
