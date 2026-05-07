"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, type AssetInfo, } from "@/modules/assets/types";

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [asset, setAsset] = useState<AssetInfo & { documents?: { id: string; name: string; fileName: string; filePath: string; expiryDate: string | null; uploadedAt: string }[]; approvals?: { id: string; type: string; status: string; applicant: { id: string; realName: string } | null; approver: { id: string; realName: string } | null; createdAt: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${id}`);
      if (res.ok) {
        const result = await res.json();
        setAsset(result.data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!asset) {
    return <div className="py-12 text-center text-gray-500">资产不存在</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="mb-2 text-sm text-gray-500 hover:text-gray-700">
            ← 返回列表
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
          <span className="font-mono text-sm text-gray-500">{asset.assetNo}</span>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status]}`}>
          {STATUS_LABELS[asset.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">基本信息</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">品类</dt>
                <dd className="mt-1 text-gray-900">{CATEGORY_LABELS[asset.category]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">型号</dt>
                <dd className="mt-1 text-gray-900">{asset.model ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">品牌</dt>
                <dd className="mt-1 text-gray-900">{asset.brand ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">所属分支</dt>
                <dd className="mt-1 text-gray-900">{asset.branch?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">存放位置</dt>
                <dd className="mt-1 text-gray-900">{asset.location ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">设备价值</dt>
                <dd className="mt-1 text-gray-900">{asset.value != null ? `¥${Number(asset.value).toLocaleString()}` : "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">购置日期</dt>
                <dd className="mt-1 text-gray-900">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("zh-CN") : "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">维保截止日</dt>
                <dd className={`mt-1 ${asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date() ? "text-red-600 font-medium" : "text-gray-900"}`}>
                  {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString("zh-CN") : "-"}
                  {asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date() && " ⚠️ 已过期"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">归属人</dt>
                <dd className="mt-1 text-gray-900">{asset.assignedUser?.realName ?? "未分配"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">备注</dt>
                <dd className="mt-1 text-gray-900">{asset.description ?? "-"}</dd>
              </div>
            </dl>
          </div>

          {asset.category === "SECURITY_DOCUMENT" && asset.documents && asset.documents.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">附件文档</h2>
              <ul className="divide-y text-sm">
                {asset.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-medium text-gray-900">{doc.name}</span>
                      <span className="ml-2 text-xs text-gray-500">{doc.fileName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.expiryDate && (
                        <span className={`text-xs ${new Date(doc.expiryDate) < new Date() ? "text-red-600" : "text-gray-500"}`}>
                          到期: {new Date(doc.expiryDate).toLocaleDateString("zh-CN")}
                        </span>
                      )}
                      <a href={doc.filePath} target="_blank" className="text-blue-600 hover:underline text-xs" rel="noreferrer">
                        下载
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">操作</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/assets/${asset.id}/edit`)}
                className="block w-full rounded-md border px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                编辑信息
              </button>
              {asset.status === "IDLE" && (
                <button className="block w-full rounded-md bg-blue-600 px-3 py-2 text-left text-sm text-white hover:bg-blue-700">
                  发起领用
                </button>
              )}
              {asset.status === "IN_USE" && (
                <button className="block w-full rounded-md border border-red-300 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                  发起归还
                </button>
              )}
            </div>
          </div>

          {asset.approvals && asset.approvals.length > 0 && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">最近审批</h3>
              <ul className="space-y-2 text-sm">
                {asset.approvals.slice(0, 5).map((ap) => (
                  <li key={ap.id} className="border-b pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {ap.type === "BORROW" ? "领用" : ap.type === "RETURN" ? "归还" : ap.type === "TRANSFER" ? "调拨" : "报废"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(ap.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {ap.applicant?.realName} · {ap.status}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
