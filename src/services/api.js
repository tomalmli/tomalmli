// API-klient för Padelhallen. Appen anropar /api relativt: lokalt skickar Vite anropet
// vidare till mock-API:t, i drift gör servern framför appen samma sak.
import { getToken, setToken } from './token'

const BASE_URL = '/api'

export class AuthError extends Error {
  constructor(message = 'Inloggning krävs') {
    super(message)
    this.name = 'AuthError'
  }
}

const request = async (path, options = {}) => {
  const res = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers
    }
  })
  if (res.status === 401) {
    setToken(null)
    throw new AuthError()
  }
  if (!res.ok) throw new Error('API error ' + res.status)
  return res.status === 204 ? null : res.json()
}

export const login = async (email, password) => {
  const res = await fetch(BASE_URL + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (res.status === 401) throw new AuthError('Fel e-post eller lösenord')
  if (!res.ok) throw new Error('API error ' + res.status)
  const data = await res.json()
  setToken(data.token)
  return data
}

export const logout = () => setToken(null)

export const fetchUser = () => request('/user')
export const fetchBookings = () => request('/bookings')
export const fetchHistory = () => request('/bookings/history')
export const fetchMessages = () => request('/messages')
export const book = (data) => request('/book', { method: 'POST', body: JSON.stringify(data) })
