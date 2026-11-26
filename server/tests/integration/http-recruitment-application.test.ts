// Recruitment applications (UC17/UC18/UC19) over HTTP: the student side (draft, answers,
// attachments, submit, withdraw) and the club review side (screen, shortlist, decide, onboard,
// decline), on the real app with Mongo, sessions and CSRF.
import { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ucmsModels as m } from '../../src/infra/db/ucms-models.js'
import {
  type Actor,
  DAY,
  type Harness,
  type SeededClub,
  dataOf,
  missingId,
  startHttpHarness,
} from './http-harness.js'

const pdf = Buffer.from('%PDF-1.7\n%%EOF\n', 'latin1')
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16, 1)])

describe.skipIf(!process.env.MONGO_URI)('HTTP: recruitment application routes', () => {
  let h: Harness
  let leader: Actor, member: Actor, otherLeader: Actor
  let alice: Actor, bob: Actor, carol: Actor, dave: Actor
  let club: SeededClub, otherClub: SeededClub
  let campaignId = '',
    closedCampaignId = ''

  async function seedCampaign(clubId: string, windowStart: Date, windowEnd: Date) {
    const doc = await m.recruitmentCampaigns!.create({
      clubId: new Types.ObjectId(clubId),
      title: 'Autumn intake',
      positions: ['Designer', 'Developer'],
      criteria: 'Interested students',
      windowStart,
      windowEnd,
      capacity: 2,
      selectionSteps: [{ name: 'Application' }],
      formSchema: [
        { key: 'motivation', label: 'Why?', type: 'textarea', required: true },
        { key: 'resume', label: 'Resume', type: 'file', required: true },
      ],
      rubric: [],
      state: 'Published',
      publishedBy: new Types.ObjectId(leader.id),
      publishedAt: windowStart,
      createdAt: windowStart,
    })
    return String(doc._id)
  }

  /** Creates, fills and submits an application for `who`; returns its id. */
  async function submitted(who: Actor, position = 'Designer') {
    const draft = dataOf(
      await h.call(who, 'POST', '/applications/recruitment', { campaignId, position }),
      201,
    )
    dataOf(
      await h.call(who, 'PATCH', `/applications/recruitment/${draft.id}/draft`, {
        position,
        answers: { motivation: 'I like it' },
      }),
    )
    dataOf(
      await h.call(who, 'POST', `/applications/recruitment/${draft.id}/attachments`, pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'X-Field-Key': 'resume',
          'X-Filename': encodeURIComponent('cv.pdf'),
        },
      }),
      201,
    )
    dataOf(await h.call(who, 'POST', `/applications/recruitment/${draft.id}/submit`))
    return draft.id as string
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-recruitment')
    leader = await h.signIn('leader@http.edu')
    member = await h.signIn('member@http.edu')
    otherLeader = await h.signIn('other-leader@http.edu')
    alice = await h.signIn('alice@http.edu')
    bob = await h.signIn('bob@http.edu')
    carol = await h.signIn('carol@http.edu')
    dave = await h.signIn('dave@http.edu')
    club = await h.seedClub({ code: 'REC', leader, members: [member] })
    otherClub = await h.seedClub({ code: 'RX', leader: otherLeader })
    const now = Date.now()
    campaignId = await seedCampaign(club.id, new Date(now - DAY), new Date(now + 30 * DAY))
    closedCampaignId = await seedCampaign(
      club.id,
      new Date(now - 30 * DAY),
      new Date(now - 2 * DAY),
    )
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('student side', () => {
    let draftId = ''
    let attachmentId = ''

    it('creates one draft per campaign and validates the request', async () => {
      expect((await h.call(null, 'POST', '/applications/recruitment', {})).status).toBe(401)
      expect(
        (
          await h.call(
            alice,
            'POST',
            '/applications/recruitment',
            { campaignId, position: 'Designer' },
            { noCsrf: true },
          )
        ).status,
      ).toBe(403)
      expect(
        (
          await h.call(alice, 'POST', '/applications/recruitment', {
            campaignId: 'x',
            position: 'a',
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(alice, 'POST', '/applications/recruitment', {
            campaignId,
            position: 'Designer',
            extra: 1,
          })
        ).status,
      ).toBe(400)
      expect(
        (await h.call(alice, 'POST', '/applications/recruitment', { campaignId, position: 'Chef' }))
          .status,
      ).toBe(400)
      expect(
        (
          await h.call(alice, 'POST', '/applications/recruitment', {
            campaignId: missingId(),
            position: 'Designer',
          })
        ).status,
      ).toBe(404)
      expect(
        (
          await h.call(alice, 'POST', '/applications/recruitment', {
            campaignId: closedCampaignId,
            position: 'Designer',
          })
        ).status,
      ).toBe(404)
      // A current member cannot apply to their own club.
      expect(
        (
          await h.call(member, 'POST', '/applications/recruitment', {
            campaignId,
            position: 'Designer',
          })
        ).status,
      ).toBe(409)

      const draft = dataOf(
        await h.call(alice, 'POST', '/applications/recruitment', {
          campaignId,
          position: 'Designer',
        }),
        201,
      )
      expect(draft).toMatchObject({ state: 'Draft', position: 'Designer', attachments: [] })
      draftId = draft.id
      expect(
        (
          await h.call(alice, 'POST', '/applications/recruitment', {
            campaignId,
            position: 'Developer',
          })
        ).status,
      ).toBe(409)
    })

    it('reads my applications by id and by campaign, never someone else’s', async () => {
      expect(dataOf(await h.call(alice, 'GET', `/applications/recruitment/${draftId}`)).id).toBe(
        draftId,
      )
      expect(
        dataOf(await h.call(alice, 'GET', `/applications/recruitment/by-campaign/${campaignId}`))
          .id,
      ).toBe(draftId)
      expect(
        dataOf(await h.call(bob, 'GET', `/applications/recruitment/by-campaign/${campaignId}`)),
      ).toBeNull()
      expect((await h.call(bob, 'GET', `/applications/recruitment/${draftId}`)).status).toBe(404)
      expect((await h.call(alice, 'GET', '/applications/recruitment/zzz')).status).toBe(400)
      expect((await h.call(alice, 'GET', '/applications/recruitment/by-campaign/zzz')).status).toBe(
        400,
      )
      const mine = dataOf(await h.call(alice, 'GET', '/applications/recruitment/mine'))
      expect(mine.map((row: { id: string }) => row.id)).toEqual([draftId])
    })

    it('saves draft answers and rejects unknown questions or positions', async () => {
      const path = `/applications/recruitment/${draftId}/draft`
      const saved = dataOf(
        await h.call(alice, 'PATCH', path, {
          position: 'Developer',
          answers: { motivation: '  I build things  ' },
        }),
      )
      expect(saved).toMatchObject({
        position: 'Developer',
        answers: { motivation: 'I build things' },
      })
      // Drafts are lenient: an unknown answer is kept, and only submission rejects it.
      dataOf(
        await h.call(alice, 'PATCH', path, {
          position: 'Developer',
          answers: { motivation: 'x', unknown: 'x' },
        }),
      )
      expect(
        (await h.call(alice, 'POST', `/applications/recruitment/${draftId}/submit`)).status,
      ).toBe(400)
      dataOf(
        await h.call(alice, 'PATCH', path, {
          position: 'Developer',
          answers: { motivation: 'I build things' },
        }),
      )
      expect(
        (await h.call(alice, 'PATCH', path, { position: 'Developer', answers: { 'Bad-Key': 'x' } }))
          .status,
      ).toBe(400)
      expect((await h.call(alice, 'PATCH', path, { position: 'Chef', answers: {} })).status).toBe(
        400,
      )
      expect((await h.call(alice, 'PATCH', path, { answers: {} })).status).toBe(400)
      expect(
        (await h.call(bob, 'PATCH', path, { position: 'Developer', answers: {} })).status,
      ).toBe(404)
      expect(
        (
          await h.call(
            alice,
            'PATCH',
            path,
            { position: 'Developer', answers: {} },
            { noCsrf: true },
          )
        ).status,
      ).toBe(403)
    })

    it('submitting without the required file is a validation error', async () => {
      expect(
        (await h.call(alice, 'POST', `/applications/recruitment/${draftId}/submit`)).status,
      ).toBe(400)
    })

    it('uploads one attachment per file question and serves it back without the asset id', async () => {
      const path = `/applications/recruitment/${draftId}/attachments`
      function headers(extra: Record<string, string> = {}) {
        return {
          'Content-Type': 'application/pdf',
          'X-Field-Key': 'resume',
          'X-Filename': encodeURIComponent('hồ sơ.pdf'),
          ...extra,
        }
      }
      expect(
        (await h.call(alice, 'POST', path, pdf, { headers: headers({ 'X-Field-Key': '' }) }))
          .status,
      ).toBe(400)
      expect(
        (await h.call(alice, 'POST', path, pdf, { headers: headers({ 'X-Filename': '%E0%A4%A' }) }))
          .status,
      ).toBe(400)
      expect(
        (
          await h.call(alice, 'POST', path, pdf, {
            headers: headers({ 'X-Field-Key': 'motivation' }),
          })
        ).status,
      ).toBe(400)
      // Declared PDF whose bytes are a PNG: the signature check rejects it.
      expect((await h.call(alice, 'POST', path, png, { headers: headers() })).status).toBe(400)
      expect(
        (
          await h.call(alice, 'POST', path, png, {
            headers: headers({ 'Content-Type': 'image/gif' }),
          })
        ).status,
      ).toBe(400)
      expect((await h.call(bob, 'POST', path, pdf, { headers: headers() })).status).toBe(404)

      const uploaded = dataOf(await h.call(alice, 'POST', path, pdf, { headers: headers() }), 201)
      expect(uploaded.attachments).toHaveLength(1)
      expect(uploaded.attachments[0]).toMatchObject({ fieldKey: 'resume', fileName: 'hồ sơ.pdf' })
      expect(uploaded.attachments[0].assetId).toBeUndefined()
      attachmentId = uploaded.attachments[0].id
      expect((await h.call(alice, 'POST', path, pdf, { headers: headers() })).status).toBe(409)

      const access = dataOf(await h.call(alice, 'GET', `${path}/${attachmentId}/access`))
      expect(access).toEqual({
        url: expect.stringContaining('https://files.test/'),
        fileName: 'hồ sơ.pdf',
      })
      expect((await h.call(bob, 'GET', `${path}/${attachmentId}/access`)).status).toBe(404)
      expect((await h.call(alice, 'GET', `${path}/not-a-uuid/access`)).status).toBe(400)
    })

    it('submits once, then the draft is frozen; withdrawal works until a decision', async () => {
      const submittedApp = dataOf(
        await h.call(alice, 'POST', `/applications/recruitment/${draftId}/submit`),
      )
      expect(submittedApp.state).toBe('Submitted')
      expect(
        (await h.call(alice, 'POST', `/applications/recruitment/${draftId}/submit`)).status,
      ).toBe(409)
      expect(
        (
          await h.call(alice, 'PATCH', `/applications/recruitment/${draftId}/draft`, {
            position: 'Developer',
            answers: {},
          })
        ).status,
      ).toBe(409)
      expect(
        (await h.call(bob, 'POST', `/applications/recruitment/${draftId}/withdraw`)).status,
      ).toBe(404)
      expect(
        dataOf(await h.call(alice, 'POST', `/applications/recruitment/${draftId}/withdraw`)).state,
      ).toBe('Withdrawn')
      expect(
        (await h.call(alice, 'POST', `/applications/recruitment/${draftId}/withdraw`)).status,
      ).toBe(409)
      expect((await h.call(alice, 'POST', '/applications/recruitment/bad/withdraw')).status).toBe(
        400,
      )
      expect(
        (await h.call(alice, 'POST', `/applications/recruitment/${missingId()}/submit`)).status,
      ).toBe(404)
    })
  })

  describe('club review side', () => {
    let bobApp = '',
      carolApp = '',
      daveApp = ''
    function base(clubId = club.id, campaign = campaignId) {
      return `/clubs/${clubId}/recruitment/campaigns/${campaign}/applications`
    }

    beforeAll(async () => {
      bobApp = await submitted(bob)
      carolApp = await submitted(carol, 'Developer')
      daveApp = await submitted(dave)
    })

    it('lists the campaign queue with an optional state filter, leader only', async () => {
      const all = dataOf(await h.call(leader, 'GET', base()))
      // Drafts are never listed; alice's withdrawn application is.
      expect(all).toHaveLength(4)
      expect(all.map((row: { id: string }) => row.id)).toEqual(
        expect.arrayContaining([bobApp, carolApp, daveApp]),
      )
      expect(all[1].applicantName).toBe('bob')
      expect(
        all.every((row: { attachments: { assetId?: string }[] }) =>
          row.attachments.every((item) => item.assetId === undefined),
        ),
      ).toBe(true)
      const withdrawn = dataOf(await h.call(leader, 'GET', `${base()}?state=Withdrawn`))
      expect(withdrawn).toHaveLength(1)
      expect((await h.call(leader, 'GET', `${base()}?state=Bogus`)).status).toBe(400)
      expect((await h.call(member, 'GET', base())).status).toBe(403)
      expect((await h.call(otherLeader, 'GET', base())).status).toBe(403)
      expect((await h.call(leader, 'GET', base('bad'))).status).toBe(400)
      expect((await h.call(leader, 'GET', base(club.id, 'bad'))).status).toBe(400)
      expect((await h.call(null, 'GET', base())).status).toBe(401)
    })

    it('lets the reviewer open an applicant attachment', async () => {
      const app = dataOf(await h.call(bob, 'GET', `/applications/recruitment/${bobApp}`))
      const attachment = app.attachments[0].id
      const path = `${base()}/${bobApp}/attachments/${attachment}/access`
      expect(dataOf(await h.call(leader, 'GET', path)).url).toContain('https://files.test/')
      expect((await h.call(member, 'GET', path)).status).toBe(403)
      expect(
        (await h.call(leader, 'GET', `${base()}/${bobApp}/attachments/bad/access`)).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            leader,
            'GET',
            `${base()}/${bobApp}/attachments/${crypto.randomUUID()}/access`,
          )
        ).status,
      ).toBe(404)
    })

    it('validates review requests', async () => {
      const path = `${base()}/review`
      expect(
        (await h.call(leader, 'POST', path, { action: 'screen', applicationIds: [] })).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', path, { action: 'fly', applicationIds: [bobApp] })).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', path, { action: 'screen', applicationIds: [bobApp, bobApp] }))
          .status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', path, { action: 'decide', applicationIds: [bobApp] })).status,
      ).toBe(400)
      expect(
        (
          await h.call(leader, 'POST', path, {
            action: 'decide',
            outcome: 'Rejected',
            applicationIds: [bobApp],
          })
        ).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', path, { action: 'shortlist', applicationIds: [bobApp] }))
          .status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', path, { action: 'screen', applicationIds: [missingId()] }))
          .status,
      ).toBe(404)
      expect(
        (
          await h.call(leader, 'POST', path, {
            action: 'shortlist',
            applicationIds: [bobApp],
            reason: 'r',
          })
        ).status,
      ).toBe(409)
      expect(
        (await h.call(member, 'POST', path, { action: 'screen', applicationIds: [bobApp] })).status,
      ).toBe(403)
      expect(
        (
          await h.call(
            leader,
            'POST',
            path,
            { action: 'screen', applicationIds: [bobApp] },
            { noCsrf: true },
          )
        ).status,
      ).toBe(403)
      expect(
        (
          await h.call(otherLeader, 'POST', `${base(otherClub.id)}/review`, {
            action: 'screen',
            applicationIds: [bobApp],
          })
        ).status,
      ).toBe(404)
    })

    it('moves candidates through screen, shortlist and decide', async () => {
      const path = `${base()}/review`
      const screened = dataOf(
        await h.call(leader, 'POST', path, {
          action: 'screen',
          applicationIds: [bobApp, carolApp, daveApp],
        }),
      )
      expect(screened.map((row: { state: string }) => row.state)).toEqual([
        'Screening',
        'Screening',
        'Screening',
      ])
      dataOf(
        await h.call(leader, 'POST', path, {
          action: 'shortlist',
          applicationIds: [bobApp, carolApp, daveApp],
          reason: 'good fit',
        }),
      )
      const accepted = dataOf(
        await h.call(leader, 'POST', path, {
          action: 'decide',
          outcome: 'Accepted',
          applicationIds: [bobApp, carolApp],
        }),
      )
      expect(accepted.map((row: { state: string }) => row.state)).toEqual(['Accepted', 'Accepted'])
      // Capacity 2 is full: a third acceptance must go to the waitlist instead.
      expect(
        (
          await h.call(leader, 'POST', path, {
            action: 'decide',
            outcome: 'Accepted',
            applicationIds: [daveApp],
          })
        ).status,
      ).toBe(409)
      expect(
        dataOf(
          await h.call(leader, 'POST', path, {
            action: 'decide',
            outcome: 'Waitlisted',
            applicationIds: [daveApp],
          }),
        )[0].state,
      ).toBe('Waitlisted')
    })

    it('onboards an accepted candidate as a member, once', async () => {
      const path = `${base()}/${bobApp}/onboard`
      expect((await h.call(leader, 'POST', path, { joinedAt: 'soon' })).status).toBe(400)
      expect(
        (
          await h.call(leader, 'POST', path, {
            joinedAt: new Date(Date.now() + 5 * DAY).toISOString(),
          })
        ).status,
      ).toBe(400)
      expect((await h.call(leader, 'POST', path, { departmentId: missingId() })).status).toBe(400)
      expect((await h.call(member, 'POST', path, {})).status).toBe(403)
      expect((await h.call(leader, 'POST', `${base()}/${missingId()}/onboard`, {})).status).toBe(
        404,
      )
      expect((await h.call(leader, 'POST', `${base()}/${daveApp}/onboard`, {})).status).toBe(409)

      expect(dataOf(await h.call(leader, 'POST', path, {})).state).toBe('Onboarded')
      expect((await h.call(leader, 'POST', path, {})).status).toBe(409)
      const mine = dataOf(await h.call(bob, 'GET', '/memberships/mine'))
      expect(mine[0]).toMatchObject({ clubId: club.id, state: 'Active' })
    })

    it('records a decline of an accepted candidate, once', async () => {
      const path = `${base()}/${carolApp}/decline`
      expect((await h.call(leader, 'POST', path, { reason: 'x'.repeat(2001) })).status).toBe(400)
      expect((await h.call(leader, 'POST', path, { note: 'x' })).status).toBe(400)
      expect((await h.call(member, 'POST', path, {})).status).toBe(403)
      expect((await h.call(leader, 'POST', `${base()}/${missingId()}/decline`, {})).status).toBe(
        404,
      )
      expect(dataOf(await h.call(leader, 'POST', path, { reason: 'studies abroad' })).state).toBe(
        'Declined',
      )
      expect((await h.call(leader, 'POST', path, {})).status).toBe(409)
    })

    it('promotes the waitlisted candidate once a seat frees up', async () => {
      const promoted = dataOf(
        await h.call(leader, 'POST', `${base()}/review`, {
          action: 'promote',
          applicationIds: [daveApp],
        }),
      )
      expect(promoted[0].state).toBe('Accepted')
    })
  })
})
