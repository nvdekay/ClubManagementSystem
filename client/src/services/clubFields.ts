import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure } from '@/services/apiRequest'
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
    super(message, 409)
    this.name = 'DuplicateClubFieldError'
  }
}

// Maps a failed response to ApiError (409 becomes the duplicate club field error)
function toClubFieldError(failure: ApiFailure): Error {
  return failure.status === 409
    ? new DuplicateClubFieldError(failure.message)
    : new ApiError(failure.message, failure.status)
}

// Gửi POST/PATCH/DELETE có CSRF và trả về data
async function mutate<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  csrfToken: string,
  body?: ClubFieldInput,
): Promise<T> {
  return apiRequest<T>(path, { method, csrfToken, body, toError: toClubFieldError })
}

// GET /admin/club-fields: danh mục lĩnh vực CLB kèm mức sử dụng
export async function fetchClubFields(signal: AbortSignal): Promise<ClubFieldUsage[]> {
  return apiRequest<ClubFieldUsage[]>('/api/v1/admin/club-fields', {
    signal,
    toError: toClubFieldError,
  })
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
