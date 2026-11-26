import { describe, expect, it, vi } from 'vitest'
import {
  normalizePeriodicDraft,
  type ClubPeriodicReportRepository,
} from '../../src/domain/club-periodic-report.js'
import {
  isValidEvidenceLink,
  type PeriodicEvidenceStorage,
  type PeriodicReportDetail,
  type PeriodicReportRepository,
} from '../../src/domain/periodic-report.js'
import {
  changeClubPeriodicReport,
  listClubPeriodicReports,
  uploadPeriodicEvidenceImage,
} from '../../src/usecase/club-periodic-report.js'
import { getPeriodicReport } from '../../src/usecase/periodic-report.js'

const clubId = '0000000000000000000000c1'
const otherClubId = '0000000000000000000000c2'
const userId = '000000000000000000000002'
const reportId = '0000000000000000000000a1'
const now = new Date('2026-10-15T00:00:00Z')
const actor = { id: userId, accountState: 'Active' as const }
const assetId = '0123456789abcdef0123456789abcdef'
const reference = `ucms-evidence:${clubId}:${assetId}`
const legacyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13])
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16])
const webp = Buffer.concat([
  Buffer.from('RIFF', 'latin1'),
  Buffer.from([0x10, 0, 0, 0]),
  Buffer.from('WEBPVP8 ', 'latin1'),
])
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
const gif = Buffer.from('GIF89a', 'latin1')

const denied = { findSnapshot: async () => null }
const leader = {
  findSnapshot: async () => ({
    clubId,
    clubName: 'Test Club',
    clubState: 'Active',
    membership: { id: 'm1', clubId, state: 'Active' },
    terms: [
      {
        id: 't1',
        clubId,
        state: 'Active',
        startAt: new Date('2026-01-01Z'),
        endAt: new Date('2027-01-01Z'),
      },
    ],
    positions: [{ id: 'p1', clubId, isActive: true, isLeaderRole: true }],
    assignments: [
      {
        clubId,
        termId: 't1',
        positionId: 'p1',
        membershipId: 'm1',
        confirmedBy: 'o1',
        effectiveFrom: new Date('2026-01-01Z'),
      },
    ],
    isApprovedFounder: false,
  }),
}

function storage(): PeriodicEvidenceStorage {
  return {
    upload: vi.fn(async () => ({ assetId })),
    accessUrl: vi.fn(async (id: string) => `https://files.example/${id}?sig=1`),
    remove: vi.fn(async () => undefined),
  }
}

function report(overrides: Partial<PeriodicReportDetail> = {}): PeriodicReportDetail {
  return {
    id: reportId,
    clubId,
    clubName: 'Test Club',
    periodCode: 'Fall 2026',
    periodType: 'Semester',
    state: 'Draft',
    versionNo: 0,
    lateFlag: false,
    dueAt: now,
    evidence: [],
    preloadedFigures: {},
    live: { events: {}, members: {}, attendance: {}, finance: {} },
    history: [],
    ...overrides,
  }
}

function clubRepo(found: PeriodicReportDetail): ClubPeriodicReportRepository {
  return {
    list: vi.fn(async () => [found]),
    getCampaign: vi.fn(async () => null),
    create: vi.fn(),
    save: vi.fn(async () => found),
    submit: vi.fn(async () => found),
  }
}

describe('periodic report evidence image upload', () => {
  it('requires the periodic report permission before touching storage', async () => {
    const files = storage()
    await expect(
      uploadPeriodicEvidenceImage(files, denied, actor, clubId, 'image/png', png, now),
    ).rejects.toMatchObject({ kind: 'forbidden' })
    await expect(
      uploadPeriodicEvidenceImage(files, denied, null, clubId, 'image/png', png, now),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(files.upload).not.toHaveBeenCalled()
  })

  it('accepts PNG, JPEG and WebP and returns a club-bound reference with a signed URL', async () => {
    for (const [mimeType, bytes] of [
      ['image/png', png],
      ['image/jpeg', jpeg],
      ['image/webp', webp],
    ] as const) {
      const files = storage()
      const result = await uploadPeriodicEvidenceImage(
        files,
        leader,
        actor,
        clubId,
        mimeType,
        bytes,
        now,
      )
      expect(result).toEqual({
        reference,
        url: `https://files.example/${assetId}?sig=1`,
        mimeType,
        bytes: bytes.length,
      })
      expect(files.upload).toHaveBeenCalledWith({ clubId, mimeType, bytes })
    }
  })

  it('rejects SVG, GIF, spoofed content, empty and oversized files', async () => {
    const files = storage()
    const cases: [string, Buffer][] = [
      ['image/svg+xml', svg],
      ['image/gif', gif],
      ['image/png', svg],
      ['image/jpeg', png],
      ['image/webp', png],
      ['application/octet-stream', png],
      ['image/png', Buffer.alloc(0)],
      ['image/png', Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)])],
    ]
    for (const [mimeType, bytes] of cases) {
      await expect(
        uploadPeriodicEvidenceImage(files, leader, actor, clubId, mimeType, bytes, now),
      ).rejects.toMatchObject({ kind: 'validation' })
    }
    expect(files.upload).not.toHaveBeenCalled()
  })

  it('reports unavailable storage instead of failing silently', async () => {
    await expect(
      uploadPeriodicEvidenceImage(null, leader, actor, clubId, 'image/png', png, now),
    ).rejects.toMatchObject({ kind: 'unavailable' })
  })
})

describe('periodic report evidence links on write', () => {
  it('rejects data: URLs in every evidence slot', () => {
    expect(isValidEvidenceLink(legacyDataUrl)).toBe(false)
    expect(isValidEvidenceLink('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false)
    const member = { fullName: 'A', studentCode: 'HE1', email: 'a@fpt.edu.vn', activityScore: 8 }
    const drafts = [
      { evidence: [{ url: legacyDataUrl }] },
      {
        events: [
          {
            title: 'T',
            description: 'D',
            heldAt: '2026-10-01',
            participantCount: 1,
            evidenceUrl: legacyDataUrl,
          },
        ],
      },
      { achievements: [{ title: 'T', description: 'D', evidenceUrl: legacyDataUrl }] },
      { members: [member], customAnswers: [{ fieldId: 'f1', evidenceUrl: legacyDataUrl }] },
    ]
    for (const draft of drafts) {
      expect(() => normalizePeriodicDraft(draft)).toThrow(/invalid/)
    }
  })

  it('accepts http(s) links up to 2,000 characters and well-formed references', () => {
    expect(isValidEvidenceLink('https://drive.google.com/file/d/abc/view')).toBe(true)
    expect(isValidEvidenceLink(`https://example.com/${'a'.repeat(1_980)}`)).toBe(true)
    expect(isValidEvidenceLink(`https://example.com/${'a'.repeat(2_000)}`)).toBe(false)
    expect(isValidEvidenceLink(reference)).toBe(true)
    expect(isValidEvidenceLink(`ucms-evidence:${clubId}:not-an-asset`)).toBe(false)
  })

  it('saves references of the same club and refuses references of another club', async () => {
    const repo = clubRepo(report())
    const input = {
      achievements: [{ title: 'Prize', description: 'First place', evidenceUrl: reference }],
    }
    await changeClubPeriodicReport(repo, leader, actor, clubId, reportId, 1, input, now)
    expect(repo.save).toHaveBeenCalledOnce()

    const foreign = `ucms-evidence:${otherClubId}:${assetId}`
    await expect(
      changeClubPeriodicReport(
        repo,
        leader,
        actor,
        clubId,
        reportId,
        1,
        { achievements: [{ title: 'Prize', description: 'First', evidenceUrl: foreign }] },
        now,
      ),
    ).rejects.toMatchObject({ kind: 'validation' })
    expect(repo.save).toHaveBeenCalledOnce()
  })
})

describe('periodic report evidence links on read', () => {
  const stored = report({
    evidence: [{ url: legacyDataUrl }, { url: 'https://example.com/photo.jpg' }],
    events: [
      {
        title: 'Workshop',
        description: 'D',
        heldAt: '2026-10-01',
        participantCount: 3,
        evidenceUrl: reference,
      },
    ],
    achievements: [
      {
        title: 'Foreign',
        description: 'D',
        evidenceUrl: `ucms-evidence:${otherClubId}:${assetId}`,
      },
    ],
    versions: [
      {
        versionNo: 1,
        narrative: '',
        nextPlan: '',
        evidence: [],
        customAnswers: [{ fieldId: 'f1', evidenceUrl: reference }],
        preloadedFigures: {},
        submittedAt: now,
      },
    ],
  })

  it('signs references of the club and passes legacy data: and http(s) links through', async () => {
    const files = storage()
    const policy = { findEffective: vi.fn(async () => null) }
    const overview = await listClubPeriodicReports(
      clubRepo(stored),
      policy,
      leader,
      actor,
      clubId,
      now,
      files,
    )
    const [first] = overview.reports
    expect(first?.evidenceUrls).toEqual({
      [reference]: `https://files.example/${assetId}?sig=1`,
    })
    expect(first?.evidence).toEqual(stored.evidence)
    expect(first?.events?.[0]?.evidenceUrl).toBe(reference)
    expect(files.accessUrl).toHaveBeenCalledOnce()
  })

  it('gives ICPDP officers the same signed URLs', async () => {
    const files = storage()
    const repo: PeriodicReportRepository = {
      overview: vi.fn(async () => []),
      find: vi.fn(async () => stored),
      decide: vi.fn(),
      recordMissing: vi.fn(),
    }
    const detail = await getPeriodicReport(
      {
        repo,
        policy: { findEffective: vi.fn(async () => null) },
        auth: { systemRoleCodes: async () => ['ICPDP_OFFICER'] },
        files,
      },
      actor,
      reportId,
    )
    expect(detail.evidenceUrls).toEqual({ [reference]: `https://files.example/${assetId}?sig=1` })
    expect(detail.evidence[0]?.url).toBe(legacyDataUrl)
  })

  it('returns an empty map when storage is not configured', async () => {
    const policy = { findEffective: vi.fn(async () => null) }
    const overview = await listClubPeriodicReports(
      clubRepo(stored),
      policy,
      leader,
      actor,
      clubId,
      now,
    )
    expect(overview.reports[0]?.evidenceUrls).toEqual({})
  })
})
