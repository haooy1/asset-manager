import { db } from "@/lib/db/client";

type AuditAction = "LOGIN" | "LOGOUT" | "LOGIN_FAILED"
  | "CREATE_ASSET" | "UPDATE_ASSET" | "DELETE_ASSET"
  | "CREATE_APPROVAL" | "CANCEL_APPROVAL" | "APPROVE" | "REJECT" | "EXECUTE"
  | "CREATE_USER" | "UPDATE_USER"
  | "CREATE_BRANCH" | "UPDATE_BRANCH" | "DELETE_BRANCH"
  | "CREATE_DEPT" | "UPDATE_DEPT" | "DELETE_DEPT"
  | "UPDATE_CATEGORY_GROUP" | "IMPORT_ASSETS" | "REVOKE_IMPORT" | "DOCUMENT_UPLOAD";
type AuditTargetType = "ASSET" | "APPROVAL" | "USER" | "BRANCH" | "DEPT" | "CATEGORY_GROUP" | "CATEGORY_DOCUMENT" | "SYSTEM";

export const LOGIN_ACTIONS = ["LOGIN", "LOGOUT", "LOGIN_FAILED"];
export const USER_ACTIONS = ["CREATE_APPROVAL", "CANCEL_APPROVAL", "APPROVE", "REJECT", "EXECUTE"];
export const ADMIN_ACTIONS = [
  "CREATE_ASSET", "UPDATE_ASSET", "DELETE_ASSET", "IMPORT_ASSETS", "DOCUMENT_UPLOAD",
  "CREATE_USER", "UPDATE_USER",
  "CREATE_BRANCH", "UPDATE_BRANCH", "DELETE_BRANCH",
  "CREATE_DEPT", "UPDATE_DEPT", "DELETE_DEPT",
  "UPDATE_CATEGORY_GROUP",
];

export type LogCategory = "login" | "user" | "admin";

const CATEGORY_ACTION_MAP: Record<LogCategory, string[]> = {
  login: LOGIN_ACTIONS,
  user: USER_ACTIONS,
  admin: ADMIN_ACTIONS,
};

/**
 * 写入审计日志
 */
export async function writeAuditLog(params: {
  userId?: string;
  username?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  detail?: string;
  clientIp?: string;
}) {
  try {
    await db.auditLog.create({ data: params });
  } catch (error) {
    console.error("写入审计日志失败:", error);
  }
}

/**
 * 查询审计日志
 */
export async function getAuditLogs(params: {
  userId?: string;
  action?: string;
  targetType?: string;
  category?: LogCategory;
  page?: number;
  pageSize?: number;
}) {
  const { userId, action, targetType, category, page = 1, pageSize = 50 } = params;
  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  if (category && CATEGORY_ACTION_MAP[category]) {
    where.action = { in: CATEGORY_ACTION_MAP[category] };
  }

  const [total, items] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const uniqueUserIds = [...new Set(items.map((log: { userId: string | null }) => log.userId).filter(Boolean))] as string[];
  const users = uniqueUserIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: { id: true, realName: true, username: true },
      })
    : [];
  const userMap = new Map(users.map((u: { id: string; realName: string; username: string }) => [u.id, u]));

  const logsWithUser = items.map((log: { userId: string | null; [key: string]: unknown }) => ({
    ...log,
    user: log.userId ? userMap.get(log.userId) ?? null : null,
  }));

  return { total, page, pageSize, items: logsWithUser };
}
