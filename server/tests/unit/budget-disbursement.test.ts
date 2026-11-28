import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../../src/domain/auth.js'
import {
  settlementDueAt,
  type BudgetDetail,
  type BudgetDisbursementRepository,
} from '../../src/domain/budget-disbursement.js'
import { getBudget, listBudgets } from '../../src/usecase/budget-disbursement.js'

const now = new Date('2026-10-10T08:00:00Z')
const officer = { id: '000000000000000000000001', accountState: 'Active' as const }
const budgetId = '000000000000000000000002'
const page = { filter: 'all' as const, page: 1, pageSize: 20 }

function budget(change: Partial<BudgetDetail> = {}): BudgetDetail {
  return {
    id: budgetId,
    eventId: '000000000000000000000003',
    eventTitle: 'Workshop',
    eventState: 'Approved',
    eventStartAt: now,
    eventEndAt: now,
    clubId: '000000000000000000000004',
    clubName: 'HEBE',
    state: 'Approved',
    requestedTotal: 5_000_000,
    approvedTotal: 4_000_000,
    disbursedTotal: 0,
    refundedTotal: 0,
    createdAt: now,
    lines: [],
    flows: [],
    ...change,
  }
}

function auth(roles: string[]): Pick<AuthRepository, 'systemRoleCodes'> {
  return { systemRoleCodes: async () => roles }
}

function repo(found: BudgetDetail): BudgetDisbursementRepository {
  return {
    list: vi.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      counts: {
        all: 0,
        awaitingAdvance: 0,
        awaitingReview: 0,
        awaitingVendorPay: 0,
        awaitingRefundConfirm: 0,
        inProgress: 0,
        closed: 0,
      },
      clubs: [],
    })),
    find: vi.fn(async () => found),
  }
}

describe('budget disbursement rules', () => {
  it('sets the settlement deadline 14 days after the event ends', () => {
    expect(settlementDueAt(new Date('2026-10-20T10:00:00Z')).toISOString()).toBe(
      '2026-11-03T10:00:00.000Z',
    )
  })
})

describe('budget disbursement use cases', () => {
  it('requires an ICPDP officer', async () => {
    await expect(listBudgets(repo(budget()), auth([]), officer, page)).rejects.toMatchObject({
      kind: 'forbidden',
    })
    await expect(listBudgets(repo(budget()), auth([]), null, page)).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it('returns a budget to an officer and 404s a missing one', async () => {
    await expect(
      getBudget(repo(budget()), auth(['ICPDP_OFFICER']), officer, budgetId),
    ).resolves.toMatchObject({ id: budgetId })
    const missing: BudgetDisbursementRepository = { ...repo(budget()), find: async () => null }
    await expect(
      getBudget(missing, auth(['ICPDP_OFFICER']), officer, budgetId),
    ).rejects.toMatchObject({ kind: 'not_found' })
  })
})
