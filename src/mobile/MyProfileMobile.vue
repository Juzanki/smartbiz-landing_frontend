<!-- src/components/MyProfile.vue -->
<template>
  <div class="text-white bg-[#1e293b] p-6 rounded-xl border border-cyan-700 shadow-lg">
    <div class="flex items-center gap-4">
      <img :src="user.avatar || '/user-avatar.png'" alt="Avatar"
           class="w-20 h-20 rounded-full border-2 border-cyan-500 shadow-md object-cover" />
      <div>
        <h2 class="text-xl font-bold text-cyan-300">{{ user.name || 'SmartBiz User' }}</h2>
        <p class="text-sm text-cyan-400">@{{ user.username || 'username' }}</p>
        <p class="text-sm text-gray-300 italic">{{ user.bio || 'SmartBiz Member' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    default: () => ({
      name: 'Smart User',
      username: 'smart_user',
      avatar: '/user-avatar.png',
      bio: 'Welcome to SmartBiz'
    })
  }
})
</script>

<style scoped>
/* Reusable component styles */
</style>

