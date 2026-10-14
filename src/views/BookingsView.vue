<template>
  <div>
    <h1>Mina bokningar</h1>
    <div class="card">
      <label for="search" class="hint">Sök bana eller medspelare</label>
      <input id="search" type="search" @input="onSearch" placeholder="T.ex. Bana 2">
      <p v-if="bookings.loading">Laddar…</p>
      <p v-else-if="bookings.error" role="alert" class="error">{{ bookings.error }}</p>
      <table v-else-if="bookings.bookings">
        <thead>
          <tr><th>Datum</th><th>Tid</th><th>Bana</th><th>Medspelare</th><th>Status</th><th>Avgift</th></tr>
        </thead>
        <tbody>
          <tr v-for="b in filtered" :key="b.id">
            <td>{{ formatDate(b.date) }}</td>
            <td>{{ b.time }}</td>
            <td>{{ b.court }}</td>
            <td>{{ b.partner }}</td>
            <td><StatusChip :booking="b" /></td>
            <td>{{ b.cancelled ? formatAmount(cancelFee(b.date, b.cancelledAt)) : '–' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useBookingsStore } from '../stores/bookings'
import { formatDate } from '../utils/date'
import { cancelFee, formatAmount } from '../utils/fee'
import StatusChip from '../components/StatusChip.vue'

const bookings = useBookingsStore()
const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = (bookings.bookings || []).filter((b) => !q || `${b.court} ${b.partner}`.toLowerCase().includes(q))
  return _.sortBy(list, 'date')
})

const onSearch = _.debounce((event) => {
  query.value = event.target.value
}, 250)

onMounted(() => {
  if (!bookings.bookings) bookings.load()
})
</script>
