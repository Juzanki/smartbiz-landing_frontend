<template>
  <div class="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-md p-3 rounded text-white">
    <h3 class="text-sm font-bold mb-2">📤 Share Live</h3>
    <div class="flex flex-col gap-2">
      <button class="btn-secondary text-xs" @click="share">Share to WhatsApp</button>
      <button class="btn-secondary text-xs" @click="copyLink">Copy Invite Link</button>
    </div>
  </div>
</template>

<script setup>
function share() {
  const link = window.location.href
  window.open(`https://wa.me/?text=Join this live: ${link}`, '_blank')
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href)
  alert('Link copied!')
}
</script>

