import { daysBetween } from './date'

// Status för en bokning räknat på "i dag" – skickas in så att den går att testa.
export const bookingStatus = (booking, today = new Date()) => {
  if (booking.cancelled) return 'Avbokad'
  return daysBetween(booking.date, today) > 0 ? 'Spelad' : 'Kommande'
}
