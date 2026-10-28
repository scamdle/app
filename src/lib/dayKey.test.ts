import { describe, expect, it } from 'vitest'

import { dayKey } from './dayKey'

describe('dayKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-11-02T12:00:00Z'), 'UTC')).toBe('2026-11-02')
  })

  it('uses the player time zone, not UTC', () => {
    // 23:30 UTC on 1 Nov is already 2 Nov in Tallinn (UTC+2)
    expect(dayKey(new Date('2026-11-01T23:30:00Z'), 'Europe/Tallinn')).toBe('2026-11-02')
    expect(dayKey(new Date('2026-11-01T23:30:00Z'), 'Europe/Lisbon')).toBe('2026-11-01')
  })
})
