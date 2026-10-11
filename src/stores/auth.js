import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/api'
import { getToken } from '../services/token'


// Vem är inloggad? Storen frågar services/token.js – det är det appen tittar på.
export const useAuthStore = defineStore('auth', () => {
  const name = ref(null)

  const token = ref(getToken())
  const isAuthenticated = computed(() => Boolean(token.value))

  const login = async (email, password) => {
    const data = await api.login(email, password)
    token.value = data.token
    name.value = data.name
  }

  const logout = () => {
    api.logout()
    token.value = null
    name.value = null
  }

  return { name, isAuthenticated, login, logout }
})
