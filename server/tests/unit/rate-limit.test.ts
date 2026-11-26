import type { AddressInfo } from 'node:net'
import express from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rateLimit } from '../../src/interface/http/rate-limit.js'
import { buildApp } from '../../src/interface/http/server.js'

const closers: Array<() => void> = []

afterEach(() => {
  while (closers.length > 0) {
    closers.pop()?.()
  }
  vi.useRealTimers()
})

function serve(app: express.Express) {
  const server = app.listen(0)
  closers.push(() => server.close())
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return function call(path: string, headers: Record<string, string> = {}) {
    return fetch(`${base}${path}`, { headers })
  }
}

describe('rateLimit', () => {
  it('rejects requests over the limit with 429, the error envelope and Retry-After', async () => {
    let clock = 1_000_000
    const limiter = rateLimit({ limit: 2, windowMs: 60_000, now: () => clock })
    closers.push(limiter.stop)
    const app = express()
    app.use(limiter)
    app.get('/x', (_req, res) => {
      res.status(204).end()
    })
    const call = serve(app)

    expect((await call('/x')).status).toBe(204)
    expect((await call('/x')).status).toBe(204)
    clock += 15_000
    const blocked = await call('/x?code=secret')
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBe('45')
    expect(await blocked.json()).toMatchObject({
      statusCode: 429,
      error: 'too_many_requests',
      message: expect.any(String),
    })

    clock += 45_000 // window over: the counter starts again
    expect((await call('/x')).status).toBe(204)
  })

  it('sweeps expired buckets so idle clients do not accumulate', () => {
    vi.useFakeTimers()
    let clock = 0
    const limiter = rateLimit({ limit: 5, windowMs: 1_000, now: () => clock })
    closers.push(limiter.stop)
    const req = { ip: '10.0.0.1', socket: {} } as unknown as express.Request
    const res = {} as express.Response
    limiter(req, res, () => undefined)
    limiter({ ...req, ip: '10.0.0.2' } as express.Request, res, () => undefined)
    expect(limiter.bucketCount()).toBe(2)
    clock = 1_500
    vi.advanceTimersByTime(1_000)
    expect(limiter.bucketCount()).toBe(0)
  })
})

describe('buildApp rate limits and trust proxy', () => {
  const publicRepo = {} as Parameters<typeof buildApp>[0]['publicRepo']

  it('applies the strict limit to /api/v1/auth and the global limit to /api/v1', async () => {
    const call = serve(
      buildApp({
        publicRepo,
        dbReady: () => true,
        rateLimits: {
          auth: { limit: 1, windowMs: 60_000 },
          api: { limit: 3, windowMs: 60_000 },
        },
      }),
    )
    // Auth routes are not mounted without auth deps, so the 404 envelope proves the request passed.
    expect((await call('/api/v1/auth/me')).status).toBe(404)
    expect((await call('/api/v1/auth/me')).status).toBe(429)
    expect((await call('/api/v1/health')).status).toBe(200)
    expect((await call('/api/v1/health')).status).toBe(200)
    expect((await call('/api/v1/health')).status).toBe(429) // global budget of 3 used up
  })

  it('keys clients by X-Forwarded-For only when a proxy is trusted', async () => {
    const limits = { auth: { limit: 1, windowMs: 60_000 }, api: { limit: 100, windowMs: 60_000 } }
    const trusted = serve(
      buildApp({ publicRepo, dbReady: () => true, rateLimits: limits, trustProxy: 1 }),
    )
    expect((await trusted('/api/v1/auth/me', { 'x-forwarded-for': '203.0.113.1' })).status).toBe(
      404,
    )
    expect((await trusted('/api/v1/auth/me', { 'x-forwarded-for': '203.0.113.2' })).status).toBe(
      404,
    )

    const direct = serve(buildApp({ publicRepo, dbReady: () => true, rateLimits: limits }))
    expect((await direct('/api/v1/auth/me', { 'x-forwarded-for': '203.0.113.1' })).status).toBe(404)
    expect((await direct('/api/v1/auth/me', { 'x-forwarded-for': '203.0.113.2' })).status).toBe(429)
  })
})
