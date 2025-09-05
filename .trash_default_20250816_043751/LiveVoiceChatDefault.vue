<template>
  <div class="fixed bottom-5 left-5 z-30">
    <button @click="toggleVoice" class="bg-indigo-600 text-white px-4 py-2 rounded shadow">
      {{ isTalking ? 'Mute Mic' : 'Join Voice Chat' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isTalking = ref(false)
let stream = null

function toggleVoice() {
  if (!isTalking.value) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
      stream = s
      isTalking.value = true
      // ➕ Tuma kwa WebRTC au Socket
    })
  } else {
    stream.getTracks().forEach(track => track.stop())
    isTalking.value = false
  }
}
</script>

