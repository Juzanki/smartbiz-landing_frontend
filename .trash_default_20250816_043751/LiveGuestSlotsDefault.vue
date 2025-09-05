<!-- 
  ✅ Maboresho Yaliopo Ndani:
  Kipengele         Maelezo
  🎥 Guest Video     Akitokea juu
  🔊 Audio Indicator Pulse na 🔊 icon ikiongea
  🔄 Swap Button     Kubadilishana upande
  🛑 Kick            Guest aondolewe na host
-->

<template>
  <div v-if="guest && stream" class="absolute top-0 inset-x-0 z-30 h-1/2 flex items-center justify-center bg-black/30 rounded-b-xl overflow-hidden">
    <!-- 🎥 Guest Video -->
    <video
      ref="guestVideo"
      autoplay
      playsinline
      muted
      class="w-full h-full object-cover rounded-b-xl border-4"
      :class="{ 'border-purple-500 animate-pulse': isTalking }"
    />

    <!-- 🧾 Guest Info Overlay -->
    <div class="absolute top-2 left-2 bg-white/10 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-2 shadow">
      <img :src="guest.avatar" class="w-6 h-6 rounded-full border border-white" />
      <span class="font-medium">{{ guest.name }}</span>
      <span class="text-pink-400 text-[10px]">🎤 Guest</span>
      <span v-if="isTalking" class="text-green-400 text-sm animate-ping ml-1">🔊</span>
    </div>

    <!-- ⚙️ Controls (Visible to Host Only) -->
    <div v-if="isHost" class="absolute bottom-3 right-3 flex gap-2">
      <button @click="$emit('swap')" class="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full">🔄 Swap</button>
      <button @click="$emit('kick')" class="bg-red-600 text-white text-xs px-3 py-1 rounded-full">🛑 Remove</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  guest: { type: Object, required: true },
  stream: { type: MediaStream, required: true },
  isHost: { type: Boolean, default: false }
})

const guestVideo = ref(null)
const isTalking = ref(false)

// 🎥 Assign stream to guest video
onMounted(() => {
  if (guestVideo.value && props.stream) {
    guestVideo.value.srcObject = props.stream
  }
})

// 🔊 Simulated voice detection
watch(() => props.stream, (stream) => {
  if (!stream) return
  const audioTrack = stream.getAudioTracks()[0]
  if (audioTrack) {
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]))
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const detectTalking = () => {
      analyser.getByteFrequencyData(dataArray)
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      isTalking.value = volume > 25
      requestAnimationFrame(detectTalking)
    }
    detectTalking()
  }
})
</script>

