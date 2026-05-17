import { db } from "@/lib/db/client";
import { hash } from "bcryptjs";
import type { Branch, Department, UserInfo, UserRole } from "./types";

// ==================== 分支管理 ====================

export async function getBranches(isActive?: boolean) {
  const where = isActive !== undefined ? { isActive } : {};
  return db.branch.findMany({
    where,
    include: { _count: { select: { departments: true, users: true } } },
    orderBy: { code: "asc" },
  });
}

export async function getBranchById(id: string) {
  return db.branch.findUnique({ where: { id } });
}

export async function createBranch(data: {
  name: string;
  code: string;
  address?: string;
  contact?: string;
}) {
  return db.branch.create({ data });
}

export async function updateBranch(
  id: string,
  data: { name?: string; address?: string; contact?: string; isActive?: boolean },
) {
  return db.branch.update({ where: { id }, data });
}

// ==================== 部门管理 ====================

export async function getDepartments(branchId?: string, isActive?: boolean) {
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (isActive !== undefined) where.isActive = isActive;
  return db.department.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(data: {
  name: string;
  branchId: string;
}) {
  return db.department.create({ data });
}

export async function updateDepartment(
  id: string,
  data: { name?: string; isActive?: boolean },
) {
  return db.department.update({ where: { id }, data });
}

// ==================== 用户管理 ====================

export async function getUsers(branchId?: string, departmentId?: string, isActive?: boolean) {
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (departmentId) where.departmentId = departmentId;
  if (isActive !== undefined) where.isActive = isActive;
  return db.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      realName: true,
      role: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
      departmentId: true,
      department: { select: { id: true, name: true } },
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      realName: true,
      role: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
      departmentId: true,
      department: { select: { id: true, name: true } },
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createUser(data: {
  username: string;
  password: string;
  email?: string;
  realName: string;
  role: UserRole;
  branchId?: string;
  departmentId?: string;
}) {
  if (data.password.length < 6) {
    throw new Error("密码长度不能少于6位");
  }
  const hashedPassword = await hash(data.password, 12);
  return db.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    select: {
      id: true,
      username: true,
      email: true,
      realName: true,
      role: true,
      branchId: true,
      departmentId: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function updateUser(
  id: string,
  data: {
    email?: string;
    realName?: string;
    role?: UserRole;
    branchId?: string;
    departmentId?: string;
    isActive?: boolean;
    password?: string;
  },
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.password) {
    updateData.password = await hash(data.password, 12);
  } else {
    delete updateData.password;
  }
  return db.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      realName: true,
      role: true,
      branchId: true,
      departmentId: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * 更新用户密码（独立函数，用于密码修改场景）
 * @param id - 用户 ID
 * @param password - 新密码（明文，函数内部会哈希）
 */
export async function updateUserPassword(id: string, password: string) {
  const hashedPassword = await hash(password, 12);
  return db.user.update({
    where: { id },
    data: { password: hashedPassword },
    select: { id: true, username: true },
  });
}
