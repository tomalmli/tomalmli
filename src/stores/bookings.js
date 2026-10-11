import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/api'

export const useBookingsStore = defineStore('bookings', () => {
  const bookings = ref(null)
  const history = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const load = async () => {
    loading.value = true
    error.value = null
    try {
      bookings.value = await api.fetchBookings()
    } catch (e) {
      error.value = 'Kunde inte hämta dina bokningar just nu.'
    } finally {
      loading.value = false
    }
  }

  const loadHistory = async () => {
    try {
      history.value = await api.fetchHistory()
    } catch (e) {
      history.value = null
    }
  }

  return { bookings, history, loading, error, load, loadHistory }
})
