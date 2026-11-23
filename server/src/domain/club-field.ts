import { DomainError } from "./errors.js";

/** Một mục trong danh mục lĩnh vực CLB do ICPDP quản lý, để sinh viên chọn khi thành lập CLB. */
export interface ClubField {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ClubFieldUsage extends ClubField {
  clubCount: number;
  applicationCount: number;
}

export interface ClubFieldInput {
  name: string;
  sortOrder: number;
}

export type ClubFieldRemoval = "deleted" | "deactivated";

export interface ClubFieldRepository {
  listActive(): Promise<ClubField[]>;
  listWithUsage(): Promise<ClubFieldUsage[]>;
  find(id: string): Promise<ClubField | null>;
  /** Thêm lại tên của lĩnh vực đã tắt sẽ kích hoạt lại nó thay vì báo lỗi trùng. */
  create(input: ClubFieldInput, actorId: string, now: Date): Promise<ClubField>;
  /** Đổi tên cũng cập nhật lại tên đã denormalize trên CLB và các hồ sơ còn sửa được. */
  update(id: string, input: ClubFieldInput, actorId: string, now: Date): Promise<ClubField>;
  /** Xoá hẳn khi không có gì tham chiếu lĩnh vực này, ngược lại thì ẩn khỏi các hồ sơ mới. */
  remove(id: string, actorId: string, now: Date): Promise<ClubFieldRemoval>;
}

export const DEFAULT_CLUB_FIELDS: readonly string[] = [
  "Công nghệ", "Ngôn ngữ", "Kỹ năng", "Nghệ thuật", "Thể thao", "Cộng đồng",
];

// Chuẩn hoá tên lĩnh vực CLB để so sánh trùng lặp
export function normalizeClubFieldName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
}

// Kiểm tra tên và thứ tự hiển thị của lĩnh vực CLB
export function validateClubFieldInput(input: ClubFieldInput): ClubFieldInput {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) throw new DomainError("club field name is required", "validation");
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 10_000) {
    throw new DomainError("invalid club field order", "validation");
  }
  return { name, sortOrder: input.sortOrder };
}
