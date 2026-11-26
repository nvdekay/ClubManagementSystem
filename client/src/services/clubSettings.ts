import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
import type { ClubProfileFormField } from '@/services/policy'

export interface ClubChannel {
  label: string
  url: string
}

export interface ClubProfile {
  id: string
  code: string
  name: string
  field: string
  state: string
  description?: string
  contactEmail?: string
  contactPhone?: string
  charterUrl?: string
  channels: ClubChannel[]
  operatingScope?: string
  institutionalFields?: unknown
  updatedAt?: string
}

export interface ClubProfileInput {
  description?: string
  contactEmail?: string
  contactPhone?: string
  charterUrl?: string
  channels: ClubChannel[]
  operatingScope?: string
}

export interface ClubDepartment {
  id: string
  clubId: string
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface ClubDepartmentInput {
  name: string
  description?: string
  sortOrder: number
}

export interface ClubSettings {
  profile: ClubProfile
  departments: ClubDepartment[]
  /** Các trường hồ sơ mà chính sách trường đang áp dụng yêu cầu (true) trước khi chấp nhận lưu. */
  requiredProfileFields: Record<ClubProfileFormField, boolean>
}

/** Lỗi 400 liệt kê các trường hồ sơ mà chính sách trường yêu cầu nhưng khi lưu còn để trống. */
export class MissingProfileFieldsError extends ApiError {
  constructor(
    message: string,
    readonly missing: ClubProfileFormField[],
  ) {
    super(message)
    this.name = 'MissingProfileFieldsError'
  }
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/clubs${path}`, { ...options, toError: toSettingsError })
}

// Maps a failed response to this module's error type
function toSettingsError(failure: ApiFailure): Error {
  const missing = (failure.details as { missing?: ClubProfileFormField[] } | undefined)?.missing
  return Array.isArray(missing)
    ? new MissingProfileFieldsError(failure.message, missing)
    : new ApiError(failure.message, failure.status)
}

// GET /settings: hồ sơ và phòng ban của CLB
export function fetchClubSettings(clubId: string, signal: AbortSignal): Promise<ClubSettings> {
  return request(`/${encodeURIComponent(clubId)}/settings`, { signal })
}

// PATCH /profile: cập nhật hồ sơ CLB
export function saveClubProfile(
  clubId: string,
  input: ClubProfileInput,
  csrfToken: string,
): Promise<ClubProfile> {
  return request(`/${encodeURIComponent(clubId)}/profile`, {
    method: 'PATCH',
    csrfToken,
    body: input,
  })
}

// POST /departments/template: áp mẫu phòng ban mặc định
export function applyDepartmentTemplate(
  clubId: string,
  csrfToken: string,
): Promise<ClubDepartment[]> {
  return request(`/${encodeURIComponent(clubId)}/departments/template`, {
    method: 'POST',
    csrfToken,
  })
}

// POST tạo phòng ban của CLB
export function createDepartment(
  clubId: string,
  input: ClubDepartmentInput,
  csrfToken: string,
): Promise<ClubDepartment> {
  return request(`/${encodeURIComponent(clubId)}/departments`, {
    method: 'POST',
    csrfToken,
    body: input,
  })
}

// Cập nhật phòng ban của CLB
export function updateDepartment(
  clubId: string,
  departmentId: string,
  input: ClubDepartmentInput,
  csrfToken: string,
): Promise<ClubDepartment> {
  return request(`/${encodeURIComponent(clubId)}/departments/${encodeURIComponent(departmentId)}`, {
    method: 'PATCH',
    csrfToken,
    body: input,
  })
}

// Ngưng hoạt động một phòng ban của CLB
export function deactivateDepartment(
  clubId: string,
  departmentId: string,
  csrfToken: string,
): Promise<ClubDepartment> {
  return request(`/${encodeURIComponent(clubId)}/departments/${encodeURIComponent(departmentId)}`, {
    method: 'DELETE',
    csrfToken,
  })
}
