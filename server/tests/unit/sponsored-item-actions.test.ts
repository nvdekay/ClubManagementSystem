import { describe, expect, it } from 'vitest'
import {
  changeSponsoredItem,
  type InvoiceImage,
  type SponsoredItem,
  type SponsoredItemAction,
  type VendorBankInfo,
} from '../../src/domain/sponsored-item.js'

// Branch-by-branch coverage of changeSponsoredItem, one describe block per action kind.

const editNow = new Date('2026-11-12T00:00:00Z')
const afterDeadline = new Date('2026-11-25T00:00:00Z')

function image(id: string, digest = `digest-${id}`): InvoiceImage {
  return {
    id,
    assetId: `asset-${id}`,
    fileName: `${id}.png`,
    mimeType: 'image/png',
    bytes: 100,
    digest,
    uploadedAt: '2026-11-11T00:00:00Z',
    uploadedBy: 'leader',
  }
}

const bank: VendorBankInfo = {
  vendorName: ' Vendor ',
  accountHolder: 'VENDOR',
  accountNumber: '123456',
  bankName: 'Bank',
}

function item(overrides: Partial<SponsoredItem> = {}): SponsoredItem {
  return {
    id: 'line-1',
    category: 'Venue',
    requestedAmount: 4_000_000,
    approvedAmount: 4_000_000,
    fundingDecision: 'AFTER_EVENT',
    paymentChannel: 'VIA_OFFICER_REIMBURSE',
    approvedAt: '2026-11-01T00:00:00Z',
    eventEndAt: '2026-11-10T00:00:00Z',
    status: 'Draft',
    amount: 3_500_000,
    description: 'Venue invoice',
    images: [image('a')],
    ...overrides,
  }
}

function before(overrides: Partial<SponsoredItem> = {}): SponsoredItem {
  return item({
    fundingDecision: 'BEFORE_EVENT',
    paymentChannel: 'VIA_OFFICER_ADVANCE',
    ...overrides,
  })
}

function refundPending(overrides: Partial<SponsoredItem> = {}): SponsoredItem {
  return before({
    status: 'RefundPending',
    advanceAmount: 4_000_000,
    refundAmount: 500_000,
    refundProofs: [image('r1')],
    ...overrides,
  })
}

function act(current: SponsoredItem, action: SponsoredItemAction, actorId?: string, now = editNow) {
  return changeSponsoredItem(current, action, now, actorId)
}

describe('changeSponsoredItem', () => {
  it('does not mutate the input item or its arrays', () => {
    const current = refundPending()
    const next = act(current, { kind: 'refundImage', image: image('r2') })
    expect(current.refundProofs).toHaveLength(1)
    expect(next.refundProofs).toHaveLength(2)
    const plain = item()
    const added = act(plain, { kind: 'image', image: image('b') })
    expect(plain.images).toHaveLength(1)
    expect(added.images).toHaveLength(2)
    expect(added.refundProofs).toBeUndefined()
  })

  it('locks club edit actions outside Draft/Returned, after the deadline, or before approval', () => {
    for (const action of [
      { kind: 'save', amount: 1, description: 'x' },
      { kind: 'image', image: image('b') },
      { kind: 'removeImage', imageId: 'a' },
      { kind: 'submit' },
    ] as SponsoredItemAction[]) {
      expect(() => act(item({ status: 'Submitted' }), action)).toThrow(/locked/)
      expect(() => act(item(), action, undefined, afterDeadline)).toThrow(/locked/)
      expect(() => act(item(), action, undefined, new Date('2026-10-01T00:00:00Z'))).toThrow(
        /not been approved/,
      )
    }
    expect(act(item({ status: 'Returned' }), { kind: 'removeImage', imageId: 'a' }).images).toEqual(
      [],
    )
  })

  describe('recordAdvance', () => {
    it('sends the approved amount as the advance and records the officer', () => {
      const next = act(
        before({ status: 'AwaitingAdvance', paymentChannel: undefined }),
        {
          kind: 'recordAdvance',
        },
        'officer',
      )
      expect(next).toMatchObject({
        status: 'AdvanceSent',
        paymentChannel: 'VIA_OFFICER_ADVANCE',
        advanceAmount: 4_000_000,
        advancedAt: editNow.toISOString(),
        advancedBy: 'officer',
      })
    })

    it('omits advancedBy without an actor', () => {
      const next = act(before({ status: 'AwaitingAdvance' }), { kind: 'recordAdvance' })
      expect(next.advancedBy).toBeUndefined()
    })

    it('rejects items that are not awaiting an advance', () => {
      for (const current of [
        item({ status: 'AwaitingAdvance' }),
        before({ status: 'Draft' }),
        before({ status: 'AwaitingAdvance', advancedAt: '2026-11-02T00:00:00Z' }),
      ]) {
        expect(() => act(current, { kind: 'recordAdvance' })).toThrow(/not awaiting a pre-event/)
      }
    })
  })

  describe('confirmAdvanceReceived', () => {
    it('moves the item to Draft and records who received it', () => {
      const next = act(
        before({ status: 'AdvanceSent' }),
        { kind: 'confirmAdvanceReceived' },
        'leader',
      )
      expect(next).toMatchObject({
        status: 'Draft',
        paymentChannel: 'VIA_OFFICER_ADVANCE',
        advanceReceivedAt: editNow.toISOString(),
        advanceReceivedBy: 'leader',
      })
      expect(
        act(before({ status: 'AdvanceSent' }), { kind: 'confirmAdvanceReceived' })
          .advanceReceivedBy,
      ).toBeUndefined()
    })

    it('rejects items that are not awaiting receipt', () => {
      for (const current of [
        item({ status: 'AdvanceSent' }),
        before({ status: 'AwaitingAdvance' }),
        before({ status: 'AdvanceSent', advanceReceivedAt: '2026-11-02T00:00:00Z' }),
      ]) {
        expect(() => act(current, { kind: 'confirmAdvanceReceived' })).toThrow(
          /not awaiting advance receipt/,
        )
      }
    })
  })

  describe('save', () => {
    it('rejects invalid amounts and overlong descriptions', () => {
      for (const action of [
        { kind: 'save', amount: 0, description: 'x' },
        { kind: 'save', amount: 1.5, description: 'x' },
        { kind: 'save', amount: 10, description: 'x'.repeat(2001) },
      ] as SponsoredItemAction[]) {
        expect(() => act(item(), action)).toThrow(/invalid expense fields/)
      }
    })

    it('forces DIRECT_VENDOR from 5,000,000 VND and keeps normalized bank details', () => {
      const big = item({ approvedAmount: 6_000_000, paymentChannel: 'DIRECT_VENDOR' })
      expect(() =>
        act(big, {
          kind: 'save',
          amount: 6_000_000,
          description: 'x',
          paymentChannel: 'VIA_OFFICER_REIMBURSE',
        }),
      ).toThrow(/direct vendor contract/)
      const next = act(big, {
        kind: 'save',
        amount: 6_000_000,
        description: '  Stage  ',
        vendorBankInfo: bank,
      })
      expect(next).toMatchObject({
        amount: 6_000_000,
        description: 'Stage',
        paymentChannel: 'DIRECT_VENDOR',
        vendorBankInfo: { vendorName: 'Vendor' },
      })
    })

    it('keeps existing vendor details when a DIRECT_VENDOR save omits them', () => {
      const current = item({ paymentChannel: 'DIRECT_VENDOR', vendorBankInfo: bank })
      const next = act(current, { kind: 'save', amount: 10, description: 'x' })
      expect(next.paymentChannel).toBe('DIRECT_VENDOR')
      expect(next.vendorBankInfo).toBe(bank)
    })

    it('lets small AFTER_EVENT items pick a channel, dropping vendor details for reimbursement', () => {
      const current = item({ paymentChannel: 'DIRECT_VENDOR', vendorBankInfo: bank })
      const reimbursed = act(current, {
        kind: 'save',
        amount: 10,
        description: 'x',
        paymentChannel: 'VIA_OFFICER_REIMBURSE',
      })
      expect(reimbursed.paymentChannel).toBe('VIA_OFFICER_REIMBURSE')
      expect(reimbursed.vendorBankInfo).toBeUndefined()
      const direct = act(item(), {
        kind: 'save',
        amount: 10,
        description: 'x',
        paymentChannel: 'DIRECT_VENDOR',
        vendorBankInfo: bank,
      })
      expect(direct.paymentChannel).toBe('DIRECT_VENDOR')
      expect(direct.vendorBankInfo?.vendorName).toBe('Vendor')
      // No channel given: falls back to the resolved channel of the stored item.
      expect(act(item(), { kind: 'save', amount: 10, description: 'x' }).paymentChannel).toBe(
        'VIA_OFFICER_REIMBURSE',
      )
    })

    it('pins BEFORE_EVENT items to the officer advance channel', () => {
      const next = act(before({ vendorBankInfo: bank, paymentChannel: undefined }), {
        kind: 'save',
        amount: 10,
        description: 'x',
        paymentChannel: 'DIRECT_VENDOR',
        vendorBankInfo: bank,
      })
      expect(next.paymentChannel).toBe('VIA_OFFICER_ADVANCE')
      expect(next.vendorBankInfo).toBeUndefined()
    })

    it('leaves channel and vendor details alone for NOT_SPONSORED items', () => {
      const current = item({
        fundingDecision: 'NOT_SPONSORED',
        paymentChannel: undefined,
        vendorBankInfo: bank,
      })
      const next = act(current, { kind: 'save', amount: 10, description: 'x' })
      expect(next.paymentChannel).toBeUndefined()
      expect(next.vendorBankInfo).toBe(bank)
    })
  })

  describe('image / removeImage', () => {
    it('caps attachments at five and rejects duplicate digests', () => {
      const full = item({ images: ['1', '2', '3', '4', '5'].map((id) => image(id)) })
      expect(() => act(full, { kind: 'image', image: image('6') })).toThrow(/at most five/)
      expect(() => act(item(), { kind: 'image', image: image('b', 'digest-a') })).toThrow(
        /duplicate invoice/,
      )
    })

    it('removes an attachment by id or reports it missing', () => {
      const current = item({ images: [image('a'), image('b')] })
      expect(act(current, { kind: 'removeImage', imageId: 'a' }).images.map((i) => i.id)).toEqual([
        'b',
      ])
      expect(() => act(current, { kind: 'removeImage', imageId: 'zzz' })).toThrow(
        expect.objectContaining({ kind: 'not_found' }),
      )
    })
  })

  describe('submit', () => {
    it('submits a complete pack and resolves the channel', () => {
      const next = act(item({ paymentChannel: undefined }), { kind: 'submit' })
      expect(next).toMatchObject({
        status: 'Submitted',
        submittedAt: editNow.toISOString(),
        paymentChannel: 'VIA_OFFICER_REIMBURSE',
      })
    })

    it('runs the submission checks', () => {
      expect(() => act(item({ amount: 0 }), { kind: 'submit' })).toThrow(/positive expense amount/)
    })
  })

  describe('return', () => {
    const submitted = item({ status: 'Submitted' })

    it('returns a submitted pack with a trimmed reason', () => {
      const next = act(submitted, { kind: 'return', reason: '  Missing VAT  ' })
      expect(next).toMatchObject({ status: 'Returned', reviewReason: 'Missing VAT' })
    })

    it('rejects packs that are not submitted or past the deadline', () => {
      expect(() => act(item(), { kind: 'return', reason: 'x' })).toThrow(/cannot be returned/)
      expect(() =>
        act(
          submitted,
          { kind: 'return', reason: 'x' },
          undefined,
          new Date('2026-11-24T00:00:00Z'),
        ),
      ).toThrow(/cannot be returned/)
    })

    it('requires a reason of at most 2000 characters', () => {
      expect(() => act(submitted, { kind: 'return', reason: '   ' })).toThrow(/correction reason/)
      expect(() => act(submitted, { kind: 'return', reason: 'x'.repeat(2001) })).toThrow(
        /correction reason/,
      )
    })
  })

  describe('review', () => {
    it('requires a reason of at most 2000 characters', () => {
      const submitted = item({ status: 'Submitted' })
      expect(() => act(submitted, { kind: 'review', validAmount: 1, reason: ' ' })).toThrow(
        /review reason/,
      )
      expect(() =>
        act(submitted, { kind: 'review', validAmount: 1, reason: 'x'.repeat(2001) }),
      ).toThrow(/review reason/)
    })

    it('accepts or rejects AFTER_EVENT items by payable amount', () => {
      const submitted = item({ status: 'Submitted' })
      expect(
        act(submitted, { kind: 'review', validAmount: 3_000_000, reason: ' ok ' }),
      ).toMatchObject({
        status: 'Accepted',
        payable: 3_000_000,
        validAmount: 3_000_000,
        reviewReason: 'ok',
      })
      expect(act(submitted, { kind: 'review', validAmount: 0, reason: 'none' })).toMatchObject({
        status: 'Rejected',
        payable: 0,
      })
    })

    it('reconciles BEFORE_EVENT items against the advance', () => {
      const submitted = before({ status: 'Submitted', advanceAmount: 3_000_000, refundAmount: 9 })
      const over = act(submitted, { kind: 'review', validAmount: 3_500_000, reason: 'ok' })
      expect(over).toMatchObject({ status: 'Reconciled', reconciliationDelta: 500_000 })
      expect(over.refundAmount).toBeUndefined()

      const under = act(submitted, { kind: 'review', validAmount: 2_000_000, reason: 'ok' })
      expect(under).toMatchObject({
        status: 'RefundPending',
        reconciliationDelta: -1_000_000,
        refundAmount: 1_000_000,
        refundProofs: [],
      })
      // Existing proofs are kept; without advanceAmount the approved amount counts as advanced.
      const legacy = before({ status: 'Submitted', refundProofs: [image('r1')] })
      const kept = act(legacy, { kind: 'review', validAmount: 1_000_000, reason: 'ok' })
      expect(kept).toMatchObject({ refundAmount: 3_000_000, refundProofs: [image('r1')] })
    })
  })

  describe('refundImage', () => {
    it('adds a refund receipt', () => {
      const next = act(refundPending({ refundProofs: undefined }), {
        kind: 'refundImage',
        image: image('r2'),
      })
      expect(next.refundProofs).toEqual([image('r2')])
    })

    it('rejects items that are not awaiting a refund', () => {
      for (const current of [
        refundPending({ fundingDecision: 'AFTER_EVENT' }),
        refundPending({ status: 'RefundSubmitted' }),
        refundPending({ refundAmount: 0 }),
        refundPending({ refundAmount: undefined }),
      ]) {
        expect(() => act(current, { kind: 'refundImage', image: image('r2') })).toThrow(
          /not awaiting a refund transfer/,
        )
      }
    })

    it('caps receipts at five and rejects digests already used by invoices or receipts', () => {
      const full = refundPending({ refundProofs: ['1', '2', '3', '4', '5'].map((id) => image(id)) })
      expect(() => act(full, { kind: 'refundImage', image: image('6') })).toThrow(/at most five/)
      expect(() =>
        act(refundPending(), { kind: 'refundImage', image: image('x', 'digest-a') }),
      ).toThrow(/duplicate refund/)
      expect(() =>
        act(refundPending(), { kind: 'refundImage', image: image('x', 'digest-r1') }),
      ).toThrow(/duplicate refund/)
    })
  })

  describe('removeRefundImage', () => {
    it('removes a receipt by id', () => {
      expect(
        act(refundPending(), { kind: 'removeRefundImage', imageId: 'r1' }).refundProofs,
      ).toEqual([])
    })

    it('rejects the wrong state and unknown ids', () => {
      expect(() =>
        act(refundPending({ status: 'RefundSubmitted' }), {
          kind: 'removeRefundImage',
          imageId: 'r1',
        }),
      ).toThrow(/cannot be modified/)
      expect(() =>
        act(refundPending({ fundingDecision: 'AFTER_EVENT' }), {
          kind: 'removeRefundImage',
          imageId: 'r1',
        }),
      ).toThrow(/cannot be modified/)
      expect(() => act(refundPending(), { kind: 'removeRefundImage', imageId: 'nope' })).toThrow(
        expect.objectContaining({ kind: 'not_found' }),
      )
      expect(() =>
        act(refundPending({ refundProofs: undefined }), {
          kind: 'removeRefundImage',
          imageId: 'r1',
        }),
      ).toThrow(expect.objectContaining({ kind: 'not_found' }))
    })
  })

  describe('submitRefund', () => {
    it('submits receipts with a trimmed note and clears the last return reason', () => {
      const next = act(refundPending({ refundReviewReason: 'blurry' }), {
        kind: 'submitRefund',
        note: '  sent  ',
      })
      expect(next).toMatchObject({
        status: 'RefundSubmitted',
        refundSubmittedAt: editNow.toISOString(),
        refundNote: 'sent',
      })
      expect(next.refundReviewReason).toBeUndefined()
    })

    it('drops a stale note when the new one is blank or missing', () => {
      expect(
        act(refundPending({ refundNote: 'old' }), { kind: 'submitRefund', note: '   ' }).refundNote,
      ).toBeUndefined()
      expect(act(refundPending({ refundNote: 'old' }), { kind: 'submitRefund' }).refundNote).toBe(
        undefined,
      )
    })

    it('rejects items that are not awaiting a refund submission', () => {
      for (const current of [
        refundPending({ fundingDecision: 'AFTER_EVENT' }),
        refundPending({ status: 'RefundSubmitted' }),
        refundPending({ refundAmount: 0 }),
      ]) {
        expect(() => act(current, { kind: 'submitRefund' })).toThrow(
          /not awaiting a refund submission/,
        )
      }
    })

    it('requires one to five receipts and a note of at most 2000 characters', () => {
      expect(() => act(refundPending({ refundProofs: [] }), { kind: 'submitRefund' })).toThrow(
        /one to five/,
      )
      expect(() =>
        act(refundPending({ refundProofs: undefined }), { kind: 'submitRefund' }),
      ).toThrow(/one to five/)
      const six = refundPending({
        refundProofs: ['1', '2', '3', '4', '5', '6'].map((id) => image(id)),
      })
      expect(() => act(six, { kind: 'submitRefund' })).toThrow(/one to five/)
      expect(() => act(refundPending(), { kind: 'submitRefund', note: 'x'.repeat(2001) })).toThrow(
        /refund note/,
      )
    })
  })

  describe('returnRefund', () => {
    const submitted = refundPending({ status: 'RefundSubmitted' })

    it('sends the refund back with a trimmed reason', () => {
      expect(act(submitted, { kind: 'returnRefund', reason: ' blurry ' })).toMatchObject({
        status: 'RefundPending',
        refundReviewReason: 'blurry',
      })
    })

    it('rejects the wrong state and missing or long reasons', () => {
      expect(() => act(refundPending(), { kind: 'returnRefund', reason: 'x' })).toThrow(
        /does not have a submitted refund/,
      )
      expect(() =>
        act(refundPending({ status: 'RefundSubmitted', fundingDecision: 'AFTER_EVENT' }), {
          kind: 'returnRefund',
          reason: 'x',
        }),
      ).toThrow(/does not have a submitted refund/)
      expect(() => act(submitted, { kind: 'returnRefund', reason: '  ' })).toThrow(
        /refund return reason/,
      )
      expect(() => act(submitted, { kind: 'returnRefund', reason: 'x'.repeat(2001) })).toThrow(
        /refund return reason/,
      )
    })
  })

  describe('confirmRefund', () => {
    const submitted = refundPending({ status: 'RefundSubmitted', refundReviewReason: 'old' })

    it('reconciles the item and records the officer and note', () => {
      const next = act(submitted, { kind: 'confirmRefund', reason: ' received ' }, 'officer')
      expect(next).toMatchObject({
        status: 'Reconciled',
        refundConfirmedAt: editNow.toISOString(),
        refundConfirmedBy: 'officer',
        refundReviewReason: 'received',
      })
    })

    it('clears the stale note and omits the officer when not given', () => {
      const next = act(submitted, { kind: 'confirmRefund' })
      expect(next.refundReviewReason).toBeUndefined()
      expect(next.refundConfirmedBy).toBeUndefined()
      expect(act(submitted, { kind: 'confirmRefund', reason: '  ' }).refundReviewReason).toBe(
        undefined,
      )
    })

    it('rejects the wrong state, a repeat confirmation and a long note', () => {
      for (const current of [
        refundPending(),
        refundPending({ status: 'RefundSubmitted', fundingDecision: 'AFTER_EVENT' }),
        refundPending({ status: 'RefundSubmitted', refundConfirmedAt: '2026-11-12T00:00:00Z' }),
      ]) {
        expect(() => act(current, { kind: 'confirmRefund' })).toThrow(
          /not awaiting refund confirmation/,
        )
      }
      expect(() => act(submitted, { kind: 'confirmRefund', reason: 'x'.repeat(2001) })).toThrow(
        /at most 2000/,
      )
    })
  })

  describe('pay', () => {
    const accepted = item({ status: 'Accepted', payable: 3_000_000 })

    it('marks a reimbursed item paid', () => {
      expect(act(accepted, { kind: 'pay' }, 'leader')).toMatchObject({
        status: 'Paid',
        paidAt: editNow.toISOString(),
      })
      expect(act(accepted, { kind: 'pay' }, 'leader').paidBy).toBeUndefined()
    })

    it('rejects other channels and items not awaiting payment', () => {
      expect(() =>
        act(item({ status: 'Accepted', payable: 1, paymentChannel: 'DIRECT_VENDOR' }), {
          kind: 'pay',
        }),
      ).toThrow(/not reimbursed/)
      for (const current of [
        item({ status: 'Submitted', payable: 1 }),
        item({ status: 'Accepted', payable: 0 }),
        item({ status: 'Accepted', payable: 1, paidAt: '2026-11-12T00:00:00Z' }),
      ]) {
        expect(() => act(current, { kind: 'pay' })).toThrow(/not awaiting payment/)
      }
    })
  })

  describe('confirmVendorPaid', () => {
    const accepted = item({
      status: 'Accepted',
      payable: 3_000_000,
      paymentChannel: 'DIRECT_VENDOR',
    })

    it('marks a direct-vendor item paid and records the officer', () => {
      expect(act(accepted, { kind: 'confirmVendorPaid' }, 'officer')).toMatchObject({
        status: 'Paid',
        paidAt: editNow.toISOString(),
        paidBy: 'officer',
      })
      expect(act(accepted, { kind: 'confirmVendorPaid' }).paidBy).toBeUndefined()
    })

    it('rejects other channels and items not awaiting vendor payment', () => {
      expect(() =>
        act(item({ status: 'Accepted', payable: 1 }), { kind: 'confirmVendorPaid' }),
      ).toThrow(/not paid directly/)
      for (const current of [
        { ...accepted, status: 'Submitted' as const },
        { ...accepted, payable: 0 },
        { ...accepted, paidAt: '2026-11-12T00:00:00Z' },
      ]) {
        expect(() => act(current, { kind: 'confirmVendorPaid' })).toThrow(
          /not awaiting vendor payment/,
        )
      }
    })
  })
})
