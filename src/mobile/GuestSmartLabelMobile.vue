<template>
  <transition name="fade">
    <div v-if="visible" class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-3 py-3 rounded-xl shadow-lg text-sm text-center max-w-xs">
      <span>{{ label }}</span>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  position: Number,     // e.g. 1 = next
  totalGuests: Number,  // e.g. max = 1 guest on screen
  status: String        // 'waiting' | 'full' | 'next'
})

const label = ref('')
const visible = ref(true)

watch(() => props.status, () => {
  if (props.status === 'next') {
    label.value = "✅ You're next in queue — please stay alert!"
  } else if (props.status === 'full') {
    label.value = "⛔ Screen is full — please wait..."
  } else {
    label.value = "🔄 Please wait — host is reviewing requests..."
  }

  visible.value = true
  setTimeout(() => (visible.value = false), 6000)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

