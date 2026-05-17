"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  total: number;
  inUse: number;
  expiring: number;
  available: number;
  maintenance: number;
  scrapped: number;
  categoryDistribution: { category: string; label: string; count: number }[];
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

const STATUS_LABELS: Record<string, string> = {
  IN_USE: "使用中",
  AVAILABLE: "库存中",
  MAINTENANCE: "维修中",
  SCRAPPED: "已报废",
};

const STATUS_COLORS: Record<string, string> = {
  IN_USE: "bg-blue-500",
  AVAILABLE: "bg-green-500",
  MAINTENANCE: "bg-yellow-500",
  SCRAPPED: "bg-gray-400",
};

const CATEGORY_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316",
];

/**
 * 用户角色类型
 */
type UserRole = "SUPER_ADMIN" | "BRANCH_ADMIN" | "DEPT_MANAGER" | "EMPLOYEE";

/**
 * 获取用户角色对应的权限配置
 * @param role - 用户角色
 * @returns 各模块的显示权限配置
 */
function getRolePermissions(role: UserRole | string | undefined) {
  const isAdmin = role !== "EMPLOYEE";
  const isManager = role === "DEPT_MANAGER" || role === "BRANCH_ADMIN" || role === "SUPER_ADMIN";
  return {
    showStats: true,
    showStatusChart: true,
    showCategoryChart: true,
    showWarrantyReminder: true,
    showDocReminder: isAdmin,
    showQuickAddAsset: isAdmin,
    showQuickImport: isAdmin,
    showQuickApproval: true,
    showQuickOrg: isManager,
  };
}

/**
 * 环形图组件 - 使用SVG绘制
 * @param data - 数据项数组，每项包含标签、数值、颜色
 * @param size - 图表尺寸（直径）
 * @param strokeWidth - 环形宽度
 */
function DonutChart({
  data,
  size = 160,
  strokeWidth = 24,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xs text-gray-400">暂无数据</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* 数据圆环 */}
        {data.map((item, i) => {
          const percentage = item.value / total;
          const dashLength = circumference * percentage;
          const dashOffset = circumference - offset;
          offset += dashLength;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset + dashLength}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-500">总计</span>
      </div>
    </div>
  );
}

/**
 * 柱状图组件 - 使用CSS实现
 * @param data - 数据项数组
 * @param maxValue - 最大值（用于计算比例）
 */
function BarChart({
  data,
  maxValue,
}: {
  data: { label: string; value: number; color: string }[];
  maxValue: number;
}) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-gray-600 truncate" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
          <span className="w-8 shrink-0 text-xs font-medium text-gray-700 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 首页概览组件 - 根据用户角色分权展示内容
 * 管理员：显示全部模块（统计、图表、维保提醒、安全文档、快捷入口）
 * 普通用户：仅显示资产统计、状态图表、维保提醒、审批快捷入口
 */
export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;
  const perms = getRolePermissions(role);

  const [stats, setStats] = useState<Stats>({
    total: 0,
    inUse: 0,
    expiring: 0,
    available: 0,
    maintenance: 0,
    scrapped: 0,
    categoryDistribution: [],
  });
  const [warrantyItems, setWarrantyItems] = useState<ReminderItem[]>([]);
  const [docItems, setDocItems] = useState<DocReminderItem[]>([]);
  const [expiredWarranty, setExpiredWarranty] = useState<ReminderItem[]>([]);
  const [expiredDocs, setExpiredDocs] = useState<DocReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * 获取资产统计数据（总数、使用中、即将到期、品类分布等）
     */
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const data = await res.json();
        setStats({
          total: data.total ?? 0,
          inUse: data.inUse ?? 0,
          expiring: data.expiring ?? 0,
          available: data.available ?? 0,
          maintenance: data.maintenance ?? 0,
          scrapped: data.scrapped ?? 0,
          categoryDistribution: data.categoryDistribution ?? [],
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
        setExpiredWarranty(data.expiredWarranty ?? []);
        setExpiredDocs(data.expiredDocuments ?? []);
      } catch {}
    }

    const promises: Promise<void>[] = [fetchStats()];
    if (perms.showWarrantyReminder || perms.showDocReminder) {
      promises.push(fetchReminders());
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, [perms.showWarrantyReminder, perms.showDocReminder]);

  const statusData = [
    { label: "使用中", value: stats.inUse, color: "#3B82F6" },
    { label: "闲置中", value: stats.available, color: "#10B981" },
    { label: "维修中", value: stats.maintenance, color: "#F59E0B" },
    { label: "已报废", value: stats.scrapped, color: "#9CA3AF" },
  ].filter((d) => d.value > 0);

  const categoryData = (stats.categoryDistribution ?? [])
    .map((c, i) => ({
      label: c.label || c.category,
      value: c.count,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }))
    .filter((d) => d.value > 0);

  const maxCategory = Math.max(...categoryData.map((d) => d.value), 1);

  const urgentCount = (perms.showWarrantyReminder ? warrantyItems.filter((i) => i.daysUntilExpiry <= 7).length + expiredWarranty.length : 0) +
    (perms.showDocReminder ? docItems.filter((i) => i.daysUntilExpiry <= 7).length + expiredDocs.length : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* 头部 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">首页概览</h1>
        <p className="mt-1 text-sm text-gray-500">
          欢迎回来，{session?.user?.name}。{urgentCount > 0 && (
            <span className="ml-1 text-red-600 font-medium">⚠️ 有 {urgentCount} 项紧急提醒</span>
          )}
        </p>
      </div>

      {/* 统计卡片 - 所有角色可见 */}
      {perms.showStats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/assets" className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-lg">📦</div>
              <div className="text-xs text-gray-500">设备总数</div>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="mt-0.5 text-xs text-gray-400">台设备已录入</div>
          </Link>
          <Link href="/assets?status=IN_USE" className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-lg">✅</div>
              <div className="text-xs text-gray-500">使用中</div>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.inUse}</div>
            <div className="mt-0.5 text-xs text-gray-400">使用率 {stats.total > 0 ? Math.round((stats.inUse / stats.total) * 100) : 0}%</div>
          </Link>
          <Link href="/assets" className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-50 text-lg">🔧</div>
              <div className="text-xs text-gray-500">维修中</div>
            </div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
            <div className="mt-0.5 text-xs text-gray-400">待处理设备</div>
          </Link>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-lg">⚠️</div>
              <div className="text-xs text-gray-500">即将到期</div>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">{stats.expiring + (perms.showDocReminder ? docItems.length : 0)}</div>
            <div className="mt-0.5 text-xs text-gray-400">30天内到期</div>
          </div>
        </div>
      )}

      {/* 图表区域 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 状态分布环形图 - 所有角色可见 */}
        {perms.showStatusChart && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">资产状态分布</h2>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <DonutChart data={statusData} size={140} strokeWidth={20} />
              <div className="flex flex-wrap gap-x-4 gap-y-2 sm:flex-col">
                {statusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.label}</span>
                    <span className="text-xs font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 品类分布柱状图 - 所有角色可见 */}
        {perms.showCategoryChart && (
          <div className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">资产品类分布</h2>
            {categoryData.length > 0 ? (
              <BarChart data={categoryData} maxValue={maxCategory} />
            ) : (
              <div className="py-8 text-center text-xs text-gray-400">暂无品类数据</div>
            )}
          </div>
        )}
      </div>

      {/* 到期提醒区域 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 维保到期 - 所有角色可见 */}
        {perms.showWarrantyReminder && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔧</span>
                <h2 className="text-sm font-semibold text-gray-900">维保到期提醒</h2>
                {expiredWarranty.length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                    已过期 {expiredWarranty.length}
                  </span>
                )}
              </div>
              <Link href="/assets" className="text-xs text-blue-600 hover:underline">查看全部</Link>
            </div>

            {/* 已过期 */}
            {expiredWarranty.length > 0 && (
              <div className="mb-3 rounded-lg bg-red-50 p-3">
                <div className="mb-2 text-xs font-medium text-red-700">已过期</div>
                <ul className="space-y-1.5">
                  {expiredWarranty.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <Link href={`/assets/${item.id}`} className="truncate text-gray-900 hover:text-blue-600">
                        {item.name}
                      </Link>
                      <span className="shrink-0 text-xs font-medium text-red-600">已过期</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 即将到期 */}
            {warrantyItems.length > 0 ? (
              <ul className="space-y-2">
                {warrantyItems.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <Link href={`/assets/${item.id}`} className="block truncate text-sm font-medium text-gray-900 hover:text-blue-600">
                        {item.name}
                      </Link>
                      <span className="text-xs text-gray-400">{item.assetNo} {item.branchName && `· ${item.branchName}`}</span>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.daysUntilExpiry <= 7
                        ? "bg-red-100 text-red-600"
                        : item.daysUntilExpiry <= 14
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-600"
                    }`}>
                      {item.daysUntilExpiry} 天
                    </span>
                  </li>
                ))}
              </ul>
            ) : expiredWarranty.length === 0 && (
              <div className="py-6 text-center text-xs text-gray-400">暂无维保到期提醒 ✅</div>
            )}
          </div>
        )}

        {/* 证书/文档到期 - 仅管理员可见 */}
        {perms.showDocReminder && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <h2 className="text-sm font-semibold text-gray-900">安全文档到期</h2>
                {expiredDocs.length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                    已过期 {expiredDocs.length}
                  </span>
                )}
              </div>
              <Link href="/assets" className="text-xs text-blue-600 hover:underline">查看全部</Link>
            </div>

            {/* 已过期 */}
            {expiredDocs.length > 0 && (
              <div className="mb-3 rounded-lg bg-red-50 p-3">
                <div className="mb-2 text-xs font-medium text-red-700">已过期</div>
                <ul className="space-y-1.5">
                  {expiredDocs.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-gray-900">{item.name}</span>
                      <span className="shrink-0 text-xs font-medium text-red-600">已过期</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 即将到期 */}
            {docItems.length > 0 ? (
              <ul className="space-y-2">
                {docItems.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{item.name}</span>
                      <span className="text-xs text-gray-400">{item.assetName} · {item.assetNo}</span>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.daysUntilExpiry <= 7
                        ? "bg-red-100 text-red-600"
                        : item.daysUntilExpiry <= 14
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-600"
                    }`}>
                      {item.daysUntilExpiry} 天
                    </span>
                  </li>
                ))}
              </ul>
            ) : expiredDocs.length === 0 && (
              <div className="py-6 text-center text-xs text-gray-400">暂无文档到期提醒 ✅</div>
            )}
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {perms.showQuickAddAsset && (
          <Link href="/assets/new" className="rounded-xl border bg-blue-50 p-4 shadow-sm transition-all duration-200 hover:bg-blue-100 hover:shadow-md cursor-pointer">
            <div className="text-2xl mb-1">➕</div>
            <div className="text-sm font-semibold text-blue-900">新增资产</div>
            <div className="mt-0.5 text-xs text-blue-600">录入新设备</div>
          </Link>
        )}
        {perms.showQuickImport && (
          <Link href="/assets/import" className="rounded-xl border bg-purple-50 p-4 shadow-sm transition-all duration-200 hover:bg-purple-100 hover:shadow-md cursor-pointer">
            <div className="text-2xl mb-1">📥</div>
            <div className="text-sm font-semibold text-purple-900">批量导入</div>
            <div className="mt-0.5 text-xs text-purple-600">Excel导入资产</div>
          </Link>
        )}
        {perms.showQuickApproval && (
          <Link href="/approvals" className="rounded-xl border bg-green-50 p-4 shadow-sm transition-all duration-200 hover:bg-green-100 hover:shadow-md cursor-pointer">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-sm font-semibold text-green-900">审批管理</div>
            <div className="mt-0.5 text-xs text-green-600">查看待审批</div>
          </Link>
        )}
        {perms.showQuickOrg && (
          <Link href="/org" className="rounded-xl border bg-orange-50 p-4 shadow-sm transition-all duration-200 hover:bg-orange-100 hover:shadow-md cursor-pointer">
            <div className="text-2xl mb-1">👥</div>
            <div className="text-sm font-semibold text-orange-900">组织管理</div>
            <div className="mt-0.5 text-xs text-orange-600">分支/部门/用户</div>
          </Link>
        )}
      </div>
    </div>
  );
}
