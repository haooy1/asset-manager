export const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT", "BOOLEAN", "LONGTEXT"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "文本",
  NUMBER: "数字",
  DATE: "日期",
  SELECT: "下拉选择",
  BOOLEAN: "是/否",
  LONGTEXT: "长文本",
};

export interface CategoryGroupInfo {
  id: string;
  name: string;
  label: string;
  isBuiltin: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fields?: CustomFieldInfo[];
  _count?: { assets: number; fields: number };
}

export interface CustomFieldInfo {
  id: string;
  categoryGroupId: string;
  name: string;
  label: string;
  fieldType: FieldType;
  options: string | null;
  required: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValueInfo {
  id: string;
  assetId: string;
  fieldId: string;
  value: string;
  field?: CustomFieldInfo;
}

export interface CustomFieldValueInput {
  fieldId: string;
  value: string;
}
