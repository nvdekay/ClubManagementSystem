import { describe, expect, it } from 'vitest'
import { pageSkip } from '../../src/domain/paging.js'
import { budgetListQuery } from '../../src/interface/http/budget-disbursement-routes.js'
import { pageQuery } from '../../src/interface/http/request.js'
import { suspensionListQuery } from '../../src/interface/http/suspension-request-routes.js'
import { violationListQuery } from '../../src/interface/http/violation-routes.js'

describe('server-side paging query', () => {
  it('defaults to the first page of 20 and coerces query strings', () => {
    expect(pageQuery.parse({})).toEqual({ page: 1, pageSize: 20 })
    expect(pageQuery.parse({ page: '3', pageSize: '50' })).toEqual({ page: 3, pageSize: 50 })
  })

  it('rejects pages below 1, page sizes above 100 and non-integers', () => {
    expect(pageQuery.safeParse({ page: '0' }).success).toBe(false)
    expect(pageQuery.safeParse({ pageSize: '0' }).success).toBe(false)
    expect(pageQuery.safeParse({ pageSize: '101' }).success).toBe(false)
    expect(pageQuery.safeParse({ pageSize: '100' }).success).toBe(true)
    expect(pageQuery.safeParse({ page: '1.5' }).success).toBe(false)
    expect(pageQuery.safeParse({ page: 'abc' }).success).toBe(false)
  })

  it('skips whole pages', () => {
    expect(pageSkip({ page: 1, pageSize: 20 })).toBe(0)
    expect(pageSkip({ page: 3, pageSize: 20 })).toBe(40)
  })

  it('validates the violation queue filter and refuses unknown or operator keys', () => {
    expect(violationListQuery.parse({})).toEqual({ filter: 'all', page: 1, pageSize: 20 })
    expect(violationListQuery.parse({ filter: 'awaiting', page: '2' })).toMatchObject({
      filter: 'awaiting',
      page: 2,
    })
    expect(violationListQuery.safeParse({ filter: 'bogus' }).success).toBe(false)
    expect(violationListQuery.safeParse({ state: { $ne: 'x' } }).success).toBe(false)
  })

  it('validates the budget queue tab and optional club id', () => {
    expect(budgetListQuery.parse({})).toEqual({ filter: 'all', page: 1, pageSize: 20 })
    expect(
      budgetListQuery.parse({ filter: 'awaitingVendorPay', clubId: '0123456789abcdef01234567' }),
    ).toMatchObject({ filter: 'awaitingVendorPay', clubId: '0123456789abcdef01234567' })
    expect(budgetListQuery.safeParse({ clubId: 'not-an-id' }).success).toBe(false)
    expect(budgetListQuery.safeParse({ clubId: { $ne: null } }).success).toBe(false)
    expect(budgetListQuery.safeParse({ filter: 'pending' }).success).toBe(false)
  })

  it('accepts only paging keys on the suspension request queue', () => {
    expect(suspensionListQuery.parse({ page: '2' })).toEqual({ page: 2, pageSize: 20 })
    expect(suspensionListQuery.safeParse({ state: 'Pending' }).success).toBe(false)
  })
})
