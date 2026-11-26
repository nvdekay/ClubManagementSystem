import { ApiError, apiFetch } from '@/services/apiError'

/** A failed response as read from the server error envelope; fields may be missing when the body is not JSON. */
export interface ApiFailure {
  status: number
  /** Raw server message, or `HTTP <status>` when the body carries none. */
  message: string
  details?: unknown
  body: { message?: unknown; details?: unknown; [key: string]: unknown } | null
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Serialised as JSON; `FormData` and `Blob` bodies are sent as they are. */
  body?: object
  csrfToken?: string
  signal?: AbortSignal
  headers?: Record<string, string>
  /** Builds a domain error subclass instead of the plain `ApiError`. */
  toError?: (failure: ApiFailure) => Error
}

// Reads the error envelope of a failed response (the body is not guaranteed to be JSON)
export async function readApiFailure(response: Response): Promise<ApiFailure> {
  const body = (await response.json().catch(() => null)) as ApiFailure['body']
  const message =
    typeof body?.message === 'string' && body.message ? body.message : `HTTP ${response.status}`
  return { status: response.status, message, details: body?.details, body }
}

// Calls an /api/v1 endpoint and unwraps `{ data }`; failures throw ApiError carrying the HTTP status
export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, csrfToken, signal, toError } = options
  const headers: Record<string, string> = { ...options.headers }
  let payload: BodyInit | undefined
  if (body instanceof FormData || body instanceof Blob) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  if (csrfToken !== undefined) {
    headers['X-CSRF-Token'] = csrfToken
  }
  const response = await apiFetch(url, {
    method,
    credentials: 'same-origin',
    headers,
    body: payload,
    signal,
  })
  if (!response.ok) {
    const failure = await readApiFailure(response)
    throw toError ? toError(failure) : new ApiError(failure.message, failure.status)
  }
  // Some mutations answer 204 or an empty body; those resolve to undefined.
  const text = await response.text()
  return text ? (JSON.parse(text) as { data: T }).data : (undefined as T)
}
