import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createTestingPinia } from '@pinia/testing'
import DashboardView from './DashboardView.vue'

// Diagrammet ritar på en <canvas> som jsdom inte har – chart.js har egna tester, vi mockar bort det.
vi.mock('chart.js/auto', () => ({
  default: class ChartMock {
    destroy() {}
  }
}))

const renderDashboard = (initialState) =>
  render(DashboardView, {
    global: {
      plugins: [createTestingPinia({ initialState, createSpy: vi.fn })]
    }
  })

describe('DashboardView', () => {
  it('hälsar med förnamnet när användaren är inloggad', () => {
    renderDashboard({ auth: { name: 'Sara Ek' } })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hej Sara!')
  })

  it('hälsar neutralt innan namnet finns (ingen krasch)', () => {
    renderDashboard({ auth: { name: null } })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hej!')
  })

  it('räknar kommande och spelade bokningar', () => {
    renderDashboard({
      bookings: {
        bookings: [
          { id: 1, date: '2999-01-01', cancelled: false },
          { id: 2, date: '2020-01-01', cancelled: false },
          { id: 3, date: '2020-01-01', cancelled: true, cancelledAt: '2019-12-31' }
        ]
      }
    })
    expect(screen.getByText('kommande bokningar').previousElementSibling).toHaveTextContent('1')
    expect(screen.getByText('spelade pass').previousElementSibling).toHaveTextContent('1')
  })
})
