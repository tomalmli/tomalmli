import { daysBetween } from './date'

export const LATE_CANCEL_FEE = 150
export const FREE_CANCEL_DAYS = 2

// Avbokningsavgift: gratis om man avbokar minst två dagar före speldagen, annars 150 kr.
// Avbokning exakt två dagar före är gratis.
export const cancelFee = (date, cancelledAt) => {
  const daysBefore = daysBetween(cancelledAt, date)
  return daysBefore >= FREE_CANCEL_DAYS ? 0 : LATE_CANCEL_FEE
}

// "150 kr" – avgifter är hela kronor
export const formatAmount = (amount) => `${amount.toLocaleString('sv-SE')} kr`
