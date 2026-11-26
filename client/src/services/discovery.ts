import { ApiError } from '@/services/apiError'
import { apiRequest } from '@/services/apiRequest'
export interface PublicClub {
  id: string
  code: string
  name: string
  field: string
  state: 'Active' | 'Suspended'
  description?: string
  contactEmail?: string
  contactPhone?: string
  operatingScope?: string
  logoUrl?: string
  openCampaignId?: string
}

export interface PublicCampaign {
  id: string
  title: string
  state: string
  windowStart: string
  windowEnd: string
  capacity: number
}

export interface PublicEvent {
  id: string
  /** Không có với sự kiện toàn trường do ICPDP tổ chức. */
  clubId?: string
  clubName: string
  title: string
  startAt: string
  endAt: string
  venueText?: string
  objective?: string
  coverImageUrl?: string
  capacity: number
  status: PublicEventStatus
}

export type PublicEventStatus = 'ongoing' | 'upcoming' | 'ended'
export type PublicEventFilter = PublicEventStatus | 'all'

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ClubPage extends Page<PublicClub> {
  fields: string[]
  /** UC06 E1: các CLB Active mới nhất, chỉ gửi khi tìm kiếm có lọc không khớp kết quả nào. */
  suggestions?: PublicClub[]
}

export interface ClubDetail {
  club: PublicClub
  board: Array<{ memberName: string; positionName: string; termName: string }>
  campaigns: PublicCampaign[]
  upcomingEvents: PublicEvent[]
  history: PublicEvent[]
}

export class PublicApiError extends ApiError {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message, statusCode)
  }
}

// GET /public/... (no session needed) through the shared helper, failing with PublicApiError
function publicGet<T>(path: string, signal: AbortSignal): Promise<T> {
  return apiRequest<T>(`/api/v1/public/${path}`, {
    signal,
    toError: (failure) => new PublicApiError(failure.status, failure.message),
  })
}

// GET danh sách CLB công khai, tìm theo từ khoá và lĩnh vực
export function fetchClubs(
  search: string,
  field: string,
  page: number,
  signal: AbortSignal,
): Promise<ClubPage> {
  const params = new URLSearchParams({ search, field, page: String(page) })
  return publicGet(`clubs?${params}`, signal)
}

// GET chi tiết một CLB công khai
export function fetchClub(id: string, signal: AbortSignal): Promise<ClubDetail> {
  return publicGet(`clubs/${encodeURIComponent(id)}`, signal)
}

// GET danh sách sự kiện công khai theo trạng thái và từ khoá
export function fetchEvents(
  page: number,
  signal: AbortSignal,
  status: PublicEventFilter = 'upcoming',
  search = '',
): Promise<Page<PublicEvent>> {
  const params = new URLSearchParams({ page: String(page), status })
  if (search) {
    params.set('search', search)
  }
  return publicGet(`events?${params.toString()}`, signal)
}

// GET chi tiết một sự kiện công khai
export function fetchEvent(
  id: string,
  signal: AbortSignal,
): Promise<{
  event: PublicEvent
  /** Null với sự kiện toàn trường do ICPDP tổ chức. */
  club: { id: string; name: string } | null
}> {
  return publicGet(`events/${encodeURIComponent(id)}`, signal)
}
