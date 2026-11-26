import { describe, expect, it } from 'vitest'

import { ApiError } from '@/services/apiError'
import { isUnauthorized, shouldRetryQuery } from '@/utils/queryRetry'

describe('shouldRetryQuery', () => {
  it.each([400, 401, 403, 404, 409, 413, 422, 429])('never retries HTTP %i', (status) => {
    expect(shouldRetryQuery(0, new ApiError('x', status))).toBe(false)
  })

  it.each([
    ['a server error', new ApiError('HTTP 500', 500)],
    ['a gateway error', new ApiError('HTTP 503', 503)],
    ['a network failure', new ApiError('Network request failed')],
    ['an unexpected error', new Error('boom')],
  ])('retries %s at most twice', (_label, error) => {
    expect(shouldRetryQuery(0, error)).toBe(true)
    expect(shouldRetryQuery(1, error)).toBe(true)
    expect(shouldRetryQuery(2, error)).toBe(false)
  })
})

describe('isUnauthorized', () => {
  it('only matches a 401 ApiError', () => {
    expect(isUnauthorized(new ApiError('HTTP 401', 401))).toBe(true)
    expect(isUnauthorized(new ApiError('HTTP 403', 403))).toBe(false)
    expect(isUnauthorized(new Error('HTTP 401'))).toBe(false)
  })
})
