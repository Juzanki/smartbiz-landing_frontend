<!-- 📱 BottomNav.vue -->
<template>
  <nav class="fixed bottom-0 left-0 w-full bg-white dark:bg-black border-t border-gray-200 dark:border-gray-700 z-50 flex justify-around items-center py-2">
    <button v-for="item in navItems" :key="item.name"
      class="flex flex-col items-center text-sm text-gray-600 dark:text-gray-300 hover:text-yellow-500 transition"
      :class="{ 'text-yellow-500 font-semibold': route.path === item.path }"
      @click="router.push(item.path)">
      <div class="text-xl">{{ item.icon }}</div>
      <span>{{ item.name }}</span>
    </button>
  </nav>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navItems = [
  { name: 'Home', icon: '🏠', path: '/dashboard/user' },
  { name: 'Live', icon: '📺', path: '/live-stream' },
  { name: 'Gifts', icon: '🎁', path: '/gifts' },
  { name: 'Profile', icon: '👤', path: '/profile' }
]
</script>

<style scoped>
nav {
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
}
</style>

