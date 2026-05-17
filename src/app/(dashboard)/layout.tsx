"use client";

import "@/shared/utils/cn";
import { SessionProvider } from "next-auth/react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_GROUPS = [
  {
    title: "核心功能",
    items: [
      {
        label: "首页概览",
        href: "/",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
          </svg>
        ),
      },
      {
        label: "资产列表",
        href: "/assets",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "业务流程",
    items: [
      {
        label: "审批管理",
        href: "/approvals",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "系统管理",
    items: [
      {
        label: "组织管理",
        href: "/org",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: "字段配置",
        href: "/assets/types",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: "操作日志",
        href: "/audit-logs",
        adminOnly: true,
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
];

const MOBILE_NAV = [
  { label: "首页", href: "/", icon: "🏠" },
  { label: "资产", href: "/assets", icon: "📦" },
  { label: "审批", href: "/approvals", icon: "✅" },
  { label: "组织", href: "/org", icon: "👥" },
  { label: "类型", href: "/assets/types", icon: "⚙️" },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const isEmployee = session.user?.role === "EMPLOYEE";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:bg-gray-900 md:text-white">
        <div className="flex h-14 items-center gap-2 border-b border-gray-700 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500 text-xs font-bold">IT</div>
          <span className="text-sm font-medium">资产管理系统</span>
        </div>

        <nav className="flex-1 space-y-4 px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              item => !isEmployee || (!item.adminOnly && item.href !== "/org" && item.href !== "/assets/types")
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                        }`}>
                        {item.icon}{item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-gray-700 px-3 py-3">
          <div className="mb-2 truncate px-1 text-xs text-gray-400">{session.user?.name}</div>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出登录
          </button>
        </div>
      </aside>

      {/* 移动端顶部导航 */}
      <div className="md:hidden flex items-center justify-between bg-gray-900 text-white px-4 h-12">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded hover:bg-gray-700">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-medium">IT资产管理系统</span>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-gray-400 hover:text-white px-2">
          退出
        </button>
      </div>

      {/* 移动端下拉菜单 */}
      {sidebarOpen && (
        <div className="md:hidden bg-gray-800 text-white px-3 py-2 space-y-1 border-t border-gray-700">
          {MOBILE_NAV.filter(item => !isEmployee || (item.href !== "/org" && item.href !== "/assets/types")).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}>
                <span>{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* 移动端底部导航栏 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex">
          {MOBILE_NAV.filter(item => !isEmployee || (item.href !== "/org" && item.href !== "/assets/types")).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}>
                <span className="text-lg">{item.icon}</span>
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto bg-gray-50 pb-16 md:pb-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  );
}
