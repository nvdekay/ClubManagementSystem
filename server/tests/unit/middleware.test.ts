import type { Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DomainError } from '../../src/domain/errors.js'
import { errorHandler, requestLogger } from '../../src/interface/http/middleware.js'

function run(err: unknown, path = '/api/v1/users') {
  const out = { status: 0, body: undefined as unknown }
  const res = {
    headersSent: false,
    locals: { requestId: 'req-1' },
    status(code: number) {
      out.status = code
      return this
    },
    json(body: unknown) {
      out.body = body
    },
  }
  errorHandler(err, { originalUrl: path } as Request, res as unknown as Response, () => undefined)
  return out
}

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps DomainError kinds to statuses with the domain message', () => {
    expect(run(new DomainError('invalid email'))).toEqual({
      status: 400,
      body: {
        statusCode: 400,
        error: 'validation',
        message: 'invalid email',
        timestamp: expect.any(String),
        path: '/api/v1/users',
      },
    })
    expect(run(new DomainError('email already registered', 'conflict')).status).toBe(409)
    expect(run(new DomainError('user not found', 'not_found')).status).toBe(404)
  })

  it('includes structured details when the domain error carries them', () => {
    const issues = [{ path: ['email'], message: 'invalid email' }]
    expect(run(new DomainError('invalid email', 'validation', issues)).body).toMatchObject({
      details: issues,
    })
  })

  it('keeps framework 4xx statuses but never echoes err.message, and logs the cause', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const err = Object.assign(new Error('Unexpected token, "SECRET" is not valid JSON'), {
      status: 400,
    })
    expect(run(err)).toEqual({
      status: 400,
      body: {
        statusCode: 400,
        error: 'bad request',
        message: 'bad request',
        timestamp: expect.any(String),
        path: '/api/v1/users',
      },
    })
    expect(warn).toHaveBeenCalledOnce()
  })

  it('maps everything else to a generic 500 and logs it', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(run(new Error('db exploded'))).toEqual({
      status: 500,
      body: {
        statusCode: 500,
        error: 'internal server error',
        message: 'internal server error',
        timestamp: expect.any(String),
        path: '/api/v1/users',
      },
    })
    expect(error).toHaveBeenCalledOnce()
  })

  it('logs only name, message, code and stack of an unexpected error, never its fields', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const err = Object.assign(new Error('write failed'), {
      code: 'E_WRITE',
      document: { email: 'student@fpt.edu.vn' },
    })
    expect(run(err).status).toBe(500)
    const logged = String(error.mock.calls[0]?.[0])
    expect(JSON.parse(logged)).toMatchObject({ level: 'error', requestId: 'req-1' })
    expect(logged).toContain('Error: write failed')
    expect(logged).toContain('code=E_WRITE')
    expect(logged).not.toContain('student@fpt.edu.vn')
  })

  it('maps an escaped Mongo duplicate key error to 409 conflict', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const err = Object.assign(new Error('E11000 duplicate key error dup key: { email: "x" }'), {
      code: 11000,
    })
    const out = run(err)
    expect(out).toEqual({
      status: 409,
      body: {
        statusCode: 409,
        error: 'conflict',
        message: 'resource already exists',
        timestamp: expect.any(String),
        path: '/api/v1/users',
      },
    })
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('email')
  })
})

describe('requestLogger', () => {
  // Runs the logger over a fake request and returns the parsed log line and the response headers.
  function logRequest(originalUrl: string, statusCode: number, incomingId?: string) {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const listeners: Array<() => void> = []
    const headers: Record<string, string> = {}
    const res = {
      statusCode,
      locals: {} as Record<string, unknown>,
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value
      },
      on(event: string, listener: () => void) {
        if (event === 'finish') {
          listeners.push(listener)
        }
      },
    }
    const req = {
      method: 'GET',
      originalUrl,
      get: (name: string) => (name.toLowerCase() === 'x-request-id' ? incomingId : undefined),
    }
    requestLogger(req as unknown as Request, res as unknown as Response, () => undefined)
    listeners.forEach((listener) => listener())
    const written = [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls]
    vi.restoreAllMocks()
    expect(written).toHaveLength(1)
    return {
      line: JSON.parse(String(written[0]?.[0])) as Record<string, unknown>,
      headers,
      locals: res.locals,
    }
  }

  it('logs the path without the query string', () => {
    const { line } = logRequest('/api/v1/auth/callback?code=secret&state=s', 302)
    expect(line.path).toBe('/api/v1/auth/callback')
    expect(JSON.stringify(line)).not.toContain('secret')
  })

  it('generates a request id, echoes it in X-Request-Id and logs it', () => {
    const { line, headers, locals } = logRequest('/api/v1/health', 200)
    expect(headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
    expect(line).toMatchObject({ level: 'info', requestId: headers['x-request-id'], status: 200 })
    expect(locals.requestId).toBe(headers['x-request-id'])
  })

  it('keeps a safe incoming X-Request-Id', () => {
    const { line, headers } = logRequest('/api/v1/health', 200, 'edge-1a2b.3c:4')
    expect(headers['x-request-id']).toBe('edge-1a2b.3c:4')
    expect(line.requestId).toBe('edge-1a2b.3c:4')
  })

  it('replaces an unsafe or oversized incoming X-Request-Id', () => {
    for (const unsafe of ['a b', 'x\r\nSet-Cookie: y', '<script>', 'a'.repeat(65), '']) {
      const { headers } = logRequest('/api/v1/health', 200, unsafe)
      expect(headers['x-request-id']).not.toBe(unsafe)
      expect(headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it('sets the level from the status code', () => {
    expect(logRequest('/a', 302).line.level).toBe('info')
    expect(logRequest('/a', 404).line.level).toBe('warn')
    expect(logRequest('/a', 503).line.level).toBe('error')
  })
})
