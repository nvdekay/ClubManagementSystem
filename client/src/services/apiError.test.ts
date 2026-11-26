import i18next from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiErrors } from '@/i18n/apiErrors'
import { clubEvents } from '@/i18n/clubEvents'
import { resolveClubEventErrorDescriptor } from '@/pages/club/ClubEventErrorMessage'
import { ApiError, apiFetch } from '@/services/apiError'
import { apiRequest, type ApiFailure } from '@/services/apiRequest'
import { actOnClubEvent, ClubEventError } from '@/services/clubEvents'

beforeEach(async () => {
  await i18next.init({
    lng: 'vi',
    fallbackLng: 'en',
    resources: {
      en: { translation: { apiErrors: apiErrors.en, clubEvents: clubEvents.en } },
      vi: { translation: { apiErrors: apiErrors.vi, clubEvents: clubEvents.vi } },
    },
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('localized API errors', () => {
  it.each([
    ['invalid check-in window', 'checkInWindow'],
    [
      'registration must open before closing and close no later than the start',
      'registrationWindow',
    ],
    ['policy is not configured', 'policyMissing'],
    ['settlement requires an ended or cancelled event', 'settlementEvent'],
    ['finalize the evaluation of every club before publishing', 'finalizeAll'],
  ])('translates %s and retains its diagnostics', (message, key) => {
    const error = new ApiError(message)
    expect(error.message).toBe(apiErrors.vi[key])
    expect(error.rawMessage).toBe(message)
  })

  it('updates an existing error when the language is switched', async () => {
    const error = new ApiError('invalid check-in window')
    expect(error.message).toBe(apiErrors.vi.checkInWindow)
    await i18next.changeLanguage('en')
    expect(error.message).toBe('invalid check-in window')
    await i18next.changeLanguage('vi')
    expect(error.message).toBe(apiErrors.vi.checkInWindow)
  })

  it.each([
    ['HTTP 401', 'unauthorized'],
    ['HTTP 403', 'forbidden'],
    ['HTTP 503', 'unavailable'],
    ['HTTP 500', 'server'],
  ])('localizes non-JSON HTTP fallback %s', (message, key) => {
    expect(new ApiError(message).message).toBe(apiErrors.vi[key])
  })

  it('does not leak unknown English API messages into Vietnamese UI', async () => {
    const error = new ApiError('unmapped server diagnostic')
    expect(error.message).toBe(apiErrors.vi.unknown)
    await i18next.changeLanguage('en')
    expect(error.message).toBe('unmapped server diagnostic')
  })

  it('keeps dynamic notice periods in the translated error', () => {
    expect(new ApiError('submit at least 48 hours before the event starts').message).toBe(
      'Cần nộp đề xuất trước giờ bắt đầu sự kiện ít nhất 48 giờ.',
    )
  })

  it('treats object property names as unknown diagnostics', () => {
    expect(new ApiError('toString').message).toBe(apiErrors.vi.unknown)
  })

  it('keeps specialized event errors and structured conflict details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'event schedule has blocking conflicts',
            details: { conflicts: ['event-2'] },
          }),
          { status: 409 },
        ),
      ),
    )
    const error = await actOnClubEvent('club', 'event', 'publish', {}, 'token').catch(
      (failure: unknown) => failure,
    )
    expect(error).toBeInstanceOf(ClubEventError)
    expect(error).toBeInstanceOf(Error)
    expect((error as ClubEventError).details.conflicts).toEqual(['event-2'])
    expect((error as ClubEventError).message).toBe(apiErrors.vi.scheduleConflict)
  })

  it('translates browser network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(apiFetch('/api/v1/test')).rejects.toMatchObject({ message: apiErrors.vi.network })
  })

  it('preserves aborted requests', async () => {
    const error = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
    await expect(apiFetch('/api/v1/test')).rejects.toBe(error)
  })

  it.each([
    [
      'room_allocation',
      'room allocations cannot be attached to an event proposal',
      'bookingRoomAllocation',
    ],
    [
      'not_available',
      'booking does not belong to the club or is no longer available',
      'bookingNotAvailable',
    ],
    ['already_linked', 'booking is already attached to another event', 'bookingAlreadyLinked'],
    [
      'property_mismatch',
      'booking facility does not match the selected event facility',
      'bookingPropertyMismatch',
    ],
    [
      'schedule_not_covered',
      'booking time slot does not cover the event schedule',
      'bookingScheduleNotCovered',
    ],
  ] as const)(
    'resolves booking error %s (%s) to i18n key %s in both vi and en',
    async (bookingError, raw, expectedKey) => {
      const byDetail = resolveClubEventErrorDescriptor('unmapped message', 400, { bookingError })
      expect(byDetail.key).toBe(expectedKey)
      const byMessage = resolveClubEventErrorDescriptor(raw, 400)
      expect(byMessage.key).toBe(expectedKey)
      expect(i18next.t(`clubEvents.errors.${byMessage.key}`)).toBe(
        clubEvents.vi.errors[expectedKey],
      )
      await i18next.changeLanguage('en')
      expect(i18next.t(`clubEvents.errors.${byMessage.key}`)).toBe(
        clubEvents.en.errors[expectedKey],
      )
      expect(i18next.t(`clubEvents.errors.${byMessage.key}`)).not.toBe(raw)
    },
  )

  it('resolves internal 24h notice and never leaks raw unmapped server messages in ClubEventErrorMessage', async () => {
    const notice = resolveClubEventErrorDescriptor(
      'internal event must start at least 24 hours from now',
      400,
    )
    expect(notice).toEqual({ key: 'internalNoticeHours', params: { hours: '24' } })
    expect(i18next.t(`clubEvents.errors.${notice.key}`, notice.params)).toBe(
      'Thời gian bắt đầu sự kiện nội bộ phải cách hiện tại ít nhất 24 giờ.',
    )
    const outsideCheckIn = resolveClubEventErrorDescriptor(
      'only club leaders can manually check in outside the check-in window',
      403,
    )
    expect(outsideCheckIn).toEqual({ key: 'manualCheckInOutsideForbidden' })
    expect(i18next.t(`clubEvents.errors.${outsideCheckIn.key}`)).toBe(
      clubEvents.vi.errors.manualCheckInOutsideForbidden,
    )
    const unknown400 = resolveClubEventErrorDescriptor('some raw backend validation text', 400)
    expect(unknown400.key).toBe('validation')
    await i18next.changeLanguage('en')
    expect(i18next.t(`clubEvents.errors.${outsideCheckIn.key}`)).toBe(
      clubEvents.en.errors.manualCheckInOutsideForbidden,
    )
    expect(i18next.t(`clubEvents.errors.${unknown400.key}`)).toBe(clubEvents.en.errors.validation)
  })
})

describe('apiRequest', () => {
  it('sends JSON with the CSRF header and unwraps the data envelope', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: { id: 'x' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await apiRequest<{ id: string }>('/api/v1/things', {
      method: 'POST',
      csrfToken: 'token',
      body: { name: 'a' },
    })
    expect(result).toEqual({ id: 'x' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/things')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('same-origin')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'token' })
    expect(init.body).toBe('{"name":"a"}')
  })

  it('passes file bodies through untouched and lets explicit headers set their type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: 1 })))
    vi.stubGlobal('fetch', fetchMock)
    const file = new Blob(['pdf'], { type: 'application/pdf' })
    await apiRequest('/api/v1/upload', {
      method: 'POST',
      csrfToken: 'token',
      body: file,
      headers: { 'Content-Type': 'application/pdf' },
    })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.body).toBe(file)
    expect(init.headers).toEqual({ 'Content-Type': 'application/pdf', 'X-CSRF-Token': 'token' })
  })

  it('resolves empty success bodies to undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(apiRequest('/api/v1/things', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('throws ApiError carrying the HTTP status and raw message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: 'policy is not configured' }), { status: 422 }),
        ),
    )
    const error = await apiRequest('/api/v1/things').catch((failure: unknown) => failure)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(422)
    expect((error as ApiError).rawMessage).toBe('policy is not configured')
  })

  it('falls back to the HTTP status when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })),
    )
    const error = (await apiRequest('/api/v1/things').catch(
      (failure: unknown) => failure,
    )) as ApiError
    expect(error.status).toBe(502)
    expect(error.rawMessage).toBe('HTTP 502')
    expect(error.message).toBe(apiErrors.vi.unavailable)
  })

  it('builds domain errors through toError with the parsed details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'conflict', details: { field: 'name' } }), {
          status: 409,
        }),
      ),
    )
    const toError = vi.fn((failure: ApiFailure) => new ApiError(failure.message, failure.status))
    await apiRequest('/api/v1/things', { toError }).catch(() => undefined)
    expect(toError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 409, message: 'conflict', details: { field: 'name' } }),
    )
  })

  it('keeps the status on specialised error subclasses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'event schedule has blocking conflicts' }), {
          status: 409,
        }),
      ),
    )
    const error = await actOnClubEvent('club', 'event', 'publish', {}, 'token').catch(
      (failure: unknown) => failure,
    )
    expect((error as ClubEventError).status).toBe(409)
  })
})
