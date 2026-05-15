"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  FIELD_TYPES, FIELD_TYPE_LABELS,
  type CategoryGroupInfo, type CustomFieldInfo, type FieldType,
} from "@/modules/assets/custom-types";

export default function AssetTypesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role !== "EMPLOYEE";

  const [groups, setGroups] = useState<CategoryGroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroupInfo | null>(null);
  const [fields, setFields] = useState<CustomFieldInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddType, setShowAddType] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [showEditField, setShowEditField] = useState<CustomFieldInfo | null>(null);

  const [typeForm, setTypeForm] = useState({ name: "", label: "" });
  const [fieldForm, setFieldForm] = useState({
    name: "", label: "", fieldType: "TEXT" as FieldType, options: "", required: false,
  });

  /**
   * 加载设备类型列表
   */
  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/category-groups");
      if (!res.ok) throw new Error("加载失败");
      const { data } = await res.json();
      setGroups(data);
      if (!selectedGroup && data.length > 0) {
        setSelectedGroup(data[0]);
      }
    } catch {
      setError("加载设备类型失败");
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  /**
   * 加载指定设备类型的自定义字段
   */
  const loadFields = useCallback(async (groupId: string) => {
    try {
      const res = await fetch(`/api/category-groups/${groupId}/fields`);
      if (!res.ok) throw new Error("加载失败");
      const { data } = await res.json();
      setFields(data);
    } catch {
      setFields([]);
    }
  }, []);

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => {
    if (selectedGroup) {
      loadFields(selectedGroup.id);
    }
  }, [selectedGroup, loadFields]);

  /**
   * 创建设备类型
   */
  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/category-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "创建失败");
      }
      const { data } = await res.json();
      setGroups([...groups, data]);
      setSelectedGroup(data);
      setShowAddType(false);
      setTypeForm({ name: "", label: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
  };

  /**
   * 更新设备类型名称
   */
  const handleUpdateType = async (group: CategoryGroupInfo) => {
    const newLabel = prompt("请输入新的设备类型名称:", group.label);
    if (!newLabel || newLabel === group.label) return;
    try {
      const res = await fetch(`/api/category-groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel }),
      });
      if (!res.ok) throw new Error("更新失败");
      setGroups(groups.map(g => g.id === group.id ? { ...g, label: newLabel } : g));
      if (selectedGroup?.id === group.id) {
        setSelectedGroup({ ...selectedGroup, label: newLabel });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  };

  /**
   * 删除自定义设备类型
   */
  const handleDeleteType = async (group: CategoryGroupInfo) => {
    if (!confirm(`确定删除设备类型「${group.label}」吗？关联的自定义字段也将被删除。`)) return;
    try {
      const res = await fetch(`/api/category-groups/${group.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setGroups(groups.filter(g => g.id !== group.id));
      if (selectedGroup?.id === group.id) {
        setSelectedGroup(groups.find(g => g.id !== group.id) || null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  /**
   * 创建自定义字段
   */
  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/category-groups/${selectedGroup.id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fieldForm,
          options: fieldForm.fieldType === "SELECT" ? fieldForm.options : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "创建失败");
      }
      const { data } = await res.json();
      setFields([...fields, data]);
      setShowAddField(false);
      setFieldForm({ name: "", label: "", fieldType: "TEXT" as FieldType, options: "", required: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
  };

  /**
   * 更新自定义字段
   */
  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!showEditField) return;
    try {
      const res = await fetch(`/api/fields/${showEditField.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fieldForm,
          options: fieldForm.fieldType === "SELECT" ? fieldForm.options : null,
        }),
      });
      if (!res.ok) throw new Error("更新失败");
      setFields(fields.map(f => f.id === showEditField.id ? {
        ...f, ...fieldForm,
        options: fieldForm.fieldType === "SELECT" ? fieldForm.options : null,
      } : f));
      setShowEditField(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  };

  /**
   * 删除自定义字段
   */
  const handleDeleteField = async (field: CustomFieldInfo) => {
    if (!confirm(`确定删除字段「${field.label}」吗？`)) return;
    try {
      const res = await fetch(`/api/fields/${field.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setFields(fields.filter(f => f.id !== field.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  /**
   * 打开编辑字段弹窗
   */
  const openEditField = (field: CustomFieldInfo) => {
    setShowEditField(field);
    setFieldForm({
      name: field.name, label: field.label, fieldType: field.fieldType,
      options: field.options || "", required: field.required,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">字段配置</h1>
        {isAdmin && (
          <button onClick={() => setShowAddType(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + 新增设备类型
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* 左侧：设备类型列表 */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="border-b px-4 py-3 text-sm font-medium text-gray-700">设备类型</div>
            <div className="divide-y">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                    selectedGroup?.id === group.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{group.label}</span>
                    {group.isBuiltin && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">内置</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{group._count?.assets ?? 0}</span>
                </button>
              ))}
              {groups.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">暂无设备类型</div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：自定义字段管理 */}
        <div className="lg:col-span-3">
          {selectedGroup ? (
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {selectedGroup.label} — 自定义字段
                  </span>
                  {selectedGroup.isBuiltin && (
                    <span className="ml-2 text-xs text-gray-400">（内置类型，不可删除）</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!selectedGroup.isBuiltin && isAdmin && (
                    <>
                      <button onClick={() => handleUpdateType(selectedGroup)}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                        重命名
                      </button>
                      <button onClick={() => handleDeleteType(selectedGroup)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                        删除类型
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <button onClick={() => setShowAddField(true)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                      + 新增字段
                    </button>
                  )}
                </div>
              </div>

              {fields.length > 0 ? (
                <div className="divide-y">
                  {fields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-sm font-medium text-gray-800">{field.label}</span>
                          <span className="ml-2 text-xs text-gray-400">({field.name})</span>
                        </div>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {FIELD_TYPE_LABELS[field.fieldType]}
                        </span>
                        {field.required && (
                          <span className="text-xs text-red-500">*必填</span>
                        )}
                        {field.fieldType === "SELECT" && field.options && (
                          <span className="text-xs text-gray-400">选项: {field.options}</span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button onClick={() => openEditField(field)}
                            className="rounded border px-2 py-1 text-xs text-gray-500 hover:bg-gray-50">
                            编辑
                          </button>
                          <button onClick={() => handleDeleteField(field)}
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50">
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-12 text-center text-sm text-gray-400">
                  暂无自定义字段，点击「+ 新增字段」添加
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border bg-white text-sm text-gray-400">
              请选择左侧设备类型
            </div>
          )}
        </div>
      </div>

      {/* 新增设备类型弹窗 */}
      {showAddType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">新增设备类型</h2>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">类型标识 *</label>
                <input required value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="如 VR_DEVICE（英文+下划线）" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">类型名称 *</label>
                <input required value={typeForm.label} onChange={e => setTypeForm({ ...typeForm, label: e.target.value })}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="如 VR设备" />
              </div>
              <div className="flex gap-3">
                <button type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  确认创建
                </button>
                <button type="button" onClick={() => setShowAddType(false)}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 transition-colors">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增/编辑自定义字段弹窗 */}
      {(showAddField || showEditField) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">
              {showEditField ? "编辑自定义字段" : "新增自定义字段"}
            </h2>
            <form onSubmit={showEditField ? handleUpdateField : handleCreateField} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">字段标识 *</label>
                  <input required value={fieldForm.name} onChange={e => setFieldForm({ ...fieldForm, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="如 screen_size" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">显示名称 *</label>
                  <input required value={fieldForm.label} onChange={e => setFieldForm({ ...fieldForm, label: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="如 屏幕尺寸" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">字段类型</label>
                <select value={fieldForm.fieldType}
                  onChange={e => setFieldForm({ ...fieldForm, fieldType: e.target.value as FieldType })}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm">
                  {FIELD_TYPES.map(t => (
                    <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              {fieldForm.fieldType === "SELECT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">选项列表</label>
                  <input value={fieldForm.options}
                    onChange={e => setFieldForm({ ...fieldForm, options: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="用逗号分隔，如: 选项A,选项B,选项C" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fieldForm.required}
                  onChange={e => setFieldForm({ ...fieldForm, required: e.target.checked })}
                  className="rounded" />
                必填字段
              </label>
              <div className="flex gap-3">
                <button type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  {showEditField ? "保存修改" : "确认创建"}
                </button>
                <button type="button"
                  onClick={() => { setShowAddField(false); setShowEditField(null); }}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 transition-colors">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
