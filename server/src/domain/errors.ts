// Các loại lỗi nghiệp vụ — tầng interface ánh xạ chúng sang HTTP status (ARCH-02).
export type DomainErrorKind =
  'validation' | 'conflict' | 'not_found' | 'unauthorized' | 'forbidden' | 'locked' | 'unavailable'

export class DomainError extends Error {
  constructor(
    message: string,
    readonly kind: DomainErrorKind = 'validation',
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

// Trả về giá trị nếu có, nếu không ném lỗi not_found `<label> not found`
export function orNotFound<T>(value: T | null | undefined, label: string): NonNullable<T> {
  if (!value) {
    throw new DomainError(`${label} not found`, 'not_found')
  }
  return value as NonNullable<T>
}

// Ném lỗi validation, kèm `{ field }` khi biết trường lỗi
export function invalidField(message: string, field?: string): never {
  throw new DomainError(message, 'validation', field ? { field } : undefined)
}

// Cắt khoảng trắng; chuỗi rỗng thành undefined
export function trimmedOrUndefined(value: string | undefined): string | undefined {
  return value?.trim() || undefined
}

// Cắt khoảng trắng trường văn bản tuỳ chọn và kiểm độ dài tối đa (`<field> is too long`)
export function optionalText(value: string | undefined, max: number, field: string) {
  const trimmed = trimmedOrUndefined(value)
  if (trimmed && trimmed.length > max) {
    invalidField(`${field} is too long`, field)
  }
  return trimmed
}
