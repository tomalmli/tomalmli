import { describe, it, expect } from 'vitest'
import { daysBetween, parseLocalDate } from './date'

describe('daysBetween', () => {
  it('räknar hela dagar mellan två datum', () => {
    expect(daysBetween('2026-10-01', '2026-10-15')).toBe(14)
  })

  it('ger negativt tal när slutet ligger före starten', () => {
    expect(daysBetween('2026-10-15', '2026-10-01')).toBe(-14)
  })

  it('tolkar datumsträngar lokalt, inte som UTC', () => {
    const d = parseLocalDate('2026-10-15')
    expect(d.getDate()).toBe(15)
    expect(d.getHours()).toBe(0)
  })
})
