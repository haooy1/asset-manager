"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getApprovals } from "@/modules/approvals/services";
import type { AssetInfo } from "@/modules/assets/types";
import type { AssetCategory } from "@/modules/assets/types";

interface ApprovalDetail {
  id: string;
  type: string;
  status: string;
  asset: {
    id: string;
    assetNo: string;
    name: string;
    model: string | null;
    category: AssetCategory;
    status: string;
    location: string | null;
    branch: { id: string; name: string } | null;
    assignedUser: { id: string; realName: string } | null;
  };
  applicant: { id: string; realName: string; username: string; department: { id: string; name: string } | null } | null;
  approver: { id: string; realName: string } | null;
  executor: { id: string; realName: string } | null;
  reason: string | null;
  rejectReason: string | null;
  operatedAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  BORROW: "领用申请", RETURN: "归还申请", TRANSFER: "调拨申请", SCRAP: "报废申请",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "待审批", APPROVED: "待执行", REJECTED: "已驳回", EXECUTED: "已完成",
};

export default function ApprovalDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { id } = useParams<{ id: string }>();

  /**
   * 获取审批详情数据
   */
  const fetchDetail = () => {
    fetch(`/api/approvals/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          let msg = `请求失败 (${r.status})`;
          try {
            const err = await r.json();
            msg = err.message ?? msg;
          } catch {}
          throw new Error(msg);
        }
        return r.json();
      })
      .then((d) => setApproval(d.data))
      .catch((err: Error) => {
        console.error("获取审批详情失败:", err.message);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDetail(); }, [id]);

  /**
   * 执行审批操作（通过/驳回/执行）
   * @param action - 审批操作类型
   */
  const handleAction = async (action: "approve" | "reject" | "execute") => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectReason: action === "reject" ? reason : undefined }),
      });
      if (!res.ok) {
        let msg = "操作失败";
        try {
          const err = await res.json();
          msg = err.message ?? msg;
        } catch {}
        setError(msg);
      } else {
        fetchDetail();
      }
    } catch {
      setError("网络错误，请重试");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  if (!approval) return <div className="py-12 text-center text-gray-500">审批单不存在</div>;

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 text-sm text-gray-500 hover:text-gray-700">← 返回</button>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">{TYPE_LABELS[approval.type]}</h1>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                approval.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                approval.status === "APPROVED" ? "bg-blue-100 text-blue-800" :
                approval.status === "REJECTED" ? "bg-red-100 text-red-800" :
                "bg-green-100 text-green-800"
              }`}>{STATUS_LABELS[approval.status]}</span>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">申请人</dt><dd className="mt-1 font-medium text-gray-900">{approval.applicant?.realName}</dd></div>
              <div><dt className="text-gray-500">所属部门</dt><dd className="mt-1 text-gray-900">{approval.applicant?.department?.name ?? "-"}</dd></div>
              <div><dt className="text-gray-500">审批人</dt><dd className="mt-1 text-gray-900">{approval.approver?.realName ?? "-"}</dd></div>
              <div><dt className="text-gray-500">执行人</dt><dd className="mt-1 text-gray-900">{approval.executor?.realName ?? "-"}</dd></div>
              <div className="col-span-2"><dt className="text-gray-500">申请原因</dt><dd className="mt-1 text-gray-900">{approval.reason ?? "无"}</dd></div>
              {approval.rejectReason && (
                <div className="col-span-2"><dt className="text-red-500">驳回原因</dt><dd className="mt-1 text-red-600">{approval.rejectReason}</dd></div>
              )}
              <div className="col-span-2"><dt className="text-gray-500">创建时间</dt><dd className="mt-1 text-gray-500">{new Date(approval.createdAt).toLocaleString("zh-CN")}</dd></div>
              {approval.operatedAt && (
                <div className="col-span-2"><dt className="text-gray-500">处理时间</dt><dd className="mt-1 text-gray-500">{new Date(approval.operatedAt).toLocaleString("zh-CN")}</dd></div>
              )}
            </dl>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">关联资产</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">资产编号</dt><dd className="mt-1 font-mono text-gray-900">{approval.asset.assetNo}</dd></div>
              <div><dt className="text-gray-500">资产名称</dt><dd className="mt-1 text-gray-900">{approval.asset.name}</dd></div>
              <div><dt className="text-gray-500">型号</dt><dd className="mt-1 text-gray-900">{approval.asset.model ?? "-"}</dd></div>
              <div><dt className="text-gray-500">当前位置</dt><dd className="mt-1 text-gray-900">{approval.asset.location ?? "-"}</dd></div>
              <div><dt className="text-gray-500">当前归属</dt><dd className="mt-1 text-gray-900">{approval.asset.assignedUser?.realName ?? "未分配"}</dd></div>
              <div><dt className="text-gray-500">所属分支</dt><dd className="mt-1 text-gray-900">{approval.asset.branch?.name ?? "-"}</dd></div>
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          {(approval.status === "PENDING" && (session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "BRANCH_ADMIN" || session?.user?.role === "DEPT_MANAGER")) && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">审批操作</h3>
              <div className="space-y-3">
                <textarea placeholder="驳回原因（驳回时必填）" value={reason} onChange={(e) => setReason(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={2} />
                {error && <div className="text-xs text-red-600">{error}</div>}
                <div className="flex gap-2">
                  <button onClick={() => handleAction("approve")} disabled={submitting}
                    className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
                    通过
                  </button>
                  <button onClick={() => { if (!reason) { setError("请填写驳回原因"); return; } handleAction("reject"); }} disabled={submitting}
                    className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                    驳回
                  </button>
                </div>
              </div>
            </div>
          )}

          {(approval.status === "APPROVED" && (session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "BRANCH_ADMIN")) && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">执行确认</h3>
              <p className="mb-3 text-xs text-gray-500">确认已在现实中完成此操作？</p>
              {error && <div className="mb-2 text-xs text-red-600">{error}</div>}
              <button onClick={() => handleAction("execute")} disabled={submitting}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                确认执行
              </button>
            </div>
          )}

          <div className="rounded-lg border bg-white p-4 shadow-sm text-sm text-gray-500">
            <p>流程说明：</p>
            <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs">
              <li>员工发起申请 → 待审批</li>
              <li>部门负责人审批通过 → 待执行</li>
              <li>IT管理员确认执行 → 已完成</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
