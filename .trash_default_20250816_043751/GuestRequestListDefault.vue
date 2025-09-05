<template>
  <div class="absolute bottom-28 right-4 z-50 w-[300px] bg-white/90 text-black rounded-xl shadow-lg p-4 backdrop-blur-md">
    <h3 class="text-sm font-bold mb-2">🧑‍🤝‍🧑 Guest Join Requests</h3>

    <div v-if="requests.length === 0" class="text-xs text-gray-500 italic">
      No guest requests yet.
    </div>

    <div v-else class="space-y-3 max-h-60 overflow-y-auto">
      <div
        v-for="req in requests"
        :key="req.id"
        class="flex items-center justify-between bg-white/80 rounded-lg px-3 py-2 shadow"
      >
        <div class="flex items-center gap-2">
          <img :src="req.avatar" alt="avatar" class="w-8 h-8 rounded-full border border-white" />
          <span class="text-sm font-medium">{{ req.name }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button @click="approve(req.id)" class="text-green-600 text-sm hover:underline">Accept</button>
          <button @click="reject(req.id)" class="text-red-500 text-sm hover:underline">Decline</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  requests: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['approve', 'reject'])

const approve = (id) => emit('approve', id)
const reject = (id) => emit('reject', id)
</script>

<style scoped>
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 10px;
}
</style>

