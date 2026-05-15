"use client";

import { useEffect, useState } from "react";

interface AuditLogItem {
  id: string;
  userId: string | null;
  user: { id: string; realName: string; username: string } | null;
  username: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: string | null;
  clientIp: string | null;
  createdAt: string;
}

type TabKey = "login" | "user" | "admin";

const TABS: { key: TabKey; label: string }[] = [
  { key: "login", label: "登录日志" },
  { key: "user", label: "用户日志" },
  { key: "admin", label: "管理员日志" },
];

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "登录系统",
  LOGOUT: "登出系统",
  LOGIN_FAILED: "登录失败",
  CREATE_ASSET: "新增资产",
  UPDATE_ASSET: "编辑资产",
  DELETE_ASSET: "删除资产",
  CREATE_APPROVAL: "发起申请",
  CANCEL_APPROVAL: "撤销申请",
  APPROVE: "审批通过",
  REJECT: "审批驳回",
  EXECUTE: "执行审批",
  CREATE_USER: "新增用户",
  UPDATE_USER: "编辑用户",
  CREATE_BRANCH: "新增分支",
  UPDATE_BRANCH: "编辑分支",
  DELETE_BRANCH: "删除分支",
  CREATE_DEPT: "新增部门",
  UPDATE_DEPT: "编辑部门",
  DELETE_DEPT: "删除部门",
  UPDATE_CATEGORY_GROUP: "编辑类型",
  IMPORT_ASSETS: "批量导入",
  DOCUMENT_UPLOAD: "上传文档",
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-green-50 text-green-700",
  LOGOUT: "bg-gray-50 text-gray-600",
  LOGIN_FAILED: "bg-red-50 text-red-700",
  CREATE_ASSET: "bg-blue-50 text-blue-700",
  UPDATE_ASSET: "bg-indigo-50 text-indigo-700",
  DELETE_ASSET: "bg-red-50 text-red-700",
  CREATE_APPROVAL: "bg-yellow-50 text-yellow-700",
  CANCEL_APPROVAL: "bg-gray-50 text-gray-600",
  APPROVE: "bg-emerald-50 text-emerald-700",
  REJECT: "bg-red-50 text-red-700",
  EXECUTE: "bg-purple-50 text-purple-700",
  CREATE_USER: "bg-cyan-50 text-cyan-700",
  UPDATE_USER: "bg-sky-50 text-sky-700",
  CREATE_BRANCH: "bg-teal-50 text-teal-700",
  UPDATE_BRANCH: "bg-teal-50 text-teal-700",
  DELETE_BRANCH: "bg-red-50 text-red-700",
  CREATE_DEPT: "bg-teal-50 text-teal-700",
  UPDATE_DEPT: "bg-teal-50 text-teal-700",
  DELETE_DEPT: "bg-red-50 text-red-700",
  UPDATE_CATEGORY_GROUP: "bg-orange-50 text-orange-700",
  IMPORT_ASSETS: "bg-violet-50 text-violet-700",
  DOCUMENT_UPLOAD: "bg-blue-50 text-blue-700",
};

const TARGET_LABELS: Record<string, string> = {
  ASSET: "资产",
  APPROVAL: "审批",
  USER: "用户",
  BRANCH: "分支",
  DEPT: "部门",
  CATEGORY_GROUP: "字段配置",
  SYSTEM: "系统",
};

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>("login");

  const load = async (p: number, tab: TabKey) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("pageSize", "30");
      params.set("category", tab);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => { load(page, activeTab); }, [page, activeTab]); // eslint-disable-line

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">操作日志</h1>

      <div className="mb-4 flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-3 text-xs text-gray-400">共 {total} 条</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            {activeTab === "login" ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium w-32">操作人</th>
                    <th className="px-4 py-3 font-medium w-32">操作类型</th>
                    <th className="px-4 py-3 font-medium w-36">IP 地址</th>
                    <th className="px-4 py-3 font-medium">详情</th>
                    <th className="px-4 py-3 font-medium w-44">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-gray-400">暂无日志记录</td>
                    </tr>
                  ) : (
                    items.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {log.user?.realName || log.username || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600"}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs text-gray-700">{log.clientIp || "-"}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={log.detail || ""}>
                          {log.detail || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("zh-CN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium w-32">操作人</th>
                    <th className="px-4 py-3 font-medium w-32">操作类型</th>
                    <th className="px-4 py-3 font-medium w-24">目标</th>
                    <th className="px-4 py-3 font-medium">详情</th>
                    <th className="px-4 py-3 font-medium w-44">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-gray-400">暂无日志记录</td>
                    </tr>
                  ) : (
                    items.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {log.user?.realName || log.username || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600"}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-500">{TARGET_LABELS[log.targetType] || log.targetType}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={log.detail || ""}>
                          {log.detail || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("zh-CN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">上一页</button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
