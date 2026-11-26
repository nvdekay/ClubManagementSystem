import { ApiError } from '@/services/apiError'

const MAX_RETRIES = 2

// Default React Query retry policy: a 4xx answer will not change on retry, so it fails at once;
// server errors (5xx) and network failures are retried at most twice.
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isClientError(error)) {
    return false
  }
  return failureCount < MAX_RETRIES
}

// True for an ApiError whose HTTP status is in the 4xx range
export function isClientError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500
  )
}

// True when the server rejected the session (expired or signed out elsewhere)
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}
