// Datumsträngar 'ÅÅÅÅ-MM-DD' tolkas lokalt, aldrig som UTC – annars blir "i dag" fel kväll.
export const parseLocalDate = (value) => {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const [y, m, d] = String(value).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const daysBetween = (from, to) => {
  const a = parseLocalDate(from)
  const b = parseLocalDate(to)
  return Math.round((b - a) / 86_400_000)
}

export const formatDate = (value) =>
  parseLocalDate(value).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })
