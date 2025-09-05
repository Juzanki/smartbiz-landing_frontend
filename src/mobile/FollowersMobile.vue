<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-3 py-10 text-white">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-cyan-300 mb-6">👥 Your Followers</h1>

      <div v-if="followers.length" class="grid sm:grid-cols-2 md:grid-cols-1 gap-3">
        <div v-for="user in followers" :key="user.username" class="bg-[#1e293b] p-4 rounded-xl border border-cyan-700 shadow-md hover:scale-105 transition">
          <div class="flex items-center gap-4">
            <img :src="user.avatar" alt="avatar" class="w-12 h-12 rounded-full border border-cyan-400 object-cover" />
            <div>
              <p class="text-white font-semibold">{{ user.name }}</p>
              <p class="text-sm text-cyan-300">{{ user.username }}</p>
            </div>
          </div>
          <p class="mt-3 text-sm text-gray-300">{{ user.bio }}</p>
          <div class="mt-4 flex gap-2">
            <button class="btn-cyan text-xs">Message</button>
            <button class="btn-dark text-xs">Remove</button>
          </div>
        </div>
      </div>

      <p v-else class="text-gray-400 italic text-center mt-20">You have no followers yet.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const followers = ref([])

onMounted(() => {
  // Simulated API call
  followers.value = [
    {
      name: 'Michael AI',
      username: '@michael_ai',
      avatar: '/user-avatar.png',
      bio: 'AI Builder & Data Enthusiast'
    },
    {
      name: 'Rose Dev',
      username: '@rose_dev',
      avatar: '/user-avatar.png',
      bio: 'Frontend Developer & Tech Educator'
    },
    {
      name: 'Kingsley Biz',
      username: '@kingsley_biz',
      avatar: '/user-avatar.png',
      bio: 'Entrepreneur & SmartBiz Host'
    }
  ]
})
</script>

<style scoped>
.btn-cyan {
  @apply bg-cyan-600 hover:bg-cyan-500 text-white py-1 px-3 rounded-full transition;
}
.btn-dark {
  @apply bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-full transition;
}
</style>

