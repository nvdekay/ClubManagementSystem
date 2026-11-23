import { DomainError } from "./errors.js";

/** One entry of the ICPDP-managed club field catalog students pick from when founding a club. */
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
  /** Re-adding the name of a deactivated field reactivates it instead of failing as a duplicate. */
  create(input: ClubFieldInput, actorId: string, now: Date): Promise<ClubField>;
  /** A rename also refreshes the denormalized name on clubs and editable applications. */
  update(id: string, input: ClubFieldInput, actorId: string, now: Date): Promise<ClubField>;
  /** Hard delete when nothing references the field, otherwise hide it from new applications. */
  remove(id: string, actorId: string, now: Date): Promise<ClubFieldRemoval>;
}

export const DEFAULT_CLUB_FIELDS: readonly string[] = [
  "Công nghệ", "Ngôn ngữ", "Kỹ năng", "Nghệ thuật", "Thể thao", "Cộng đồng",
];

export function normalizeClubFieldName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
}

export function validateClubFieldInput(input: ClubFieldInput): ClubFieldInput {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) throw new DomainError("club field name is required", "validation");
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 10_000) {
    throw new DomainError("invalid club field order", "validation");
  }
  return { name, sortOrder: input.sortOrder };
}
