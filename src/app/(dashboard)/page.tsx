"use client";

import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">首页概览</h1>
      <p className="text-gray-600">
        欢迎回来，{session?.user?.name}。
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">设备总数</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">-</div>
          <div className="mt-1 text-xs text-gray-400">等待数据加载</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">使用中</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">-</div>
          <div className="mt-1 text-xs text-gray-400">等待数据加载</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">即将到期</div>
          <div className="mt-1 text-3xl font-bold text-red-600">-</div>
          <div className="mt-1 text-xs text-gray-400">维保/证书到期提醒</div>
        </div>
      </div>
    </div>
  );
}
