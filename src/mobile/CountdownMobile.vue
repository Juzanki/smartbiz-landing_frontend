<template>
  <span :class="countdownClass">
    {{ formattedCountdown }}
  </span>
</template>

<script setup>
import { computed, watch, ref } from 'vue'

const props = defineProps({
  eta: { type: String, required: true } // ISO format preferred
})

const countdown = ref('')
const countdownClass = ref('')

const updateCountdown = () => {
  const targetTime = new Date(props.eta).getTime()
  const now = Date.now()
  const diff = targetTime - now

  if (diff <= 0) {
    countdown.value = 'Arriving...'
    countdownClass.value = 'text-green-500 font-bold animate-pulse'
    return
  }

  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  countdown.value = `${minutes}m ${seconds}s`

  if (minutes <= 1) {
    countdownClass.value = 'text-red-500 font-bold animate-pulse'
  } else if (minutes <= 3) {
    countdownClass.value = 'text-yellow-400 animate-pulse'
  } else {
    countdownClass.value = 'text-white'
  }
}

const formattedCountdown = computed(() => countdown.value)

watch(() => props.eta, updateCountdown, { immediate: true })
setInterval(updateCountdown, 1000)
</script>

