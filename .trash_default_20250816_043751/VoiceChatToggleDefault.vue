<template>
  <button @click="toggleVoiceChat" class="icon-btn">
    <span v-if="isVoiceChatOn">🔊 Voice On</span>
    <span v-else>🔇 Voice Off</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'

const isVoiceChatOn = ref(false)

function toggleVoiceChat() {
  isVoiceChatOn.value = !isVoiceChatOn.value

  if (isVoiceChatOn.value) {
    // Start microphone stream logic
    console.log('🎙️ Voice chat enabled')
    // Add real-time audio streaming logic here
  } else {
    // Stop microphone stream logic
    console.log('🔇 Voice chat disabled')
    // Stop audio stream here
  }
}
</script>

<style scoped>
.icon-btn {
  @apply bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 text-sm rounded-full shadow;
}
</style>

