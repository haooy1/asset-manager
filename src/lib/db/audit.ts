import { db } from "@/lib/db/client";

type AuditAction = "LOGIN" | "LOGOUT" | "LOGIN_FAILED"
  | "CREATE_ASSET" | "UPDATE_ASSET" | "DELETE_ASSET"
  | "CREATE_APPROVAL" | "CANCEL_APPROVAL" | "APPROVE" | "REJECT" | "EXECUTE"
  | "CREATE_USER" | "UPDATE_USER"
  | "CREATE_BRANCH" | "UPDATE_BRANCH" | "DELETE_BRANCH"
  | "CREATE_DEPT" | "UPDATE_DEPT" | "DELETE_DEPT"
  | "UPDATE_CATEGORY_GROUP" | "IMPORT_ASSETS";
type AuditTargetType = "ASSET" | "APPROVAL" | "USER" | "BRANCH" | "DEPT" | "CATEGORY_GROUP" | "SYSTEM";

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

  const logsWithUser = await Promise.all(items.map(async (log) => {
    let user = null;
    if (log.userId) {
      user = await db.user.findUnique({
        where: { id: log.userId },
        select: { id: true, realName: true, username: true },
      });
    }
    return { ...log, user };
  }));

  return { total, page, pageSize, items: logsWithUser };
}
