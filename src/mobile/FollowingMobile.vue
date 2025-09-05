<template>
  <div class="p-6 bg-[#0f172a] text-white rounded-xl border border-cyan-700 shadow-xl">
    <h2 class="text-xl font-bold text-cyan-200 mb-4">👣 Following</h2>
    <div v-if="following.length" class="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-4 gap-4">
      <div v-for="user in following" :key="user.username" class="bg-[#1e293b] rounded-lg p-3 flex items-center gap-3 hover:bg-cyan-900/10 transition">
        <img :src="user.avatar" alt="user avatar" class="w-10 h-10 rounded-full border border-cyan-500 object-cover" />
        <div>
          <p class="text-white font-medium">{{ user.username }}</p>
          <p class="text-xs text-gray-400">{{ user.role }}</p>
        </div>
      </div>
    </div>
    <div v-else class="text-center text-gray-400 py-8">
      You are not following anyone yet.
    </div>
  </div>
</template>

<script setup>
const following = [
  {
    username: '@david_tech',
    role: 'AI Enthusiast',
    avatar: '/avatars/david.png'
  },
  {
    username: '@queenbizz',
    role: 'Startup Founder',
    avatar: '/avatars/queenbizz.png'
  },
  {
    username: '@smartdev',
    role: 'Fullstack Engineer',
    avatar: '/avatars/smartdev.png'
  }
]
</script>

<style scoped>
img {
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.3);
}
</style>

