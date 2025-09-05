<template>
  <button @click="toggleScreenShare" class="icon-btn" :title="isSharing ? 'Stop Sharing' : 'Share Screen'">
    <span v-if="!isSharing">🖥️ Share</span>
    <span v-else>❌ Stop</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'

const isSharing = ref(false)
let mediaStream = null

function toggleScreenShare() {
  if (!isSharing.value) {
    navigator.mediaDevices.getDisplayMedia({ video: true })
      .then(stream => {
        mediaStream = stream
        const video = document.querySelector('video')
        if (video) {
          video.srcObject = stream
          isSharing.value = true
        }
      })
      .catch(err => {
        console.error('Screen share failed', err)
      })
  } else {
    const tracks = mediaStream?.getTracks()
    tracks?.forEach(track => track.stop())
    isSharing.value = false
    location.reload() // rudisha camera stream ya kawaida
  }
}
</script>

<style scoped>
.icon-btn {
  @apply bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 text-sm rounded-full shadow;
}
</style>

