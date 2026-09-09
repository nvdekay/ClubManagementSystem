// Business failure kinds — the interface layer maps them to HTTP statuses (ARCH-02).
export type DomainErrorKind = "validation" | "conflict" | "not_found";

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
