<template>
  <div class="fixed top-20 right-4 z-50 bg-white text-black rounded-xl shadow-xl w-80 max-h-[80vh] overflow-y-auto p-4">
    <h3 class="text-base font-bold text-indigo-600 mb-3">📊 Join Requests</h3>
    <div v-if="requests.length === 0" class="text-sm text-gray-500">No requests yet.</div>
    <ul v-else class="space-y-3">
      <li v-for="(req, index) in requests" :key="req.timestamp" class="bg-gray-100 p-3 rounded-lg shadow flex justify-between items-center">
        <div>
          <p class="font-semibold text-sm">{{ req.name }}</p>
          <p class="text-xs text-gray-500">{{ formatTime(req.timestamp) }}</p>
        </div>
        <button @click="$emit('approve', req)" class="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full">🎤 Add</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  requests: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['approve'])

const formatTime = (ts) => {
  const date = new Date(ts)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
/* Smooth Scrollbar */
ul::-webkit-scrollbar {
  width: 5px;
}
ul::-webkit-scrollbar-thumb {
  background-color: #999;
  border-radius: 10px;
}
</style>

