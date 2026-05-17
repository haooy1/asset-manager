"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { USER_ROLES, ROLE_LABELS } from "@/modules/org/types";

interface BranchInfo {
  id: string;
  name: string;
  code: string;
  address: string | null;
  contact: string | null;
  isActive: boolean;
  _count?: { departments: number; users: number };
}

interface DeptInfo {
  id: string;
  name: string;
  branchId: string;
  branch?: { id: string; name: string };
  isActive: boolean;
  _count?: { users: number };
}

interface UserInfo {
  id: string;
  username: string;
  realName: string;
  email: string | null;
  role: string;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
}

type FormType = "branch" | "department" | "user";
type EditMode = "info" | "password" | null;

export default function OrgPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.role === "EMPLOYEE") {
      router.replace("/assets");
    }
  }, [session, router]);

  const [tab, setTab] = useState<"branches" | "departments" | "users">("branches");
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [departments, setDepartments] = useState<DeptInfo[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", address: "", contact: "", branchId: "",
    username: "", password: "", realName: "", role: "EMPLOYEE",
    departmentId: "", formType: "branch" as FormType,
  });
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // 编辑用户状态
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editForm, setEditForm] = useState({
    realName: "", email: "", role: "EMPLOYEE",
    branchId: "", departmentId: "", isActive: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "", newPassword: "", confirmPassword: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  const currentUserRole = session?.user?.role;
  const isAdmin = ["SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER"].includes(currentUserRole ?? "");
  const isEmployee = currentUserRole === "EMPLOYEE";

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/branches");
      if (!res.ok) { console.error("获取分支失败"); }
      else { setBranches((await res.json()).data ?? []); }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/departments");
      if (!res.ok) { console.error("获取部门失败"); }
      else { setDepartments((await res.json()).data ?? []); }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/users");
      if (!res.ok) { console.error("获取用户失败"); }
      else { setUsers((await res.json()).data ?? []); }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!session) return;
    if (tab === "branches") fetchBranches();
    else if (tab === "departments") fetchDepartments();
    else fetchUsers();
  }, [tab, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      let res: Response;
      if (form.formType === "branch") {
        res = await fetch("/api/org/branches", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, code: form.code, address: form.address, contact: form.contact }),
        });
      } else if (form.formType === "department") {
        res = await fetch("/api/org/departments", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, branchId: form.branchId }),
        });
      } else {
        res = await fetch("/api/org/users", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username, password: form.password, realName: form.realName,
            role: form.role, branchId: form.branchId || undefined, departmentId: form.departmentId || undefined,
          }),
        });
      }
      if (!res.ok) {
        let msg = "操作失败";
        try { const err = await res.json(); msg = err.message ?? msg; } catch {}
        setError(msg); return;
      }
      setMsg(`${form.formType === "branch" ? "分支" : form.formType === "department" ? "部门" : "用户"}创建成功`);
      setShowForm(false);
      if (form.formType === "branch") fetchBranches();
      else if (form.formType === "department") fetchDepartments();
      else fetchUsers();
    } catch { setError("网络错误，请重试"); }
  };

  // 打开编辑弹窗
  const openEdit = (user: UserInfo, mode: EditMode) => {
    setEditingUser(user);
    setEditMode(mode);
    setError(""); setMsg("");
    if (mode === "info") {
      setEditForm({
        realName: user.realName,
        email: user.email ?? "",
        role: user.role,
        branchId: user.branchId ?? "",
        departmentId: user.departmentId ?? "",
        isActive: user.isActive,
      });
    } else {
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    }
  };

  // 保存用户基础信息编辑
  const handleEditSave = async () => {
    if (!editingUser) return;
    setEditLoading(true); setError("");
    try {
      const body: Record<string, unknown> = { id: editingUser.id };
      if (editForm.realName) body.realName = editForm.realName;
      if (editForm.email !== undefined) body.email = editForm.email || null;
      if (isAdmin) {
        body.role = editForm.role;
        body.branchId = editForm.branchId || null;
        body.departmentId = editForm.departmentId || null;
        body.isActive = editForm.isActive;
      }
      const res = await fetch("/api/org/users", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message || "保存失败");
      } else {
        setMsg("用户信息更新成功");
        setEditingUser(null);
        setEditMode(null);
        fetchUsers();
      }
    } catch { setError("网络错误，请重试"); }
    setEditLoading(false);
  };

  // 保存密码修改
  const handlePasswordSave = async () => {
    if (!editingUser) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("两次输入的新密码不一致"); return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError("新密码至少6位"); return;
    }
    setEditLoading(true); setError("");
    try {
      const body: Record<string, unknown> = {
        id: editingUser.id,
        newPassword: passwordForm.newPassword,
      };
      // 普通用户修改自己的密码需要原密码
      if (!isAdmin || session?.user?.id === editingUser.id) {
        body.oldPassword = passwordForm.oldPassword;
      }
      const res = await fetch("/api/org/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message || "密码修改失败");
      } else {
        setMsg("密码修改成功");
        setEditingUser(null);
        setEditMode(null);
      }
    } catch { setError("网络错误，请重试"); }
    setEditLoading(false);
  };

  if (!session) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">组织管理</h1>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto border-b pb-px">
          {(["branches", "departments", "users"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t === "branches" ? "分支管理" : t === "departments" ? "部门管理" : "用户管理"}
            </button>
          ))}
        </div>
        {tab !== "users" && (
          <button onClick={() => { setShowForm(true); setForm({ ...form, formType: tab === "branches" ? "branch" : "department", name: "", code: "", address: "", contact: "", branchId: "" }); setError(""); setMsg(""); }}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:px-4">
            + 新增{tab === "branches" ? "分支" : "部门"}
          </button>
        )}
      </div>

      {msg && <div className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {/* 新增表单 */}
      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm max-w-lg">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            新增{form.formType === "branch" ? "分支" : form.formType === "department" ? "部门" : "用户"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            {form.formType === "branch" && (
              <>
                <input placeholder="分支名称 *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="分支编码 *" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="地址" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="联系方式" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </>
            )}
            {form.formType === "department" && (
              <>
                <input placeholder="部门名称 *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">选择所属分支 *</option>
                  {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
              </>
            )}
            <div className="flex gap-2">
              <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">确认</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-4 py-2 text-sm">取消</button>
            </div>
          </form>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {editingUser && editMode === "info" && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm max-w-lg">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">编辑用户 - {editingUser.username}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">真实姓名</label>
              <input value={editForm.realName} onChange={(e) => setEditForm({ ...editForm, realName: e.target.value })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">邮箱</label>
              <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            {isAdmin && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">角色</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {USER_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">所属分支</label>
                  <select value={editForm.branchId} onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="">无</option>
                    {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">所属部门</label>
                  <select value={editForm.departmentId} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="">无</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <label htmlFor="isActive" className="text-sm text-gray-700">账号启用</label>
                </div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={handleEditSave} disabled={editLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{editLoading ? "保存中..." : "保存"}</button>
              <button onClick={() => { setEditingUser(null); setEditMode(null); }} className="rounded-md border px-4 py-2 text-sm">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {editingUser && editMode === "password" && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm max-w-lg">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {isAdmin && session?.user?.id !== editingUser.id ? "重置密码" : "修改密码"} - {editingUser.username}
          </h2>
          <div className="space-y-3">
            {/* 普通用户修改自己的密码需要原密码 */}
            {(!isAdmin || session?.user?.id === editingUser.id) && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">原密码 *</label>
                <input type="password" value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">新密码 *</label>
              <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">确认新密码 *</label>
              <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handlePasswordSave} disabled={editLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{editLoading ? "保存中..." : "保存"}</button>
              <button onClick={() => { setEditingUser(null); setEditMode(null); }} className="rounded-md border px-4 py-2 text-sm">取消</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              {tab === "branches" && (
                <tr>
                  <th className="px-4 py-3">分支名称</th><th className="px-4 py-3">编码</th><th className="px-4 py-3">地址</th><th className="px-4 py-3">部门数</th><th className="px-4 py-3">用户数</th><th className="px-4 py-3">状态</th>
                </tr>
              )}
              {tab === "departments" && (
                <tr>
                  <th className="px-4 py-3">部门名称</th><th className="px-4 py-3">所属分支</th><th className="px-4 py-3">用户数</th><th className="px-4 py-3">状态</th>
                </tr>
              )}
              {tab === "users" && (
                <tr>
                  <th className="px-4 py-3">用户名</th><th className="px-4 py-3">姓名</th><th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">所属分支</th><th className="px-4 py-3">所属部门</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">操作</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y">
              {tab === "branches" && branches.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">暂无分支数据</td></tr>}
              {tab === "departments" && departments.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-500">暂无部门数据</td></tr>}
              {tab === "users" && users.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">暂无用户数据</td></tr>}

              {tab === "branches" && branches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.code}</td>
                  <td className="px-4 py-3 text-gray-600">{b.address ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{b._count?.departments ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{b._count?.users ?? 0}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${b.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{b.isActive ? "启用" : "停用"}</span></td>
                </tr>
              ))}
              {tab === "departments" && departments.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.branch?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{d._count?.users ?? 0}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${d.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{d.isActive ? "启用" : "停用"}</span></td>
                </tr>
              ))}
              {tab === "users" && users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                  <td className="px-4 py-3 text-gray-600">{u.realName}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</span></td>
                  <td className="px-4 py-3 text-gray-600">{u.branch?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{u.department?.name ?? "-"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${u.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{u.isActive ? "启用" : "停用"}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* 管理员可编辑所有用户，普通用户只能编辑自己 */}
                      {(isAdmin || session?.user?.id === u.id) && (
                        <>
                          <button onClick={() => openEdit(u, "info")} className="text-xs text-blue-600 hover:underline">编辑</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => openEdit(u, "password")} className="text-xs text-blue-600 hover:underline">
                            {isAdmin && session?.user?.id !== u.id ? "重置密码" : "修改密码"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
