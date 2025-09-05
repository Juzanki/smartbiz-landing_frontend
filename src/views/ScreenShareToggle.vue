<template>
  <div
    class="min-h-screen p-6 flex flex-col items-center justify-center transition-colors duration-300"
    :class="darkMode ? 'bg-[#121212] text-white' : 'bg-white text-gray-800'"
  >
    <!-- Title -->
    <h2
      class="text-2xl font-bold text-yellow-500 mb-2 animate-bounce drop-shadow-sm"
    >
      Screen Share
    </h2>
    <p
      class="text-sm mb-8 text-center max-w-sm"
      :class="darkMode ? 'text-gray-300' : 'text-gray-500'"
    >
      Seamlessly share your screen during SmartBiz meetings. Toggle below to start or stop.
    </p>

    <!-- Toggle Button -->
    <button
      @click="toggleShare"
      class="w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300"
      :class="isSharing
        ? 'bg-red-500 hover:bg-red-600 text-white scale-105'
        : 'bg-emerald-500 hover:bg-emerald-600 text-white scale-100'"
    >
      <span class="text-4xl mb-2">{{ isSharing ? '🛑' : '📺' }}</span>
      <span class="font-semibold text-sm">
        {{ isSharing ? 'Stop Sharing' : 'Start Sharing' }}
      </span>
    </button>

    <!-- Status -->
    <div
      v-if="statusMessage"
      class="mt-6 text-sm px-4 py-2 rounded-lg animate-fadeSlide"
      :class="isSharing
        ? 'bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/30 dark:text-emerald-300'"
    >
      {{ statusMessage }}
    </div>

    <!-- Theme toggle -->
    <button
      @click="darkMode = !darkMode"
      class="mt-10 px-4 py-2 rounded-full border text-xs transition hover:scale-105"
      :class="darkMode
        ? 'border-gray-600 text-gray-300 hover:border-gray-400'
        : 'border-gray-300 text-gray-600 hover:border-gray-500'"
    >
      {{ darkMode ? '☀️ Light Mode' : '🌙 Dark Mode' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isSharing = ref(false)
const statusMessage = ref('')
const darkMode = ref(false)

function toggleShare() {
  isSharing.value = !isSharing.value
  statusMessage.value = isSharing.value
    ? 'Screen sharing is now active.'
    : 'Screen sharing has stopped.'
}
</script>

<style scoped>
@keyframes fadeSlide {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-fadeSlide {
  animation: fadeSlide 0.5s ease;
}
</style>
