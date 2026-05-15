"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ASSET_CATEGORIES, CATEGORY_LABELS, type AssetCategory } from "@/modules/assets/types";
import type { CategoryGroupInfo, CustomFieldInfo, CustomFieldValueInput } from "@/modules/assets/custom-types";

export default function NewAssetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    assetNo: "",
    name: "",
    model: "",
    brand: "",
    category: "PC" as AssetCategory,
    purchaseDate: "",
    warrantyExpiry: "",
    location: "",
    value: "",
    description: "",
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");

  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupInfo[]>([]);
  const [selectedCategoryGroupId, setSelectedCategoryGroupId] = useState("");
  const [customFields, setCustomFields] = useState<CustomFieldInfo[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  /**
   * 加载所有设备类型
   */
  useEffect(() => {
    fetch("/api/category-groups")
      .then(res => res.json())
      .then(({ data }) => {
        if (data) setCategoryGroups(data);
      })
      .catch(() => {});
  }, []);

  /**
   * 当选择的品类或自定义类型变更时，加载对应的自定义字段
   */
  const loadCustomFields = useCallback(async (groupId: string) => {
    if (!groupId) {
      setCustomFields([]);
      setFieldValues({});
      return;
    }
    try {
      const res = await fetch(`/api/category-groups/${groupId}/fields`);
      if (!res.ok) { setCustomFields([]); return; }
      const { data } = await res.json();
      setCustomFields(data || []);
      setFieldValues({});
    } catch {
      setCustomFields([]);
    }
  }, []);

  /**
   * 根据选中的 category 自动匹配 CategoryGroup
   */
  useEffect(() => {
    const matched = categoryGroups.find(g => g.name === form.category);
    if (matched) {
      setSelectedCategoryGroupId(matched.id);
      loadCustomFields(matched.id);
    }
  }, [form.category, categoryGroups, loadCustomFields]);

  /**
   * 处理自定义类型选择
   */
  const handleCustomTypeChange = (groupId: string) => {
    setSelectedCategoryGroupId(groupId);
    loadCustomFields(groupId);
  };

  /**
   * 处理自定义字段值变更
   */
  const handleFieldValueChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  /**
   * 处理表单输入变更
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * 提交新增资产表单（含自定义字段），安全文档创建后自动上传报告文件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const customFieldValues: CustomFieldValueInput[] = customFields
      .filter(f => fieldValues[f.id] !== undefined && fieldValues[f.id] !== "")
      .map(f => ({ fieldId: f.id, value: fieldValues[f.id] }));

    const body: Record<string, unknown> = {
      ...form,
      value: form.value ? Number(form.value) : undefined,
      categoryGroupId: selectedCategoryGroupId || undefined,
      customFieldValues,
    };

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = "创建失败";
        try {
          const err = await res.json();
          msg = err.message ?? msg;
        } catch {}
        setError(msg);
        setLoading(false);
        return;
      }

      const result = await res.json();
      const assetId = result.data.id;

      if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("name", uploadFileName || form.name);
        if (form.warrantyExpiry) {
          formData.append("expiryDate", form.warrantyExpiry);
        }

        const uploadRes = await fetch(`/api/assets/${assetId}`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error("文件上传失败，但资产已创建");
        }
      }

      router.push(`/assets/${assetId}`);
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  };

  const customGroups = categoryGroups.filter(g => !g.isBuiltin);
  const showCustomTypeSelector = form.category === "CUSTOM";

  if (form.category === "SECURITY_DOCUMENT") {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">新增安全文档</h1>
        <div className="rounded-lg border bg-white p-6 shadow-sm max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">文档编号 *</label>
                <input name="assetNo" required value={form.assetNo} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="如 DOC-2026-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">文档名称 *</label>
                <input name="name" required value={form.name} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="如 2025年度渗透测试报告" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">生效日期</label>
                <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">到期日期</label>
                <input name="warrantyExpiry" type="date" value={form.warrantyExpiry} onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <input type="hidden" name="category" value="SECURITY_DOCUMENT" />
            </div>

            <div className="rounded-md border border-green-200 bg-green-50/30 p-4">
              <h3 className="mb-3 text-sm font-medium text-green-800">上传报告文件</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">文件名称</label>
                  <input value={uploadFileName}
                    onChange={e => setUploadFileName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder={form.name || "如 渗透测试报告.pdf"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">选择文件</label>
                  <input type="file"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100" />
                  {uploadFile && (
                    <p className="mt-1 text-xs text-gray-500">已选择: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>
                  )}
                </div>
              </div>
            </div>

            {customFields.length > 0 && (
              <div className="rounded-md border border-blue-200 bg-blue-50/30 p-4">
                <h3 className="mb-3 text-sm font-medium text-blue-800">安全文档 — 详细信息</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {customFields.map((field) => {
                    const value = fieldValues[field.id] ?? "";

                    if (field.fieldType === "BOOLEAN") {
                      return (
                        <label key={field.id} className="flex items-center gap-2 pt-2">
                          <input type="checkbox" checked={value === "true"}
                            onChange={e => handleFieldValueChange(field.id, e.target.checked ? "true" : "false")}
                            className="rounded" />
                          <span className="text-sm text-gray-700">{field.label}{field.required ? " *" : ""}</span>
                        </label>
                      );
                    }

                    if (field.fieldType === "SELECT" && field.options) {
                      const opts = field.options.split(",").map(o => o.trim());
                      return (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                          <select value={value}
                            onChange={e => handleFieldValueChange(field.id, e.target.value)}
                            required={field.required}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                            <option value="">-- 请选择 --</option>
                            {opts.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    if (field.fieldType === "DATE") {
                      return (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                          <input type="date" value={value}
                            onChange={e => handleFieldValueChange(field.id, e.target.value)}
                            required={field.required}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                      );
                    }

                    if (field.fieldType === "NUMBER") {
                      return (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                          <input type="number" step="any" value={value}
                            onChange={e => handleFieldValueChange(field.id, e.target.value)}
                            required={field.required}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                      );
                    }

                    if (field.fieldType === "LONGTEXT") {
                      return (
                        <div key={field.id} className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                          <textarea value={value}
                            onChange={e => handleFieldValueChange(field.id, e.target.value)}
                            required={field.required} rows={3}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                      );
                    }

                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                        <input value={value}
                          onChange={e => handleFieldValueChange(field.id, e.target.value)}
                          required={field.required}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">备注说明</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div className="flex gap-3">
              <button type="submit" disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? "提交中..." : "确认入库"}
              </button>
              <button type="button" onClick={() => router.back()}
                className="rounded-md border px-4 py-2 text-sm">取消</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">新增资产</h1>
      <div className="rounded-lg border bg-white p-6 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">资产编号 *</label>
              <input name="assetNo" required value={form.assetNo} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="如 PC-2026-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">资产名称 *</label>
              <input name="name" required value={form.name} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="如 ThinkPad X1 Carbon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">型号</label>
              <input name="model" value={form.model} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">品牌</label>
              <input name="brand" value={form.brand} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">品类 *</label>
              <select name="category" required value={form.category} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            {showCustomTypeSelector && customGroups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">选择自定义类型 *</label>
                <select value={selectedCategoryGroupId} onChange={e => handleCustomTypeChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">-- 请选择 --</option>
                  {customGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">购置日期</label>
              <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">维保截止日</label>
              <input name="warrantyExpiry" type="date" value={form.warrantyExpiry} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">存放位置</label>
              <input name="location" value={form.location} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="如 3楼A区机房" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">设备价值 (元)</label>
              <input name="value" type="number" step="0.01" value={form.value} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          {/* 自定义字段区域 */}
          {customFields.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50/30 p-4">
              <h3 className="mb-3 text-sm font-medium text-blue-800">
                {form.category === "CUSTOM"
                  ? `${categoryGroups.find(g => g.id === selectedCategoryGroupId)?.label || ""} — 自定义信息`
                  : `${CATEGORY_LABELS[form.category]} — 自定义信息`}
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {customFields.map((field) => {
                  const value = fieldValues[field.id] ?? "";

                  if (field.fieldType === "BOOLEAN") {
                    return (
                      <label key={field.id} className="flex items-center gap-2 pt-2">
                        <input type="checkbox" checked={value === "true"}
                          onChange={e => handleFieldValueChange(field.id, e.target.checked ? "true" : "false")}
                          className="rounded" />
                        <span className="text-sm text-gray-700">{field.label}{field.required ? " *" : ""}</span>
                      </label>
                    );
                  }

                  if (field.fieldType === "SELECT" && field.options) {
                    const opts = field.options.split(",").map(o => o.trim());
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                        <select value={value}
                          onChange={e => handleFieldValueChange(field.id, e.target.value)}
                          required={field.required}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                          <option value="">-- 请选择 --</option>
                          {opts.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.fieldType === "DATE") {
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                        <input type="date" value={value}
                          onChange={e => handleFieldValueChange(field.id, e.target.value)}
                          required={field.required}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                    );
                  }

                  if (field.fieldType === "NUMBER") {
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                        <input type="number" step="any" value={value}
                          onChange={e => handleFieldValueChange(field.id, e.target.value)}
                          required={field.required}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                    );
                  }

                  if (field.fieldType === "LONGTEXT") {
                    return (
                      <div key={field.id} className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                        <textarea value={value}
                          onChange={e => handleFieldValueChange(field.id, e.target.value)}
                          required={field.required} rows={3}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                    );
                  }

                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
                      <input value={value}
                        onChange={e => handleFieldValueChange(field.id, e.target.value)}
                        required={field.required}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">备注</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "提交中..." : "确认入库"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="rounded-md border px-4 py-2 text-sm">取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
