<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white text-black rounded-xl shadow-xl w-[90%] max-w-sm p-6 text-center relative">
      <h3 class="text-base font-semibold mb-2">🎤 Live Invitation</h3>

      <p class="text-sm mb-3">
        Host <span class="font-bold text-indigo-600">{{ from.name }}</span> has invited you to join the Live!
      </p>

      <!-- 🔮 AI Suggestion -->
      <p class="text-xs text-pink-600 mb-3 italic animate-pulse">
        💡 We suggest you accept — this session is 🔥 trending!
      </p>

      <!-- ⏳ Countdown -->
      <p v-if="countdown > 0" class="text-xs text-gray-500 mb-3">
        Auto-decline in <span class="font-bold">{{ countdown }}</span>s...
      </p>

      <!-- 🔄 Connecting Animation -->
      <div v-if="connecting" class="mt-3 text-indigo-500 text-sm animate-pulse">
        Connecting...
      </div>

      <div v-else class="flex justify-center gap-4 mt-4">
        <button
          @click="acceptInvite"
          class="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-full"
        >
          ✅ Accept
        </button>
        <button
          @click="declineInvite"
          class="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-full"
        >
          ❌ Decline
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  from: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['respond'])

const countdown = ref(10)
const connecting = ref(false)
let timer = null

// Countdown auto-decline
onMounted(() => {
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      emit('respond', { accepted: false })
    }
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

const acceptInvite = () => {
  clearInterval(timer)
  connecting.value = true
  setTimeout(() => {
    emit('respond', { accepted: true })
  }, 2000) // Simulate "connecting..."
}

const declineInvite = () => {
  clearInterval(timer)
  emit('respond', { accepted: false })
}
</script>

<style scoped>
/* Optional animation helpers */
.animate-pulse {
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>

