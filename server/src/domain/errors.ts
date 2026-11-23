// Các loại lỗi nghiệp vụ — tầng interface ánh xạ chúng sang HTTP status (ARCH-02).
export type DomainErrorKind = "validation" | "conflict" | "not_found" | "unauthorized" | "forbidden" | "locked" | "unavailable";

export class DomainError extends Error {
  constructor(
    message: string,
    readonly kind: DomainErrorKind = "validation",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
