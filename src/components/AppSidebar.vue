<!-- src/components/AppSidebar.vue -->
<template>
  <aside
    class="fixed inset-y-0 left-0 w-64 bg-[#0b1220] text-white p-4 border-r border-white/10"
    role="navigation"
    aria-label="Sidebar"
  >
    <!-- Brand -->
    <div class="text-xl font-bold mb-6 flex items-center gap-2">
      <span>🚀</span><span>SmartBiz</span>
    </div>

    <!-- Nav -->
    <nav class="space-y-1">
      <RouterLink
        v-for="l in links"
        :key="l.path"
        :to="l.path"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm border transition"
        :class="isActive(l.path)
          ? 'bg-indigo-600/20 border-indigo-500/30 text-white'
          : 'text-white/80 hover:bg-white/10 hover:border-white/10 border-transparent'"
        aria-current="page"
      >
        <span class="text-lg">{{ l.icon }}</span>
        <span class="truncate">{{ l.name }}</span>
      </RouterLink>
    </nav>

    <div class="flex-1"></div>

    <!-- Mini profile (avatar bundled via Vite import) -->
    <div class="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-[12px]">
      <div class="flex items-center gap-2">
        <img
          :src="avatarSrc"
          @error="onImgErr"
          alt="You"
          class="w-7 h-7 rounded-full border border-white/20"
        />
        <div class="min-w-0">
          <div class="truncate">You</div>
          <div class="text-white/60">Online</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import avatarDefault from '@/assets/avatars/default.png' // ✅ Vite-resolved asset

// Active route helper
const route = useRoute()
const isActive = (p: string) => route.path.startsWith(p)

// Avatar (with safe fallback)
const avatarSrc = ref<string>(avatarDefault)
function onImgErr(e: Event) {
  const img = e.target as HTMLImageElement | null
  if (img && img.src !== avatarDefault) img.src = avatarDefault
}

// Links
const links = [
  { name: 'Dashboard',     path: '/dashboard',     icon: '🏠' },
  { name: 'Autoresponder', path: '/autoresponder', icon: '🤖' },
  { name: 'Analytics',     path: '/analytics',     icon: '📊' },
  { name: 'Billing',       path: '/billing',       icon: '💳' },
  { name: 'Settings',      path: '/settings',      icon: '⚙️' },
] as const
</script>

<style scoped>
:host, a { -webkit-tap-highlight-color: transparent }
</style>
