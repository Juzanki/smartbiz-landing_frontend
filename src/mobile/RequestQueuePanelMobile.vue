<template>
  <div class="fixed bottom-24 right-4 z-50 w-[90vw] max-w-sm bg-white text-black rounded-xl shadow-xl p-4 backdrop-blur-lg">
    <h3 class="text-center text-base font-semibold mb-3">🙋‍♂️ Join Requests</h3>
    <div v-if="requests.length === 0" class="text-center text-sm text-gray-500">No pending requests.</div>
    <div v-else class="space-y-3 max-h-[300px] overflow-y-auto">
      <div v-for="(req, index) in requests" :key="req.timestamp" class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg shadow">
        <div class="flex items-center gap-2">
          <img :src="req.avatar" class="w-8 h-8 rounded-full border border-gray-300" />
          <span class="text-sm font-medium">{{ req.name }}</span>
        </div>
        <div class="flex gap-2">
          <button @click="accept(req)" class="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-full">✅</button>
          <button @click="reject(index)" class="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full">❌</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Props: list of incoming requests from parent
const props = defineProps({
  requests: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['accept', 'reject'])

const accept = (req) => {
  emit('accept', req)
}

const reject = (index) => {
  emit('reject', index)
}
</script>

<style scoped>
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 5px;
}
</style>

