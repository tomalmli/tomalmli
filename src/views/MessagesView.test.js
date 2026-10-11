import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import MessagesView from './MessagesView.vue'

vi.mock('../services/api', () => ({
  fetchMessages: vi.fn().mockResolvedValue([
    { id: 1, date: '2026-10-01', from: 'Padelhallen Sundby', text: 'Din bana är bokad: Bana 2, 15 oktober kl 18.', html: 'Din bana är bokad: Bana 2, 15 oktober kl 18.' }
  ])
}))

describe('MessagesView', () => {
  it('visar meddelandets text och avsändare', async () => {
    render(MessagesView)
    expect(await screen.findByText('Din bana är bokad: Bana 2, 15 oktober kl 18.')).toBeInTheDocument()
    expect(screen.getByText(/Padelhallen Sundby/)).toBeInTheDocument()
  })
})
