import { describe, expect, it } from 'vitest'

import {
  dateFormatter,
  dateLocale,
  formatDay,
  formatEventWhen,
  formatTime,
  vnDateInput,
} from '@/utils/formatDate'

// 2026-11-13T17:30Z is already 14 Nov, 00:30 in Vietnam (UTC+7)
const lateEvening = '2026-11-13T17:30:00.000Z'

describe('formatDate helpers', () => {
  it('maps i18n languages to one locale per language', () => {
    expect(dateLocale('vi')).toBe('vi-VN')
    expect(dateLocale('vi-VN')).toBe('vi-VN')
    expect(dateLocale('en')).toBe('en-GB')
  })

  it('always renders in Vietnam time, whatever the browser time zone', () => {
    expect(vnDateInput(lateEvening)).toBe('2026-11-14')
    expect(formatTime(lateEvening, 'en')).toBe('00:30')
    expect(formatDay(lateEvening, 'en')).toBe('14 Nov 2026')
  })

  it('reuses one formatter per locale and options', () => {
    expect(dateFormatter('vi', { dateStyle: 'medium' })).toBe(
      dateFormatter('vi', { dateStyle: 'medium' }),
    )
    expect(dateFormatter('vi', { dateStyle: 'medium' })).not.toBe(
      dateFormatter('en', { dateStyle: 'medium' }),
    )
  })

  it('keeps the event time order for both languages', () => {
    expect(formatEventWhen(lateEvening, 'en')).toBe('Sat 14 Nov · 00:30')
    expect(formatEventWhen(lateEvening, 'vi')).toMatch(/14\/11 · 00:30$/)
  })

  it('shows a dash for a missing day', () => {
    expect(formatDay(undefined, 'vi')).toBe('—')
  })
})
