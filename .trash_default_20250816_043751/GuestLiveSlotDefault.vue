<template>
  <div class="absolute top-0 inset-x-0 z-20 h-1/2 flex items-center justify-center bg-black/30 rounded-b-xl overflow-hidden group">
    <!-- 🎥 Guest video element -->
    <video
      ref="guestVideo"
      autoplay
      playsinline
      muted
      class="w-full h-full object-cover transition-all duration-300 border-4"
      :class="{ 'border-purple-500 animate-pulse': isSpeaking }"
    />

    <!-- 👤 Guest overlay info -->
    <div class="absolute top-2 left-2 bg-white/10 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-2 shadow">
      <img :src="guest.avatar" class="w-6 h-6 rounded-full border border-white" />
      <span class="font-medium">{{ guest.name }}</span>
      <span class="text-pink-400 text-[10px]">🎤 Guest</span>
    </div>

    <!-- 🔘 Action Buttons (host only, visible on hover) -->
    <div class="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition duration-300">
      <button @click="$emit('swap')" class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-white">
        🔄 Swap
      </button>
      <button @click="$emit('kick')" class="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full text-white">
        🛑 Remove
      </button>
    </div>

    <!-- 🔊 Audio Indicator -->
    <div
      v-if="isSpeaking"
      class="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-400 animate-ping"
    ></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  guest: { type: Object, required: true },
  stream: { type: MediaStream, default: null }
})

const emit = defineEmits(['kick', 'swap'])

const guestVideo = ref(null)
const isSpeaking = ref(false)

onMounted(() => {
  if (guestVideo.value && props.stream) {
    guestVideo.value.srcObject = props.stream

    // Optional: Audio context logic to detect speaking
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(props.stream)
    const analyser = audioContext.createAnalyser()
    source.connect(analyser)
    analyser.fftSize = 512

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const detectSpeech = () => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength
      isSpeaking.value = avg > 10
      requestAnimationFrame(detectSpeech)
    }

    detectSpeech()
  }
})
</script>

<style scoped>
video {
  border-radius: 12px;
}

.animate-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { border-color: transparent; }
  50% { border-color: #9333ea; }
}
</style>

