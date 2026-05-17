"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getApprovals } from "@/modules/approvals/services";
import type { ApprovalInfo, ApprovalType, ApprovalStatus } from "@/modules/approvals/types";
import { TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/modules/approvals/types";
import { useDialog } from "@/shared/utils/dialogs";

export default function ApprovalListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { confirm, alert, ConfirmDialog } = useDialog();
  const [items, setItems] = useState<ApprovalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"my" | "pending" | "execute">("my");
  const isEmployee = session?.user?.role === "EMPLOYEE";

  const tabs = isEmployee
    ? ([["my", "我的申请"]] as const)
    : ([["my", "我的申请"], ["pending", "待我审批"], ["execute", "待我执行"]] as const);

  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);
    fetch(`/api/approvals?view=${view}`)
      .then(async (r) => {
        if (!r.ok) {
          let msg = `请求失败 (${r.status})`;
          try {
            const err = await r.json();
            msg = err.message ?? msg;
          } catch {}
          throw new Error(msg);
        }
        return r.json();
      })
      .then((d) => setItems(d.items ?? []))
      .catch((err) => {
        console.error("获取审批列表失败:", err.message);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [view, session]);

  const handleCancel = async (approvalId: string) => {
    const ok = await confirm({
      title: "撤销申请",
      message: "确认撤销该申请？撤销后资产将恢复为可领用状态。",
      confirmText: "撤销",
      cancelText: "取消",
      type: "warning",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const err = await res.json();
        await alert({ title: "撤销失败", message: err.message || "撤销失败", type: "error" });
        return;
      }
      setItems(prev => prev.map(item =>
        item.id === approvalId ? { ...item, status: "CANCELLED" as ApprovalStatus } : item
      ));
    } catch {
      await alert({ title: "错误", message: "网络错误，请重试", type: "error" });
    }
  };

  if (!session) return null;

  return (
    <div>
      <ConfirmDialog />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">审批管理</h1>
        <Link href="/approvals/new" className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 hover:shadow-md sm:px-4 transition-all duration-200 cursor-pointer">
          + 发起申请
        </Link>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto border-b pb-px">
        {tabs.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer ${
              view === v
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* 移动端卡片列表 */}
          <div className="md:hidden space-y-3">
            {items.length === 0 ? (
              <div className="rounded-lg border bg-white py-12 text-center text-gray-500 shadow-sm">
                暂无审批记录
              </div>
            ) : (
              items.map((ap) => (
                <div key={ap.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="font-medium text-gray-900">{TYPE_LABELS[ap.type as ApprovalType]}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ap.status as ApprovalStatus]}`}>
                      {STATUS_LABELS[ap.status as ApprovalStatus]}
                    </span>
                  </div>
                  <div className="mb-1 text-sm text-gray-900">{ap.asset.name}</div>
                  <div className="mb-3 font-mono text-xs text-gray-400">{ap.asset.assetNo}</div>
                  <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                    <span>申请人: {ap.applicant?.realName}</span>
                    <span className="text-gray-300">|</span>
                    <span>{new Date(ap.createdAt).toLocaleDateString("zh-CN")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/approvals/${ap.id}`}
                      className="rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-all duration-200 cursor-pointer">
                      查看详情
                    </Link>
                    {view === "my" && ap.status === "PENDING" && (
                      <button
                        onClick={() => handleCancel(ap.id)}
                        className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-all duration-200 cursor-pointer"
                      >
                        撤销
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 桌面端表格 */}
          <div className="hidden md:block overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">资产</th>
                  <th className="px-4 py-3 font-medium">申请人</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      暂无审批记录
                    </td>
                  </tr>
                ) : (
                  items.map((ap) => (
                    <tr key={ap.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{TYPE_LABELS[ap.type as ApprovalType]}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {ap.asset.name} <span className="text-xs text-gray-400">{ap.asset.assetNo}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ap.applicant?.realName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ap.status as ApprovalStatus]}`}>
                          {STATUS_LABELS[ap.status as ApprovalStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(ap.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/approvals/${ap.id}`}
                          className="rounded px-3 py-1.5 text-blue-600 text-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-800 cursor-pointer">查看</Link>
                        {view === "my" && ap.status === "PENDING" && (
                          <>
                            <span className="mx-2 text-gray-300">|</span>
                            <button
                              onClick={() => handleCancel(ap.id)}
                              className="bg-transparent border-0 cursor-pointer rounded px-3 py-1.5 text-red-500 text-sm transition-all duration-200 hover:bg-red-50 hover:text-red-700"
                            >
                              撤销
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
