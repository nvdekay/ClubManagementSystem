import { ApiError } from '@/services/apiError'
import { apiClient, type ApiFailure } from '@/services/apiRequest'
export type PropertyType = 'ROOM' | 'HALL' | 'OUTDOOR' | 'STAGE' | 'EQUIPMENT'

/** `day` 1 = Thứ Hai … 7 = Chủ nhật; ngày không liệt kê thì không thể đặt. */
export interface BookableHours {
  day: number
  open: string
  close: string
}

export interface Blackout {
  startAt: string
  endAt: string
  reason: string
}

export interface PropertyDetails {
  name: string
  location: string
  capacity?: number
  equipment: string[]
  bookableHours: BookableHours[]
  blackouts: Blackout[]
}

export interface Property extends PropertyDetails {
  id: string
  code: string
  type: PropertyType
  isActive: boolean
}

/** Response không phải 2xx; `field` nêu ô nhập không hợp lệ khi server báo. */
export class PropertyRequestError extends ApiError {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: string,
  ) {
    super(message)
    this.name = 'PropertyRequestError'
  }
}

const request = apiClient('/api/v1/admin/properties', toPropertyError)

// Maps a failed response to this module's error type
function toPropertyError(failure: ApiFailure): Error {
  const field = (failure.details as { field?: unknown } | undefined)?.field
  return new PropertyRequestError(
    failure.message,
    failure.status,
    typeof field === 'string' ? field : undefined,
  )
}

// GET danh sách cơ sở vật chất
export function fetchProperties(signal: AbortSignal): Promise<Property[]> {
  return request('', { signal })
}

// POST tạo cơ sở vật chất
export function createProperty(
  input: PropertyDetails & { type: PropertyType },
  csrfToken: string,
): Promise<Property> {
  return request('', { method: 'POST', csrfToken, body: input })
}

// PATCH cập nhật thông tin cơ sở vật chất
export function updateProperty(
  id: string,
  details: PropertyDetails,
  csrfToken: string,
): Promise<Property> {
  return request(`/${encodeURIComponent(id)}`, { method: 'PATCH', csrfToken, body: details })
}

// POST /activation: bật hoặc tắt cơ sở vật chất
export function setPropertyActive(
  id: string,
  isActive: boolean,
  csrfToken: string,
): Promise<Property> {
  return request(`/${encodeURIComponent(id)}/activation`, {
    method: 'POST',
    csrfToken,
    body: { isActive },
  })
}

// DELETE cơ sở vật chất
export function deleteProperty(id: string, csrfToken: string): Promise<{ deleted: true }> {
  return request(`/${encodeURIComponent(id)}`, { method: 'DELETE', csrfToken })
}
