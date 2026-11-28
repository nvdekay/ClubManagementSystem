import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/domain/errors.js'
import {
  authUserFrom,
  conflict,
  decimal,
  finiteMoney,
  found,
  notFound,
  optionalDate,
  optionalNumber,
  optionalText,
  records,
  storedDate,
  strings,
} from '../../src/infra/db/repo-helpers.js'

describe('repo-helpers coercers', () => {
  it('reads optional primitives', () => {
    expect(optionalText('a')).toBe('a')
    expect(optionalText('')).toBeUndefined()
    expect(optionalText(1)).toBeUndefined()
    const at = new Date('2026-01-01T00:00:00Z')
    expect(optionalDate(at)).toBe(at)
    expect(optionalDate('2026-01-01')).toBeUndefined()
    expect(optionalNumber('12.5')).toBe(12.5)
    expect(optionalNumber(null)).toBeUndefined()
    expect(optionalNumber('x')).toBeUndefined()
  })

  it('treats empty or invalid money as zero', () => {
    expect(finiteMoney(decimal(1500))).toBe(1500)
    expect(finiteMoney(undefined)).toBe(0)
    expect(finiteMoney('abc')).toBe(0)
    expect(finiteMoney(Infinity)).toBe(0)
  })

  it('filters arrays and checks stored dates', () => {
    expect(records([{ a: 1 }, null, [1], 'x'])).toEqual([{ a: 1 }])
    expect(records('x')).toEqual([])
    expect(strings(['a', 1, 'b'])).toEqual(['a', 'b'])
    const at = new Date()
    expect(storedDate(at, 'access')).toBe(at)
    expect(() => storedDate('2026', 'access')).toThrow('invalid access date in database')
  })
})

describe('repo-helpers errors', () => {
  it('throws typed domain errors', () => {
    expect(() => conflict('busy')).toThrow(new DomainError('busy', 'conflict'))
    expect(() => notFound('gone')).toThrow(DomainError)
    expect(found(0, 'x')).toBe(0)
    try {
      found(null, 'club not found')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError)
      expect((error as DomainError).message).toBe('club not found')
      expect((error as DomainError).kind).toBe('not_found')
    }
  })
})

describe('authUserFrom', () => {
  it('maps a user document', () => {
    const _id = new Types.ObjectId()
    expect(
      authUserFrom({ _id, email: 'a@fpt.edu.vn', displayName: 'A', accountState: 'Locked' }),
    ).toEqual({
      id: String(_id),
      email: 'a@fpt.edu.vn',
      displayName: 'A',
      avatarUrl: undefined,
      accountState: 'Locked',
      lockReason: undefined,
    })
  })
})
