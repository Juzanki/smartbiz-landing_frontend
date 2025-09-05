<template>
  <div class="relative w-full h-full bg-black">
    <video
      ref="videoRef"
      class="w-full h-full object-cover"
      autoplay
      controls
      playsinline
      muted
    ></video>

    <div v-if="!isPlaying" class="absolute inset-0 flex items-center justify-center text-white text-xl font-bold">
      Connecting to live stream...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  source: {
    type: String,
    required: true
  }
})

const videoRef = ref(null)
const isPlaying = ref(false)

onMounted(() => {
  if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
    videoRef.value.src = props.source
    videoRef.value.addEventListener('playing', () => (isPlaying.value = true))
    videoRef.value.load()
  } else {
    console.warn('This browser may not support HLS playback directly.')
    alert('Please use a compatible browser or install hls.js support.')
  }
})
</script>

