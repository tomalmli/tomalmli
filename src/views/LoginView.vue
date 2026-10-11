<template>
  <div class="login-wrap">
    <form class="card login-card" novalidate @submit.prevent="handleLogin">
      <h1>Padelhallen</h1>
      <p class="hint" style="margin-bottom: 16px">Sundby · Mina sidor</p>
      <label for="email">E-postadress</label>
      <input id="email" type="email" v-model="email" autocomplete="username">
      <label for="password">Lösenord</label>
      <input id="password" type="password" v-model="password" autocomplete="current-password">
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <button class="btn" style="width:100%" type="submit" :disabled="busy">{{ busy ? 'Loggar in…' : 'Logga in' }}</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { AuthError } from '../services/api'

const email = ref('')
const password = ref('')
const error = ref(null)
const busy = ref(false)
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const handleLogin = async () => {
  error.value = null
  busy.value = true
  try {
    await auth.login(email.value, password.value)
    const target = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    router.push(target)
  } catch (e) {
    error.value = e instanceof AuthError ? e.message : 'Något gick fel. Försök igen om en stund.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.login-wrap { display: flex; justify-content: center; padding-top: 60px; }
.login-card { width: 380px; }
label { display: block; font-size: 13px; margin-bottom: 4px; color: #6b7a72; }
</style>
