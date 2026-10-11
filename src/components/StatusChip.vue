<template>
  <span :class="['status-chip', modifier]" role="status">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { bookingStatus } from '../utils/booking'

const props = defineProps({
  booking: { type: Object, required: true }
})

const label = computed(() => bookingStatus(props.booking))
const modifier = computed(() => ({ Kommande: 'status-kommande', Spelad: 'status-spelad', Avbokad: 'status-avbokad' })[label.value])
</script>
