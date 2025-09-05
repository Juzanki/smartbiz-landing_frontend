<template>
  <button @click="showTips = !showTips" class="icon-btn">
    🤖 Tips
  </button>

  <div
    v-if="showTips"
    class="absolute top-20 right-4 z-40 bg-white text-black p-4 rounded-xl shadow-xl w-72 max-w-[90vw]"
  >
    <div class="flex justify-between items-center mb-2">
      <h3 class="font-bold text-sm">🤖 AI Tips for Hosts</h3>
      <button @click="showTips = false" class="text-gray-500 hover:text-red-500">✖️</button>
    </div>
    <ul class="text-sm space-y-2">
      <li>🎯 Start with a clear topic and stick to it</li>
      <li>🙋 Engage your viewers by name</li>
      <li>⏱️ Use polls to break monotony every 5–10 minutes</li>
      <li>🎁 Mention top gifters to encourage participation</li>
      <li>🧠 Ask open-ended questions to keep chat active</li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const showTips = ref(false)
</script>

<style scoped>
.icon-btn {
  @apply bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 text-sm rounded-full shadow;
}
</style>

