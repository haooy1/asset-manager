"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ASSET_CATEGORIES, CATEGORY_LABELS, type AssetCategory } from "@/modules/assets/types";
import type { CategoryGroupInfo, CustomFieldInfo, CustomFieldValueInput } from "@/modules/assets/custom-types";

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const id = params.id as string;

  // 普通用户无权编辑资产，重定向到资产详情页
  useEffect(() => {
    if (session?.user?.role === "EMPLOYEE") {
      router.replace(`/assets/${id}`);
    }
  }, [session, router, id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    status: "" as string,
  });

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadFileName, setUploadFileName] = useState("");

  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupInfo[]>([]);
  const [originalStatus, setOriginalStatus] = useState("");
  const [selectedCategoryGroupId, setSelectedCategoryGroupId] = useState("");
  const [customFields, setCustomFields] = useState<CustomFieldInfo[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  /**
   * 加载设备类型列表
   */
  useEffect(() => {
    fetch("/api/category-groups")
      .then(res => res.json())
      .then(({ data }) => { if (data) setCategoryGroups(data); })
      .catch(() => {});
  }, []);

  /**
   * 加载自定义字段
   */
  const loadCustomFields = useCallback(async (groupId: string) => {
    if (!groupId) { setCustomFields([]); setFieldValues({}); return; }
    try {
      const res = await fetch(`/api/category-groups/${groupId}/fields`);
      if (!res.ok) { setCustomFields([]); return; }
      const { data } = await res.json();
      setCustomFields(data || []);
    } catch { setCustomFields([]); }
  }, []);

  /**
   * 加载资产现有数据
   */
  useEffect(() => {
    fetch(`/api/assets/${id}`)
      .then(res => res.json())
      .then(({ data: asset }) => {
        if (!asset) { setError("资产不存在"); setLoading(false); return; }
        setForm({
          assetNo: asset.assetNo || "",
          name: asset.name || "",
          model: asset.model || "",
          brand: asset.brand || "",
          category: asset.category || "PC",
          purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : "",
          warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.slice(0, 10) : "",
          location: asset.location || "",
          value: asset.value != null ? String(asset.value) : "",
          description: asset.description || "",
          status: asset.status || "",
        });
        setOriginalStatus(asset.status || "");

        const groupId = asset.categoryGroupId || "";
        setSelectedCategoryGroupId(groupId);
        if (groupId) loadCustomFields(groupId);

        if (asset.customFieldValues) {
          const fv: Record<string, string> = {};
          asset.customFieldValues.forEach((cfv: { fieldId: string; value: string }) => {
            fv[cfv.fieldId] = cfv.value;
          });
          setFieldValues(fv);
        }

        setLoading(false);
      })
      .catch(() => { setError("加载资产信息失败"); setLoading(false); });
  }, [id, loadCustomFields]);

  /**
   * 品类变更时加载对应自定义字段
   */
  useEffect(() => {
    const matched = categoryGroups.find(g => g.name === form.category);
    if (matched) {
      setSelectedCategoryGroupId(matched.id);
      loadCustomFields(matched.id);
    }
  }, [form.category, categoryGroups, loadCustomFields]);

  const handleCustomTypeChange = (groupId: string) => {
    setSelectedCategoryGroupId(groupId);
    loadCustomFields(groupId);
  };

  const handleFieldValueChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * 提交更新（含自定义字段与附件上传）
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const customFieldValues: CustomFieldValueInput[] = customFields
      .filter(f => fieldValues[f.id] !== undefined && fieldValues[f.id] !== "")
      .map(f => ({ fieldId: f.id, value: fieldValues[f.id] }));

    const body: Record<string, unknown> = {
      ...form,
      value: form.value ? Number(form.value) : undefined,
      model: form.model || null,
      brand: form.brand || null,
      location: form.location || null,
      description: form.description || null,
      categoryGroupId: selectedCategoryGroupId || undefined,
      customFieldValues,
    };

    if (form.status && form.status !== originalStatus) {
      body.status = form.status;
    } else {
      delete body.status;
    }

    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = "更新失败";
        try { const err = await res.json(); msg = err.message ?? msg; } catch {}
        setError(msg);
        setSaving(false);
        return;
      }

      if (uploadFiles.length > 0) {
        let uploadErrors = 0;
        for (const file of uploadFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("name", uploadFileName || file.name);
          if (form.warrantyExpiry) formData.append("expiryDate", form.warrantyExpiry);

          const uploadRes = await fetch(`/api/assets/${id}`, { method: "POST", body: formData });
          if (!uploadRes.ok) {
            uploadErrors++;
            const errText = await uploadRes.text();
            console.error(`文件 ${file.name} 上传失败:`, errText);
          }
        }
        if (uploadErrors > 0) {
          setError(`文件上传部分失败 (${uploadErrors}/${uploadFiles.length})，可重试编辑追加`);
          setSaving(false);
          return;
        }
      }

      router.push(`/assets/${id}`);
    } catch {
      setError("网络错误，请重试");
      setSaving(false);
    }
  };

  const customGroups = categoryGroups.filter(g => !g.isBuiltin);
  const showCustomTypeSelector = form.category === "CUSTOM";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !form.assetNo) {
    return <div className="py-12 text-center text-gray-500">{error}</div>;
  }

  /**
   * 渲染自定义字段表单项
   */
  const renderCustomField = (field: CustomFieldInfo) => {
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
          <select value={value} onChange={e => handleFieldValueChange(field.id, e.target.value)}
            required={field.required}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">-- 请选择 --</option>
            {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    }

    if (field.fieldType === "DATE") {
      return (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
          <input type="date" value={value} onChange={e => handleFieldValueChange(field.id, e.target.value)}
            required={field.required}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      );
    }

    if (field.fieldType === "NUMBER") {
      return (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
          <input type="number" step="any" value={value} onChange={e => handleFieldValueChange(field.id, e.target.value)}
            required={field.required}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      );
    }

    if (field.fieldType === "LONGTEXT") {
      return (
        <div key={field.id} className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
          <textarea value={value} onChange={e => handleFieldValueChange(field.id, e.target.value)}
            required={field.required} rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      );
    }

    return (
      <div key={field.id}>
        <label className="block text-sm font-medium text-gray-700">{field.label}{field.required ? " *" : ""}</label>
        <input value={value} onChange={e => handleFieldValueChange(field.id, e.target.value)}
          required={field.required}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="mb-2 text-sm text-gray-500 hover:text-gray-700">
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-900">编辑资产</h1>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">资产编号 *</label>
              <input name="assetNo" required value={form.assetNo} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">资产名称 *</label>
              <input name="name" required value={form.name} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>

            {form.category !== "SECURITY_DOCUMENT" && (
              <>
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
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">品类 *</label>
              <select name="category" required value={form.category} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {ASSET_CATEGORIES.map(c => (
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
                  {customGroups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {form.category === "SECURITY_DOCUMENT" ? "生效日期" : "购置日期"}
              </label>
              <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {form.category === "SECURITY_DOCUMENT" ? "到期日期" : "维保截止日"}
              </label>
              <input name="warrantyExpiry" type="date" value={form.warrantyExpiry} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>

            {form.category !== "SECURITY_DOCUMENT" && (
              <>
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
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">状态</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="IDLE">闲置</option>
                <option value="IN_USE">使用中</option>
                <option value="MAINTENANCE">维保中</option>
                <option value="SCRAPPED">已报废</option>
              </select>
            </div>
          </div>

          {customFields.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50/30 p-4">
              <h3 className="mb-3 text-sm font-medium text-blue-800">
                {form.category === "SECURITY_DOCUMENT" ? "安全文档" : CATEGORY_LABELS[form.category]} — 自定义信息
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {customFields.map(renderCustomField)}
              </div>
            </div>
          )}

          <div className="rounded-md border border-green-200 bg-green-50/30 p-4">
            <h3 className="mb-3 text-sm font-medium text-green-800">
              {form.category === "SECURITY_DOCUMENT" ? "追加报告文件（支持多文件）" : "追加附件文档（支持多文件）"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">文件名称前缀</label>
                <input value={uploadFileName}
                  onChange={e => setUploadFileName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="留空则使用原始文件名" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">选择文件</label>
                <input type="file" multiple
                  onChange={e => setUploadFiles(Array.from(e.target.files || []))}
                  className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              {uploadFiles.length > 0 && (
                <div className="rounded border bg-white p-3">
                  <p className="mb-2 text-xs font-medium text-gray-600">已选择 {uploadFiles.length} 个文件：</p>
                  <ul className="space-y-1">
                    {uploadFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-xs text-gray-700">
                        <span className="truncate max-w-[300px]">{f.name}</span>
                        <span className="text-gray-400 ml-2 shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">备注</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "保存中..." : "保存修改"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="rounded-md border px-4 py-2 text-sm">取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
