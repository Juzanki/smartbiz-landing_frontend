<template>
  <button @click="toggleReplay" :class="['icon-btn', isRecording ? 'bg-green-700' : 'bg-gray-800']">
    🔁 {{ isRecording ? 'Recording...' : 'Start Replay' }}
  </button>
</template>

<script setup>
import { ref } from 'vue'

const isRecording = ref(false)

function toggleReplay() {
  isRecording.value = !isRecording.value

  if (isRecording.value) {
    console.log('🎥 Replay recording started...')
    // Optional: Trigger backend or local MediaRecorder start here
  } else {
    console.log('🛑 Replay recording stopped.')
    // Optional: Trigger backend or local MediaRecorder stop here
  }
}
</script>

<style scoped>
.icon-btn {
  @apply hover:bg-gray-700 text-white px-3 py-1 text-sm rounded-full shadow;
}
</style>

