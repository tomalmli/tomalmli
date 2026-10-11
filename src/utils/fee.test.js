import { describe, it, expect } from 'vitest'
import { cancelFee, formatAmount } from './fee'

describe('cancelFee', () => {
  it('är gratis en vecka före', () => {
    expect(cancelFee('2026-10-15', '2026-10-08')).toBe(0)
  })

  it('är gratis exakt två dagar före', () => {
    expect(cancelFee('2026-10-15', '2026-10-13')).toBe(0)
  })

  it('kostar 150 kr dagen före', () => {
    expect(cancelFee('2026-10-15', '2026-10-14')).toBe(150)
  })

  it('kostar 150 kr på speldagen', () => {
    expect(cancelFee('2026-10-15', '2026-10-15')).toBe(150)
  })
})

describe('formatAmount', () => {
  it('skriver kronor utan decimaler', () => {
    expect(formatAmount(150)).toBe('150 kr')
  })
})
