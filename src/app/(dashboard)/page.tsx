"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  total: number;
  inUse: number;
  expiring: number;
}

interface ReminderItem {
  id: string;
  assetNo: string;
  name: string;
  daysUntilExpiry: number;
  branchName: string | null;
}
interface DocReminderItem {
  id: string;
  name: string;
  fileName: string;
  assetNo: string;
  assetName: string;
  daysUntilExpiry: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats>({ total: 0, inUse: 0, expiring: 0 });
  const [warrantyItems, setWarrantyItems] = useState<ReminderItem[]>([]);
  const [docItems, setDocItems] = useState<DocReminderItem[]>([]);

  useEffect(() => {
    /**
     * 获取资产统计数据（总数、使用中、即将到期）
     */
    async function fetchStats() {
      try {
        const res = await fetch("/api/assets?page=1&pageSize=9999");
        if (!res.ok) return;
        const data = await res.json();
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiring = data.items.filter(
          (a: { warrantyExpiry: string }) =>
            a.warrantyExpiry && new Date(a.warrantyExpiry) < thirtyDaysLater,
        );
        setStats({
          total: data.total,
          inUse: data.items.filter((a: { status: string }) => a.status === "IN_USE").length,
          expiring: expiring.length,
        });
      } catch {}
    }

    /**
     * 获取维保和证书到期提醒数据
     */
    async function fetchReminders() {
      try {
        const res = await fetch("/api/reminders?days=30");
        if (!res.ok) return;
        const data = await res.json();
        setWarrantyItems(data.warranty ?? []);
        setDocItems(data.documents ?? []);
      } catch {}
    }

    fetchStats();
    fetchReminders();
  }, []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">首页概览</h1>
      <p className="mb-6 text-sm text-gray-500">
        欢迎回来，{session?.user?.name}。
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/assets" className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="text-sm font-medium text-gray-500">设备总数</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="mt-1 text-xs text-gray-400">台设备已录入</div>
        </Link>
        <Link href="/assets?status=IN_USE" className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="text-sm font-medium text-gray-500">使用中</div>
          <div className="mt-1 text-3xl font-bold text-blue-600">{stats.inUse}</div>
          <div className="mt-1 text-xs text-gray-400">当前使用率 {stats.total > 0 ? Math.round((stats.inUse / stats.total) * 100) : 0}%</div>
        </Link>
        <Link href="/assets" className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="text-sm font-medium text-gray-500">即将到期</div>
          <div className="mt-1 text-3xl font-bold text-red-600">{stats.expiring + docItems.length}</div>
          <div className="mt-1 text-xs text-gray-400">30天内维保/证书到期</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {warrantyItems.length > 0 && (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-red-700">⚠️ 维保即将到期</h2>
              <Link href="/assets" className="text-xs text-blue-600 hover:underline">查看全部</Link>
            </div>
            <ul className="divide-y text-sm">
              {warrantyItems.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{item.assetNo}</span>
                    {item.branchName && <span className="ml-2 text-xs text-gray-400">({item.branchName})</span>}
                  </div>
                  <span className={`text-xs font-medium ${item.daysUntilExpiry <= 7 ? "text-red-600" : "text-yellow-600"}`}>
                    {item.daysUntilExpiry} 天
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {docItems.length > 0 && (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-red-700">📄 证书即将到期</h2>
              <Link href="/assets" className="text-xs text-blue-600 hover:underline">查看全部</Link>
            </div>
            <ul className="divide-y text-sm">
              {docItems.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="ml-2 text-xs text-gray-400">({item.assetNo})</span>
                  </div>
                  <span className={`text-xs font-medium ${item.daysUntilExpiry <= 7 ? "text-red-600" : "text-yellow-600"}`}>
                    {item.daysUntilExpiry} 天
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {warrantyItems.length === 0 && docItems.length === 0 && (
        <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center text-sm text-gray-400">
          暂无即将到期的资产或证书，一切正常 ✅
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/assets/new" className="rounded-lg border bg-blue-50 p-5 shadow-sm transition hover:bg-blue-100">
          <div className="text-sm font-semibold text-blue-900">+ 新增资产</div>
          <div className="mt-1 text-xs text-blue-600">录入新设备或安全文档</div>
        </Link>
        <Link href="/approvals" className="rounded-lg border bg-green-50 p-5 shadow-sm transition hover:bg-green-100">
          <div className="text-sm font-semibold text-green-900">审批管理</div>
          <div className="mt-1 text-xs text-green-600">查看待审批和处理中的工单</div>
        </Link>
      </div>
    </div>
  );
}
