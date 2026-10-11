// Del C · C4. Körs med Vitest: npx vitest run --config grading/vitest.config.mjs
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'

const PAYLOAD = '<img src="x" onerror="window.__xss = true">'

vi.mock('../src/services/api', () => ({
  fetchMessages: vi.fn().mockResolvedValue([
    // både text och html: den osäkra vyn renderar html, den säkra text – payloaden är samma
    { id: 1, date: '2026-10-15', from: 'Padelhallen Sundby', text: PAYLOAD, html: PAYLOAD }
  ])
}))

describe('C4 XSS', () => {
  it('C4 ett meddelande med HTML visas som text och skapar inget element', async () => {
    const { default: MessagesView } = await import('../src/views/MessagesView.vue')
    const { container } = render(MessagesView)
    await screen.findByText(/Padelhallen Sundby/)
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('img'), 'ett <img> skapades ur meddelandet – HTML ur API:t renderas som HTML').toBeNull()
    expect(container.textContent).toContain('<img')
  })
})
