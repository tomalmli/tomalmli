<template>
  <div>
    <h1>Boka bana</h1>
    <form class="card" novalidate @submit.prevent="submit">
      <label for="court" class="hint">Bana</label>
      <select id="court" v-model="court">
        <option>Bana 1</option>
        <option>Bana 2</option>
        <option>Bana 3</option>
      </select>
      <label for="date" class="hint">Datum</label>
      <input id="date" type="date" v-model="date">
      <label for="partner" class="hint">Medspelare</label>
      <input id="partner" v-model="partner" placeholder="Namn">
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-if="done" role="status">Bokningen är mottagen. Du får ett meddelande med bekräftelsen.</p>
      <button class="btn" type="submit" :disabled="busy">{{ busy ? 'Skickar…' : 'Boka' }}</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { book } from '../services/api'

const court = ref('Bana 1')
const date = ref('')
const partner = ref('')
const error = ref(null)
const done = ref(false)
const busy = ref(false)

const submit = async () => {
  error.value = null
  done.value = false
  if (!date.value || !partner.value.trim()) {
    error.value = 'Fyll i datum och medspelare.'
    return
  }
  busy.value = true
  try {
    await book({ court: court.value, date: date.value, partner: partner.value.trim() })
    done.value = true
  } catch (e) {
    error.value = 'Bokningen gick inte att skicka. Försök igen.'
  } finally {
    busy.value = false
  }
}
</script>
