// Account administration (UC03/UC04) over HTTP: real app, Mongo, sessions and CSRF.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type Actor, type Harness, dataOf, missingId, startHttpHarness } from './http-harness.js'

describe.skipIf(!process.env.MONGO_URI)('HTTP: account admin routes', () => {
  let h: Harness
  let student: Actor, other: Actor, second: Actor

  beforeAll(async () => {
    h = await startHttpHarness('http-account-admin')
    student = await h.signIn('student@http.edu', 'Nguyễn Sinh Viên')
    other = await h.signIn('other@http.edu', 'Trần Khác')
    second = await h.signInOfficer('second@http.edu')
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('GET /admin/users', () => {
    it('pages and searches users with their system roles', async () => {
      const page = dataOf(await h.call(h.officer, 'GET', '/admin/users?page=1&pageSize=2'))
      expect(page).toMatchObject({ page: 1, pageSize: 2, total: 4 })
      expect(page.items).toHaveLength(2)
      const found = dataOf(await h.call(h.officer, 'GET', '/admin/users?search=Sinh'))
      expect(found.total).toBe(1)
      expect(found.items[0]).toMatchObject({
        user: { email: 'student@http.edu' },
        systemRoles: [],
        clubs: [],
      })
      const officers = dataOf(await h.call(h.officer, 'GET', '/admin/users?search=second'))
      expect(officers.items[0].systemRoles).toEqual(['ICPDP_OFFICER'])
    })

    it('is a read: works without a CSRF token', async () => {
      expect(
        (await h.call(h.officer, 'GET', '/admin/users', undefined, { noCsrf: true })).status,
      ).toBe(200)
    })

    it('rejects anonymous callers, students and bad paging', async () => {
      const anonymous = await h.call(null, 'GET', '/admin/users')
      expect(anonymous.status).toBe(401)
      expect(anonymous.body).toMatchObject({
        statusCode: 401,
        error: 'unauthorized',
        path: '/api/v1/admin/users',
      })
      expect((await h.call(student, 'GET', '/admin/users')).status).toBe(403)
      expect((await h.call(h.officer, 'GET', '/admin/users?pageSize=51')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/users?page=0')).status).toBe(400)
      expect(
        (await h.call(h.officer, 'GET', `/admin/users?search=${'x'.repeat(101)}`)).status,
      ).toBe(400)
    })

    it('rejects a forged session cookie', async () => {
      const forged = { ...student, cookie: 'not-a-real-session' }
      expect((await h.call(forged, 'GET', '/admin/users')).status).toBe(401)
    })
  })

  describe('POST/DELETE /admin/users/:id/roles', () => {
    it('requires a CSRF token on mutations', async () => {
      const path = `/admin/users/${student.id}/roles`
      const body = { roleCode: 'ICPDP_OFFICER' }
      expect((await h.call(h.officer, 'POST', path, body, { noCsrf: true })).status).toBe(403)
      expect((await h.call(h.officer, 'POST', path, body, { csrf: 'wrong' })).status).toBe(403)
      expect((await h.call(null, 'POST', path, body)).status).toBe(401)
    })

    it('validates the body, target id and role code', async () => {
      expect(
        (await h.call(h.officer, 'POST', `/admin/users/${student.id}/roles`, { roleCode: 1 }))
          .status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/users/${student.id}/roles`, {
            roleCode: 'ICPDP_OFFICER',
            extra: true,
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', '/admin/users/not-an-id/roles', {
            roleCode: 'ICPDP_OFFICER',
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/users/${student.id}/roles`, {
            roleCode: 'CLUB_LEADER',
          })
        ).status,
      ).toBe(400)
    })

    it('returns 404 for an unknown user and 403 for a student caller', async () => {
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/users/${missingId()}/roles`, {
            roleCode: 'ICPDP_OFFICER',
          })
        ).status,
      ).toBe(404)
      expect(
        (
          await h.call(student, 'POST', `/admin/users/${other.id}/roles`, {
            roleCode: 'ICPDP_OFFICER',
          })
        ).status,
      ).toBe(403)
    })

    it('grants a role, refuses a duplicate grant, then revokes it with a reason', async () => {
      const path = `/admin/users/${other.id}/roles`
      expect(
        dataOf(
          await h.call(h.officer, 'POST', path, { roleCode: 'ICPDP_OFFICER', reason: 'staff' }),
        ),
      ).toEqual({ changed: true })
      expect((await h.call(h.officer, 'POST', path, { roleCode: 'ICPDP_OFFICER' })).status).toBe(
        409,
      )
      // Granting revokes the target's sessions, so they must sign in again.
      expect((await h.call(other, 'GET', '/admin/users')).status).toBe(401)
      other = await h.signIn('other@http.edu')
      expect((await h.call(other, 'GET', '/admin/users')).status).toBe(200)

      const revokePath = `${path}/ICPDP_OFFICER`
      expect((await h.call(h.officer, 'DELETE', revokePath, {})).status).toBe(400)
      expect((await h.call(h.officer, 'DELETE', revokePath, { reason: '' })).status).toBe(400)
      expect(
        dataOf(await h.call(h.officer, 'DELETE', revokePath, { reason: 'left office' })),
      ).toEqual({ changed: true })
      expect((await h.call(h.officer, 'DELETE', revokePath, { reason: 'again' })).status).toBe(404)
      expect(
        (await h.call(h.officer, 'DELETE', `${path}/NOT_A_ROLE`, { reason: 'x' })).status,
      ).toBe(400)
    })

    it('forbids an officer revoking their own officer role', async () => {
      expect(
        (
          await h.call(h.officer, 'DELETE', `/admin/users/${h.officer.id}/roles/ICPDP_OFFICER`, {
            reason: 'self',
          })
        ).status,
      ).toBe(403)
    })
  })

  describe('POST /admin/users/:id/lock and /unlock', () => {
    it('locks an account with a reason, which blocks its sessions, then unlocks it', async () => {
      const target = await h.signIn('locked@http.edu')
      expect((await h.call(h.officer, 'POST', `/admin/users/${target.id}/lock`, {})).status).toBe(
        400,
      )
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/users/${target.id}/lock`, {
            reason: 'x',
            violationId: 'bad',
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/users/${target.id}/lock`, {
            reason: 'x',
            violationId: missingId(),
          })
        ).status,
      ).toBe(404)
      expect(
        dataOf(
          await h.call(h.officer, 'POST', `/admin/users/${target.id}/lock`, { reason: 'spam' }),
        ),
      ).toEqual({ changed: true })
      const fresh = await h.signIn('locked@http.edu')
      const blocked = await h.call(fresh, 'GET', '/memberships/mine')
      expect(blocked.status).toBe(423)
      expect(blocked.body.message).toBe('spam')

      expect(
        (await h.call(h.officer, 'POST', `/admin/users/${target.id}/unlock`, { reason: ' ' }))
          .status,
      ).toBe(400)
      expect(
        dataOf(
          await h.call(h.officer, 'POST', `/admin/users/${target.id}/unlock`, {
            reason: 'appeal ok',
          }),
        ),
      ).toEqual({ changed: true })
      const back = await h.signIn('locked@http.edu')
      expect((await h.call(back, 'GET', '/memberships/mine')).status).toBe(200)
    })

    it('refuses self-lock, unknown users, students and missing CSRF', async () => {
      expect(
        (await h.call(second, 'POST', `/admin/users/${second.id}/lock`, { reason: 'x' })).status,
      ).toBe(403)
      expect(
        (await h.call(h.officer, 'POST', `/admin/users/${missingId()}/unlock`, { reason: 'x' }))
          .status,
      ).toBe(404)
      expect(
        (await h.call(student, 'POST', `/admin/users/${other.id}/lock`, { reason: 'x' })).status,
      ).toBe(403)
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            `/admin/users/${other.id}/lock`,
            { reason: 'x' },
            { noCsrf: true },
          )
        ).status,
      ).toBe(403)
    })
  })
})
