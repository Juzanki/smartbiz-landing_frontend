<!-- SmartNav.vue -->
<template>
  <!-- MOBILE: Top bar with menu button -->
  <header class="md:hidden fixed top-0 inset-x-0 z-50 h-14 bg-[#0b1220]/90 backdrop-blur border-b border-white/10 flex items-center px-4">
    <button
      class="h-9 w-9 grid place-items-center rounded-lg bg-white/10 border border-white/15 active:scale-95 transition"
      aria-label="Open navigation"
      @click="open = true"
    >
      ☰
    </button>
    <div class="ml-3 font-bold text-white">SmartBiz</div>
  </header>

  <!-- MOBILE: Off-canvas drawer -->
  <div
    v-if="open"
    class="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
    @click.self="close"
    @keydown.esc="close"
  >
    <aside
      ref="drawer"
      class="absolute inset-y-0 left-0 w-[82vw] max-w-[320px] bg-[#0b1220] text-white shadow-2xl border-r border-white/10
             flex flex-col animate-slide-in"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation menu"
    >
      <!-- Brand -->
      <div class="h-14 px-4 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">🚀</span>
          <span class="font-semibold">SmartBiz</span>
        </div>
        <button
          class="h-9 w-9 grid place-items-center rounded-lg bg-white/10 border border-white/15 active:scale-95"
          aria-label="Close navigation"
          @click="close"
        >
          ✕
        </button>
      </div>

      <!-- Links -->
      <nav class="flex-1 overflow-y-auto py-3">
        <RouterLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.path"
          class="flex items-center gap-3 px-4 py-3 text-sm rounded-lg mx-2 my-1
                 hover:bg-white/10 border border-transparent hover:border-white/10 transition"
          :class="isActive(link.path) ? 'bg-indigo-600/20 border-indigo-500/30 text-white' : 'text-white/80'"
          @click="close"
        >
          <span class="text-lg">{{ link.icon }}</span>
          <span class="truncate">{{ link.name }}</span>

          <!-- Optional badge -->
          <span
            v-if="link.badge"
            class="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-rose-500/90"
          >
            {{ link.badge }}
          </span>
        </RouterLink>
      </nav>

      <!-- Footer -->
      <div class="p-3 border-t border-white/10 text-[12px] text-white/70">
        <div class="flex items-center justify-between">
          <span>v{{ version }}</span>
          <RouterLink to="/settings" class="underline hover:text-white">Settings</RouterLink>
        </div>
        <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
      </div>
    </aside>
  </div>

  <!-- DESKTOP/TABLET: Persistent sidebar -->
  <aside
    class="hidden md:flex fixed inset-y-0 left-0 w-64 bg-[#0b1220] text-white p-4 border-r border-white/10 z-40"
    role="navigation"
    aria-label="Sidebar"
  >
    <div class="w-full flex flex-col">
      <!-- Brand -->
      <div class="text-xl font-bold mb-6 flex items-center gap-2">
        <span>🚀</span> <span>SmartBiz</span>
      </div>

      <!-- Links -->
      <nav class="space-y-1">
        <RouterLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.path"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-white/10 border border-transparent hover:border-white/10 transition"
          :class="isActive(link.path) ? 'bg-indigo-600/20 border-indigo-500/30 text-white' : 'text-white/80'"
        >
          <span class="text-lg">{{ link.icon }}</span>
          <span class="truncate">{{ link.name }}</span>
          <span
            v-if="link.badge"
            class="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-rose-500/90"
          >
            {{ link.badge }}
          </span>
        </RouterLink>
      </nav>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Mini profile / status -->
      <div class="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-[12px]">
        <div class="flex items-center gap-2">
          <img src="/avatars/default.png" alt="You" class="w-7 h-7 rounded-full border border-white/20" />
          <div class="min-w-0">
            <div class="truncate">You</div>
            <div class="text-white/60">Online</div>
          </div>
        </div>
      </div>
    </div>
  </aside>

  <!-- MOBILE: Bottom tab bar -->
  <nav
    class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b1220]/95 backdrop-blur border-t border-white/10
           grid grid-cols-5"
    aria-label="Bottom navigation"
  >
    <RouterLink
      v-for="link in bottomLinks"
      :key="link.name"
      :to="link.path"
      class="flex flex-col items-center justify-center py-2 text-[11px]"
      :class="isActive(link.path) ? 'text-white' : 'text-white/60'"
    >
      <span class="text-xl leading-none">{{ link.icon }}</span>
      <span class="mt-0.5">{{ link.short || link.name }}</span>
    </RouterLink>
    <div class="h-[max(env(safe-area-inset-bottom),0px)] col-span-5"></div>
  </nav>

  <!-- Page content offset (so content isn't hidden under bars) -->
  <div class="md:pl-64 pt-14 md:pt-0"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const version = '1.0.0'
const open = ref(false)
const drawer = ref(null)
const route = useRoute()

const navLinks = [
  { name: 'Dashboard',     path: '/dashboard',     icon: '🏠' },
  { name: 'Autoresponder', path: '/autoresponder', icon: '🤖' },
  { name: 'Analytics',     path: '/analytics',     icon: '📊' },
  { name: 'Billing',       path: '/billing',       icon: '💳' },
  { name: 'Settings',      path: '/settings',      icon: '⚙️' }
]

// Compact set for the bottom tab bar (mobile)
const bottomLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: '🏠', short: 'Home' },
  { name: 'Auto',      path: '/autoresponder', icon: '🤖' },
  { name: 'Go Live',   path: '/live', icon: '🎬', short: 'Live' },
  { name: 'Stats',     path: '/analytics', icon: '📊' },
  { name: 'Wallet',    path: '/billing', icon: '💳' }
]

const isActive = (p) => route.path.startsWith(p)

// accessibility: close on ESC globally when drawer open
function onKey(e){ if (open.value && e.key === 'Escape') close() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

function close(){
  open.value = false
  try{ navigator?.vibrate?.(6) }catch{}
}
</script>

<style scoped>
@keyframes slideIn {
  from { transform: translateX(-12px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
.animate-slide-in { animation: slideIn .18s ease-out both; }

/* Prevent tap highlight on iOS */
:host, button, a { -webkit-tap-highlight-color: transparent; }
</style>
