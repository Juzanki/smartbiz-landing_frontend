<template>
  <div class="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md w-full max-w-md mx-auto">
    <h2 class="text-lg font-semibold mb-4 text-center text-blue-600">🎁 Invite a Friend & Earn SmartCoins</h2>

    <div class="flex justify-center mb-4">
      <qrcode-vue :value="referralUrl" :size="180" class="border rounded-xl p-2 bg-white shadow" />
    </div>

    <p class="text-sm text-gray-700 dark:text-gray-300 mb-2 text-center">
      Share this link and earn <strong>SmartCoins</strong> when someone joins through your invitation!
    </p>

    <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg mt-2">
      <span class="text-xs truncate text-gray-600 dark:text-gray-200">{{ referralUrl }}</span>
      <button @click="copyLink" class="text-blue-600 hover:underline text-sm">Copy</button>
    </div>

    <div v-if="copied" class="text-green-500 text-xs mt-2 text-center">✅ Link copied to clipboard!</div>
  </div>
</template>

<script setup>
import QRCodeVue from 'qrcode.vue'
import { ref } from 'vue'

// 🔄 Badilisha domain ipasavyo au chukua kutoka kwa env
const referralCode = 'your-ref-code'  // unaweza chukua kutoka kwa user store
const referralUrl = `${window.location.origin}/signup?ref=${referralCode}`

const copied = ref(false)

function copyLink() {
  navigator.clipboard.writeText(referralUrl)
  copied.value = true
  setTimeout(() => (copied.value = false), 3000)
}
</script>

