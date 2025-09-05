<!-- src/components/LiveNowCard.vue -->
<template>
  <div class="bg-white text-black rounded-lg shadow p-4 flex flex-col gap-2 hover:shadow-xl transition cursor-pointer" @click="goToLive">
    <div class="flex items-center justify-between">
      <h3 class="font-bold text-base">📺 Live Now</h3>
      <span class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">LIVE</span>
    </div>
    <p class="text-sm text-gray-600">🎤 {{ hostName }} is now live!</p>
    <div class="flex justify-between text-xs text-gray-700 mt-1">
      <span>👁️ {{ viewerCount }} viewers</span>
      <span>💬 {{ chatCount }} chats</span>
      <span>🎁 {{ giftCount }} gifts</span>
    </div>
    <button class="btn-primary mt-2">Join Stream</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const props = defineProps({
  hostName: String,
  viewerCount: Number,
  chatCount: Number,
  giftCount: Number
})

function goToLive() {
  router.push('/live-stream')
}
</script>

