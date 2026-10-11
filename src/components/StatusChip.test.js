import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import StatusChip from './StatusChip.vue'

describe('StatusChip', () => {
  it('visar Avbokad för en avbokad bokning', () => {
    render(StatusChip, { props: { booking: { date: '2999-01-01', cancelled: true } } })
    expect(screen.getByRole('status')).toHaveTextContent('Avbokad')
  })

  it('visar Spelad när speldagen passerat', () => {
    render(StatusChip, { props: { booking: { date: '2020-01-01', cancelled: false } } })
    expect(screen.getByRole('status')).toHaveTextContent('Spelad')
  })

  it('visar Kommande för en bokning som inte spelats', () => {
    render(StatusChip, { props: { booking: { date: '2999-12-31', cancelled: false } } })
    expect(screen.getByText('Kommande')).toBeInTheDocument()
  })
})
