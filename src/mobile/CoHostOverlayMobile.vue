<template>
  <div class="absolute inset-0 flex justify-center items-center gap-4 z-10">
    <video ref="mainHostVideo" class="w-1/2 h-full object-cover" autoplay playsinline muted />
    <video ref="coHostVideo" class="w-1/2 h-full object-cover" autoplay playsinline muted />
  </div>
</template>

<script setup>
defineProps({
  isActive: Boolean
})
const mainHostVideo = ref(null)
const coHostVideo = ref(null)

// Logic ya kuunganisha stream inaweza kuwekwa kwa webrtc au RTMP join
</script>

