import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  APP_CSP,
  FRAMEABLE_APP_CSP,
  HSTS,
  PERMISSIONS_POLICY,
} from '../../src/interface/http/security-headers.js'
import { buildApp } from '../../src/interface/http/server.js'
import { staticClientRoutes } from '../../src/interface/http/static-client.js'

const stubPublic = {} as never

// Starts an app on a random port and returns its base URL.
function start(deps: Partial<Parameters<typeof buildApp>[0]>): { server: Server; base: string } {
  const server = buildApp({ publicRepo: stubPublic, dbReady: () => true, ...deps }).listen(0)
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }
}

describe('one-container hosting of the built client', () => {
  let dist = ''
  let server: Server
  let base = ''

  beforeAll(() => {
    dist = mkdtempSync(path.join(tmpdir(), 'ucms-dist-'))
    mkdirSync(path.join(dist, 'assets'))
    writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>app</title>')
    writeFileSync(path.join(dist, 'proposal-preview.html'), '<!doctype html><title>preview</title>')
    writeFileSync(path.join(dist, 'assets', 'app-Ab12Cd.js'), 'console.log(1)')
    writeFileSync(path.join(dist, 'icon.png'), 'png')
    writeFileSync(path.join(dist, '.env'), 'SECRET=1')
    ;({ server, base } = start({ clientDistDir: dist, apiDocs: true }))
  })

  afterAll(() => {
    server.close()
    rmSync(dist, { recursive: true, force: true })
  })

  it('serves index.html for the root and client routes without caching', async () => {
    for (const route of ['/', '/club/c1/events', '/icpdp/budgets?page=2', '/workspace/x/y']) {
      const res = await fetch(`${base}${route}`)
      expect(res.status, route).toBe(200)
      expect(await res.text()).toContain('<title>app</title>')
      expect(res.headers.get('cache-control')).toBe('no-cache')
      expect(res.headers.get('content-security-policy')).toBe(APP_CSP)
      expect(res.headers.get('x-frame-options')).toBe('DENY')
    }
  })

  it('caches hashed assets for a year and other public files briefly', async () => {
    const asset = await fetch(`${base}/assets/app-Ab12Cd.js`)
    expect(asset.status).toBe(200)
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(asset.headers.get('content-type')).toMatch(/javascript/)
    const icon = await fetch(`${base}/icon.png`)
    expect(icon.headers.get('cache-control')).toBe('public, max-age=3600')
  })

  it('serves the proposal preview page frameable by the same origin only', async () => {
    const res = await fetch(`${base}/proposal-preview.html`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<title>preview</title>')
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN')
    expect(res.headers.get('content-security-policy')).toBe(FRAMEABLE_APP_CSP)
    expect(FRAMEABLE_APP_CSP).toContain("frame-ancestors 'self'")
  })

  it('keeps the JSON 404 envelope for the API, the docs, missing files and non-GET', async () => {
    for (const [method, route] of [
      ['GET', '/api/v1/no-such-route'],
      ['GET', '/api'],
      ['GET', '/docs/missing'],
      ['GET', '/assets/missing-123.js'],
      ['POST', '/club/c1'],
    ] as const) {
      const res = await fetch(`${base}${route}`, { method })
      expect(res.status, `${method} ${route}`).toBe(404)
      expect(res.headers.get('content-type')).toMatch(/application\/json/)
      expect(await res.json()).toMatchObject({ statusCode: 404, error: 'not_found' })
    }
  })

  it('never serves dotfiles from the dist folder', async () => {
    const res = await fetch(`${base}/.env`)
    expect(await res.text()).not.toContain('SECRET')
  })

  it('still serves the API and the docs page with its own policy', async () => {
    const health = await fetch(`${base}/api/v1/health`)
    expect(health.status).toBe(200)
    expect(await health.json()).toEqual({ ok: true })
    const docs = await fetch(`${base}/docs`)
    expect(docs.status).toBe(200)
    const csp = docs.headers.get('content-security-policy') ?? ''
    expect(csp).toMatch(/script-src https:\/\/unpkg\.com 'sha256-[A-Za-z0-9+/]+=*'/)
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('refuses to start when the folder has no index.html', () => {
    expect(() => staticClientRoutes(path.join(dist, 'assets'))).toThrow(/no index\.html/)
  })
})

describe('security headers', () => {
  let servers: Server[] = []

  afterAll(() => {
    servers.forEach((server) => server.close())
    servers = []
  })

  // Fetches the health endpoint of an app built with `deps`.
  async function health(deps: Partial<Parameters<typeof buildApp>[0]>, headers = {}) {
    const { server, base } = start(deps)
    servers.push(server)
    return fetch(`${base}/api/v1/health`, { headers })
  }

  it('sends CSP, Permissions-Policy, nosniff, frame and referrer headers on API responses', async () => {
    const res = await health({})
    expect(res.headers.get('content-security-policy')).toBe(APP_CSP)
    expect(APP_CSP).toContain("script-src 'self'")
    expect(APP_CSP).toContain("frame-ancestors 'none'")
    expect(APP_CSP).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/)
    expect(res.headers.get('permissions-policy')).toBe(PERMISSIONS_POLICY)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('serves the client only when a dist folder is configured', async () => {
    const { server, base } = start({})
    servers.push(server)
    const res = await fetch(`${base}/`)
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'not_found' })
  })

  it('sends HSTS only for HTTPS requests when enabled', async () => {
    const https = { 'X-Forwarded-Proto': 'https' }
    // Behind one trusted proxy that terminated TLS.
    expect(
      (await health({ hsts: true, trustProxy: 1 }, https)).headers.get('strict-transport-security'),
    ).toBe(HSTS)
    // Plain HTTP request.
    expect(
      (await health({ hsts: true, trustProxy: 1 })).headers.get('strict-transport-security'),
    ).toBeNull()
    // X-Forwarded-Proto from an untrusted client is ignored.
    expect(
      (await health({ hsts: true }, https)).headers.get('strict-transport-security'),
    ).toBeNull()
    // Disabled outside production.
    expect(
      (await health({ trustProxy: 1 }, https)).headers.get('strict-transport-security'),
    ).toBeNull()
  })
})
