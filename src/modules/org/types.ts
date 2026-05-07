export type Branch = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  contact: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    departments: number;
    users: number;
  };
};

export type Department = {
  id: string;
  name: string;
  branchId: string;
  branch?: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
};

export type UserInfo = {
  id: string;
  username: string;
  email: string | null;
  realName: string;
  role: string;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const USER_ROLES = ["SUPER_ADMIN", "BRANCH_ADMIN", "DEPT_MANAGER", "EMPLOYEE"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "超级管理员",
  BRANCH_ADMIN: "分支管理员",
  DEPT_MANAGER: "部门负责人",
  EMPLOYEE: "普通员工",
};
