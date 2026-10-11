// Del C · C5. Körs med Vitest: npx vitest run --config grading/vitest.config.mjs
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('C5 tokenlagring', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('C5 token sparas inte i localStorage/sessionStorage men skickas med i anropen', async () => {
    const calls = []
    globalThis.fetch = vi.fn(async (url, options = {}) => {
      calls.push({ url: String(url), options })
      const body = String(url).endsWith('/login') ? { token: 'test-token-123', name: 'Sara Ek' } : []
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const api = await import('../src/services/api')
    await api.login('sara.ek@example.com', 'padel-sara')
    const stored = [...Array(localStorage.length)].map((_, i) => localStorage.getItem(localStorage.key(i)))
    const storedSession = [...Array(sessionStorage.length)].map((_, i) => sessionStorage.getItem(sessionStorage.key(i)))
    expect(stored.join(' ') + storedSession.join(' '), 'token hittades i localStorage/sessionStorage – den ska ligga i minnet').not.toContain('test-token-123')
    expect(localStorage.length + sessionStorage.length, 'något skrevs till localStorage/sessionStorage vid inloggning').toBe(0)
    await api.fetchBookings()
    const last = calls[calls.length - 1]
    const auth = last.options.headers?.Authorization || last.options.headers?.authorization
    expect(auth, 'anropet efter inloggning saknar Authorization: Bearer – token måste följa med från minnet').toBe('Bearer test-token-123')
  })
})
