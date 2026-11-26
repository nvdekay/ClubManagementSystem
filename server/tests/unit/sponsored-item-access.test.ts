import { DomainError } from '../../src/domain/errors.js'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_FORM_REQUIREMENTS, type SchoolRefundAccount } from '../../src/domain/policy.js'
import type { SponsoredItem } from '../../src/domain/sponsored-item.js'
import {
  actOnSponsoredItem,
  getRefundAccount,
  getSponsoredBudget,
  invoiceImageUrl,
  uploadInvoiceImage,
  type SponsoredItemDeps,
} from '../../src/usecase/sponsored-item.js'

const id = 'a10000000000000000000001'
const actor = { id, accountState: 'Active' as const }
const schoolAccount: SchoolRefundAccount = {
  accountHolder: 'TRUONG DAI HOC FPT',
  accountNumber: '0001122334455',
  bankName: 'TPBank',
  bankBranch: 'Ha Noi',
  transferNote: 'Hoan tra tam ung su kien CLB',
}

function fixture(
  itemOverrides: Partial<SponsoredItem> = {},
  configuredAccount?: SchoolRefundAccount,
) {
  const sign = vi.fn(async () => 'https://storage.example/signed')
  const find = vi.fn(async () => ({
    id,
    eventId: id,
    clubId: id,
    eventState: 'Approved',
    revision: 0,
    items: [
      {
        id: 'item',
        category: 'Venue',
        requestedAmount: 100,
        approvedAmount: 100,
        fundingDecision: 'BEFORE_EVENT' as const,
        approvedAt: '2026-11-01',
        eventEndAt: '2026-11-20',
        status: 'Draft' as const,
        amount: 100,
        description: '',
        images: [
          {
            id: 'image',
            assetId: 'private',
            fileName: 'invoice.png',
            mimeType: 'image/png' as const,
            bytes: 100,
            digest: 'digest',
            uploadedAt: '2026-11-02',
            uploadedBy: id,
          },
        ],
        refundProofs: [
          {
            id: 'refund-img',
            assetId: 'private-refund',
            fileName: 'refund.pdf',
            mimeType: 'application/pdf' as const,
            bytes: 200,
            digest: 'refund-digest',
            uploadedAt: '2026-11-22',
            uploadedBy: id,
          },
        ],
        ...itemOverrides,
      },
    ],
  }))
  const deps: SponsoredItemDeps = {
    repo: { find, act: vi.fn() },
    access: { findSnapshot: async () => null },
    auth: { systemRoleCodes: async () => ['ICPDP_OFFICER'] },
    files: { upload: vi.fn(), accessUrl: sign, remove: vi.fn() },
    policy: {
      findEffective: async () => ({
        id: 'policy-1',
        minFoundingMembers: 5,
        formRequirements: DEFAULT_FORM_REQUIREMENTS,
        reportDeadlines: [],
        conflictThresholdMinutes: 30,
        feedbackWindowHours: 48,
        feedbackMinRespondents: 5,
        allowOverbooking: false,
        enforceOverdueReportBlock: false,
        academicCalendar: [],
        ...(configuredAccount ? { schoolRefundAccount: configuredAccount } : {}),
        effectiveFrom: new Date('2026-01-01'),
        createdBy: id,
        createdAt: new Date('2026-01-01'),
      }),
    },
  }
  return { deps, find, sign }
}

describe('private invoice access', () => {
  it('does not sign an image for an unauthenticated or unrelated club user', async () => {
    const { deps, find, sign } = fixture()
    await expect(
      invoiceImageUrl(deps, null, id, id, 'item', 'image', new Date()),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
    await expect(
      invoiceImageUrl(deps, actor, id, id, 'item', 'image', new Date()),
    ).rejects.toMatchObject({ kind: 'forbidden' })
    expect(find).not.toHaveBeenCalled()
    expect(sign).not.toHaveBeenCalled()
  })

  it('binds the signed asset to the requested item and image (including refundProofs) for both preview and download once submitted', async () => {
    const { deps, sign } = fixture({ status: 'Submitted' })
    await expect(
      invoiceImageUrl(deps, actor, id, undefined, 'other', 'image', new Date()),
    ).rejects.toMatchObject({ kind: 'not_found' })
    expect(sign).not.toHaveBeenCalled()
    await expect(
      invoiceImageUrl(deps, actor, id, undefined, 'item', 'image', new Date()),
    ).resolves.toEqual({
      url: 'https://storage.example/signed',
      fileName: 'invoice.png',
      mimeType: 'image/png',
    })
    expect(sign).toHaveBeenCalledWith('private', { inline: true })

    const refundFixture = fixture({ status: 'RefundSubmitted', refundAmount: 50 })
    await expect(
      invoiceImageUrl(
        refundFixture.deps,
        actor,
        id,
        undefined,
        'item',
        'refund-img',
        new Date(),
        false,
      ),
    ).resolves.toEqual({
      url: 'https://storage.example/signed',
      fileName: 'refund.pdf',
      mimeType: 'application/pdf',
    })
    expect(refundFixture.sign).toHaveBeenCalledWith('private-refund', { inline: false })
  })

  it('hides Draft invoice details, vendor bank info, and attachments from ICPDP until submitted', async () => {
    const now = new Date('2026-11-22T00:00:00Z')
    const draftFixture = fixture({
      fundingDecision: 'AFTER_EVENT',
      approvedAmount: 2_000_000,
      paymentChannel: 'DIRECT_VENDOR',
      status: 'Draft',
      amount: 1_800_000,
      description: 'Draft receipt notes',
      vendorBankInfo: {
        vendorName: 'Vendor A',
        accountHolder: 'VENDOR A',
        accountNumber: '123456789',
        bankName: 'TPBank',
      },
    })

    // Officer receives redacted Draft item and cannot sign Draft attachments
    const officerView = await getSponsoredBudget(draftFixture.deps, actor, id, undefined, now)
    expect(officerView.items[0]).toMatchObject({
      status: 'Draft',
      paymentChannel: 'VIA_OFFICER_REIMBURSE',
      amount: 0,
      description: '',
      images: [],
    })
    expect(officerView.items[0]?.vendorBankInfo).toBeUndefined()
    await expect(
      invoiceImageUrl(draftFixture.deps, actor, id, undefined, 'item', 'image', now),
    ).rejects.toMatchObject({ kind: 'not_found' })
    expect(draftFixture.sign).not.toHaveBeenCalled()

    // Officer action result also redacts any Draft item returned by the repository
    const actFixture = fixture({ status: 'AwaitingAdvance' })
    const rawWithDraft = {
      id,
      eventId: id,
      clubId: id,
      eventState: 'Approved',
      revision: 1,
      items: [
        {
          id: 'item-adv',
          category: 'Advance item',
          requestedAmount: 100,
          approvedAmount: 100,
          fundingDecision: 'BEFORE_EVENT' as const,
          paymentChannel: 'VIA_OFFICER_ADVANCE' as const,
          approvedAt: '2026-11-01',
          eventEndAt: '2026-11-20',
          status: 'AdvanceSent' as const,
          amount: 0,
          description: '',
          images: [],
        },
        {
          id: 'item-draft',
          category: 'Draft item',
          requestedAmount: 200,
          approvedAmount: 200,
          fundingDecision: 'AFTER_EVENT' as const,
          paymentChannel: 'VIA_OFFICER_REIMBURSE' as const,
          approvedAt: '2026-11-01',
          eventEndAt: '2026-11-20',
          status: 'Draft' as const,
          amount: 180,
          description: 'Unsaved club draft',
          images: [
            {
              id: 'draft-img',
              assetId: 'private-draft',
              fileName: 'draft.png',
              mimeType: 'image/png' as const,
              bytes: 100,
              digest: 'draft-digest',
              uploadedAt: '2026-11-02',
              uploadedBy: id,
            },
          ],
        },
      ],
    }
    actFixture.deps.repo.act = vi.fn(async () => rawWithDraft)
    const afterAct = await actOnSponsoredItem(
      actFixture.deps,
      actor,
      id,
      undefined,
      'item-adv',
      0,
      { kind: 'recordAdvance' },
      now,
    )
    expect(afterAct.items[1]).toMatchObject({
      status: 'Draft',
      amount: 0,
      description: '',
      images: [],
    })

    // Club leader still sees full Draft details and can preview own Draft image
    draftFixture.deps.access = {
      findSnapshot: async () => ({
        clubId: id,
        clubName: 'HEBE Club',
        clubState: 'Active',
        membership: { id: 'm1', clubId: id, state: 'Active' },
        terms: [
          {
            id: 't1',
            clubId: id,
            state: 'Active',
            startAt: new Date('2026-01-01'),
            endAt: new Date('2026-12-31'),
          },
        ],
        positions: [
          {
            id: 'p1',
            clubId: id,
            code: 'CLUB_LEADER',
            isActive: true,
            isLeaderRole: true,
            isBoardSeat: true,
          },
        ],
        assignments: [
          {
            clubId: id,
            termId: 't1',
            positionId: 'p1',
            membershipId: 'm1',
            effectiveFrom: new Date('2026-01-01'),
            effectiveTo: null,
            confirmedBy: 'officer-1',
          },
        ],
        isApprovedFounder: false,
      }),
    }
    const clubView = await getSponsoredBudget(draftFixture.deps, actor, id, id, now)
    expect(clubView.items[0]).toMatchObject({
      amount: 1_800_000,
      description: 'Draft receipt notes',
      paymentChannel: 'DIRECT_VENDOR',
    })
    expect(clubView.items[0]?.images).toHaveLength(1)
    await expect(
      invoiceImageUrl(draftFixture.deps, actor, id, id, 'item', 'image', now),
    ).resolves.toMatchObject({ fileName: 'invoice.png' })
  })

  it('denies a locked officer and a user without the officer role', async () => {
    const { deps, sign } = fixture()
    await expect(
      invoiceImageUrl(
        deps,
        { ...actor, accountState: 'Locked' },
        id,
        undefined,
        'item',
        'image',
        new Date(),
      ),
    ).rejects.toMatchObject({ kind: 'locked' })
    deps.auth.systemRoleCodes = async () => []
    await expect(
      invoiceImageUrl(deps, actor, id, undefined, 'item', 'image', new Date()),
    ).rejects.toMatchObject({ kind: 'forbidden' })
    expect(sign).not.toHaveBeenCalled()
  })

  it('reveals school refund account only when club has an item awaiting or submitted for refund', async () => {
    const now = new Date('2026-11-22T00:00:00Z')
    const clubAccess = {
      findSnapshot: async () => ({
        clubId: id,
        clubName: 'HEBE Club',
        clubState: 'Active',
        membership: { id: 'm1', clubId: id, state: 'Active' },
        terms: [
          {
            id: 't1',
            clubId: id,
            state: 'Active',
            startAt: new Date('2026-01-01'),
            endAt: new Date('2026-12-31'),
          },
        ],
        positions: [
          {
            id: 'p1',
            clubId: id,
            code: 'CLUB_LEADER',
            isActive: true,
            isLeaderRole: true,
            isBoardSeat: true,
          },
        ],
        assignments: [
          {
            clubId: id,
            termId: 't1',
            positionId: 'p1',
            membershipId: 'm1',
            effectiveFrom: new Date('2026-01-01'),
            effectiveTo: null,
            confirmedBy: 'officer-1',
          },
        ],
        isApprovedFounder: false,
      }),
    }

    // Draft item cannot read refund account
    const draftFixture = fixture({ status: 'Draft' }, schoolAccount)
    draftFixture.deps.access = clubAccess
    await expect(
      getRefundAccount(draftFixture.deps, actor, id, id, 'item', now),
    ).rejects.toMatchObject({ kind: 'conflict' })

    // RefundPending item with unconfigured policy returns unavailable
    const missingConfig = fixture({ status: 'RefundPending', refundAmount: 500_000 }, undefined)
    missingConfig.deps.access = clubAccess
    await expect(
      getRefundAccount(missingConfig.deps, actor, id, id, 'item', now),
    ).rejects.toMatchObject({ kind: 'unavailable' })

    // RefundPending item with configured policy returns refundAmount and school account
    const allowed = fixture({ status: 'RefundPending', refundAmount: 500_000 }, schoolAccount)
    allowed.deps.access = clubAccess
    await expect(getRefundAccount(allowed.deps, actor, id, id, 'item', now)).resolves.toEqual({
      refundAmount: 500_000,
      account: schoolAccount,
    })
  })

  it('deletes the uploaded invoice file when the budget write fails', async () => {
    const { deps } = fixture({ images: [] })
    deps.access = {
      findSnapshot: async () => ({
        clubId: id,
        clubName: 'HEBE Club',
        clubState: 'Active',
        membership: { id: 'm1', clubId: id, state: 'Active' },
        terms: [
          {
            id: 't1',
            clubId: id,
            state: 'Active',
            startAt: new Date('2026-01-01'),
            endAt: new Date('2026-12-31'),
          },
        ],
        positions: [
          {
            id: 'p1',
            clubId: id,
            code: 'CLUB_LEADER',
            isActive: true,
            isLeaderRole: true,
            isBoardSeat: true,
          },
        ],
        assignments: [
          {
            clubId: id,
            termId: 't1',
            positionId: 'p1',
            membershipId: 'm1',
            effectiveFrom: new Date('2026-01-01'),
            effectiveTo: null,
            confirmedBy: 'officer-1',
          },
        ],
        isApprovedFounder: false,
      }),
    }
    const upload = vi.fn(async () => ({
      id: 'doc',
      documentType: 'INVOICE',
      fileName: 'invoice.png',
      mimeType: 'image/png',
      bytes: 9,
      assetId: 'asset-new',
      uploadedAt: new Date(),
    }))
    const remove = vi.fn(async () => undefined)
    deps.files = { upload, accessUrl: vi.fn(), remove }
    deps.repo.act = vi.fn(async () => {
      throw new DomainError('budget changed', 'conflict')
    })
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])
    await expect(
      uploadInvoiceImage(
        deps,
        actor,
        id,
        id,
        'item',
        0,
        { fileName: 'invoice.png', mimeType: 'image/png', bytes: png },
        new Date('2026-11-10T00:00:00Z'),
      ),
    ).rejects.toMatchObject({ kind: 'conflict' })
    expect(upload).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith('asset-new')
  })
})
