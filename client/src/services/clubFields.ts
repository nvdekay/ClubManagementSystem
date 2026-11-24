import { ApiError, apiFetch } from '@/services/apiError'
export interface ClubFieldUsage {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  clubCount: number
  applicationCount: number
}

export interface ClubFieldInput {
  name: string
  sortOrder: number
}

export type ClubFieldRemoval = 'deleted' | 'deactivated'

/** Server trả 409: đã có lĩnh vực khác dùng tên này. */
export class DuplicateClubFieldError extends ApiError {
  constructor(message: string) {
    super(message)
    this.name = 'DuplicateClubFieldError'
  }
}

// Đổi response lỗi thành ApiError (409 thành lỗi trùng lĩnh vực)
async function failure(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null
  const message = body?.message ?? `HTTP ${response.status}`
  if (response.status === 409) {
    throw new DuplicateClubFieldError(message)
  }
  throw new ApiError(message)
}

// Gửi POST/PATCH/DELETE có CSRF và trả về data
async function mutate<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  csrfToken: string,
  body?: ClubFieldInput,
): Promise<T> {
  const response = await apiFetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    return failure(response)
  }
  const result: { data: T } = await response.json()
  return result.data
}

// GET /admin/club-fields: danh mục lĩnh vực CLB kèm mức sử dụng
export async function fetchClubFields(signal: AbortSignal): Promise<ClubFieldUsage[]> {
  const response = await apiFetch('/api/v1/admin/club-fields', {
    signal,
    credentials: 'same-origin',
  })
  if (!response.ok) {
    return failure(response)
  }
  const body: { data: ClubFieldUsage[] } = await response.json()
  return body.data
}

// POST tạo lĩnh vực CLB mới
export function createClubField(input: ClubFieldInput, csrfToken: string) {
  return mutate<ClubFieldUsage>('/api/v1/admin/club-fields', 'POST', csrfToken, input)
}

// PATCH cập nhật lĩnh vực CLB
export function updateClubField(id: string, input: ClubFieldInput, csrfToken: string) {
  return mutate<ClubFieldUsage>(
    `/api/v1/admin/club-fields/${encodeURIComponent(id)}`,
    'PATCH',
    csrfToken,
    input,
  )
}

// DELETE xoá lĩnh vực CLB
export async function removeClubField(id: string, csrfToken: string): Promise<ClubFieldRemoval> {
  const result = await mutate<{ result: ClubFieldRemoval }>(
    `/api/v1/admin/club-fields/${encodeURIComponent(id)}`,
    'DELETE',
    csrfToken,
  )
  return result.result
}
