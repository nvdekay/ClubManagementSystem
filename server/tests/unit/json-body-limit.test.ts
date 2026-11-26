import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/interface/http/server.js'

describe('global JSON body limit', () => {
  let server: Server
  let base = ''
  const large = JSON.stringify({ text: 'x'.repeat(150 * 1024) })

  beforeAll(() => {
    server = buildApp({ publicRepo: {} as never, dbReady: () => true }).listen(0)
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  })

  afterAll(() => {
    server.close()
  })

  function send(method: string, path: string, body: string) {
    return fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  }

  it('rejects JSON bodies above 100kb before any route runs', async () => {
    expect((await send('POST', '/anything', large)).status).toBe(413)
    expect((await send('POST', '/anything', '{"text":"small"}')).status).toBe(404)
  })

  it('leaves larger bodies to the routes that parse them after authentication', async () => {
    for (const [method, path] of [
      ['PUT', '/clubs/c1/periodic-reports/r1'],
      ['PATCH', '/applications/recruitment/a1/draft'],
      ['PUT', '/admin/event-proposals/e1/defense/notes'],
    ] as const) {
      expect((await send(method, path, large)).status, `${method} ${path}`).toBe(404)
    }
  })
})
