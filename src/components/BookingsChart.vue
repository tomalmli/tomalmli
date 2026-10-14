<template>
  <canvas ref="canvas" aria-label="Bokningar per månad" role="img"></canvas>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale
} from 'chart.js'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  months: { type: Array, required: true },
  values: { type: Array, required: true }
})

const canvas = ref(null)
let chart

onMounted(() => {
  chart = new ChartJS(canvas.value, {
    type: 'bar',
    data: {
      labels: props.months,
      datasets: [{ label: 'Bokningar', data: props.values, backgroundColor: '#e8642b' }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  })
})

onBeforeUnmount(() => chart?.destroy())
</script>
