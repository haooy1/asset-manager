"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/shared/utils/dialogs";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { confirm, alert, ConfirmDialog } = useDialog();

  // 密码表单
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "", newPassword: "", confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 重定向未登录用户
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("请填写所有字段");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("新密码长度至少6位");
      return;
    }

    const confirmed = await confirm({
      title: "确认修改密码",
      message: "确定要修改密码吗？",
      confirmText: "确认修改",
      cancelText: "取消",
      type: "warning",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/org/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session?.user?.id,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "修改失败");
        return;
      }
      setSuccess("密码修改成功！");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      await alert({
        title: "成功",
        message: "密码已成功修改",
        type: "success",
      });
    } catch (err) {
      setError("修改密码失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">个人设置</h1>

      {/* 用户信息卡片 */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">基本信息</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">用户名：</span>
            <span>{session?.user?.username}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">姓名：</span>
            <span>{session?.user?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">角色：</span>
            <span>
              {session?.user?.role === "SUPER_ADMIN" ? "超级管理员" :
               session?.user?.role === "BRANCH_ADMIN" ? "分支管理员" :
               session?.user?.role === "DEPT_MANAGER" ? "部门管理员" :
               "普通用户"}
            </span>
          </div>
        </div>
      </div>

      {/* 修改密码 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">修改密码</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">原密码</label>
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="请输入原密码"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">新密码</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="请输入新密码（至少6位）"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">确认新密码</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="请再次输入新密码"
            />
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{success}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:shadow-md disabled:opacity-50 transition-all duration-200 cursor-pointer"
          >
            {loading ? "修改中..." : "修改密码"}
          </button>
        </form>
      </div>

      <ConfirmDialog />
    </div>
  );
}
