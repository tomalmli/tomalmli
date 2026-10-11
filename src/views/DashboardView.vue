<template>
  <div>
    <h1>{{ greeting }}</h1>
    <img src="../assets/hero.jpg" class="hero" alt="" loading="lazy">

    <div class="grid">
      <div class="card">
        <div class="stat">{{ upcomingCount }}</div>
        <div class="stat-label">kommande bokningar</div>
      </div>
      <div class="card">
        <div class="stat">{{ playedCount }}</div>
        <div class="stat-label">spelade pass</div>
      </div>
      <div class="card">
        <div class="stat">{{ feeTotal }}</div>
        <div class="stat-label">att betala</div>
      </div>
    </div>

    <div class="card">
      <h2>Bokningar per månad</h2>
      <p v-if="!bookings.history">Laddar…</p>
      <BookingsChart v-else :months="bookings.history.months" :values="bookings.history.values" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useBookingsStore } from '../stores/bookings'
import { bookingStatus } from '../utils/booking'
import { cancelFee, formatAmount } from '../utils/fee'
import BookingsChart from '../components/BookingsChart.vue'

const auth = useAuthStore()
const bookings = useBookingsStore()

const greeting = computed(() => (auth.name ? `Hej ${auth.name.split(' ')[0]}!` : 'Hej!'))
const all = computed(() => bookings.bookings || [])
const upcomingCount = computed(() => all.value.filter((b) => bookingStatus(b) === 'Kommande').length)
const playedCount = computed(() => all.value.filter((b) => bookingStatus(b) === 'Spelad').length)
const feeTotal = computed(() =>
  formatAmount(all.value.filter((b) => b.cancelled).reduce((sum, b) => sum + cancelFee(b.date, b.cancelledAt), 0))
)

onMounted(() => {
  if (!bookings.bookings) bookings.load()
  if (!bookings.history) bookings.loadHistory()
})
</script>

<style scoped>
.hero { width: 100%; border-radius: 10px; margin-bottom: 18px; }
</style>
