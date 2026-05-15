"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getApprovals } from "@/modules/approvals/services";
import type { ApprovalInfo, ApprovalType, ApprovalStatus } from "@/modules/approvals/types";
import { TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/modules/approvals/types";

export default function ApprovalListPage() {
  const { data: session } = useSession();
  const router = useRouter();
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

  if (!session) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">审批管理</h1>
        <Link href="/approvals/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + 发起申请
        </Link>
      </div>

      <div className="mb-4 flex gap-2 border-b">
        {tabs.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
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
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
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
                    <td className="px-4 py-3">
                      <Link href={`/approvals/${ap.id}`} className="text-blue-600 hover:underline text-xs">查看</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
