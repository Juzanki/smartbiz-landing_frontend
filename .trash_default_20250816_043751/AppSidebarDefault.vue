<!-- SmartIconRail.vue -->
<template>
  <!-- MOBILE: Bottom Tab Bar (mobile-first) -->
  <nav
    class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0b1220]/95 backdrop-blur border-t border-white/10 grid grid-cols-5"
    aria-label="Bottom navigation"
  >
    <RouterLink
      v-for="link in bottomLinks"
      :key="link.name"
      :to="link.path"
      class="flex flex-col items-center justify-center py-2 text-[11px] relative group"
      :class="isActive(link.path) ? 'text-white' : 'text-white/60'"
      @click="haptic(8)"
    >
      <span class="text-xl leading-none">{{ link.icon }}</span>
      <span class="mt-0.5">{{ link.short || link.name }}</span>

      <!-- Active pill -->
      <span
        v-if="isActive(link.path)"
        class="absolute -top-1 h-1 w-8 rounded-full bg-indigo-500/90"
      />

      <!-- Badge -->
      <span
        v-if="link.badge"
        class="absolute top-1 right-4 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow"
      >{{ link.badge }}</span>
    </RouterLink>

    <!-- iOS Safe Area -->
    <div class="h-[max(env(safe-area-inset-bottom),0px)] col-span-5"></div>
  </nav>

  <!-- DESKTOP/TABLET: Icon-Only Side Rail -->
  <aside
    class="hidden md:flex fixed inset-y-0 left-0 w-20 bg-gradient-to-b from-[#0b1220] to-[#0e1630] text-white p-4 shadow-xl border-r border-white/10 z-40 flex-col items-center"
    role="navigation"
    aria-label="Sidebar"
  >
    <!-- Logo -->
    <RouterLink to="/dashboard" class="mb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-full">
      <img
        src="@/assets/logo-circle.png"
        alt="SmartBiz Logo"
        class="w-12 h-12 rounded-full shadow border-2 border-yellow-400 bg-white object-contain"
      />
    </RouterLink>

    <!-- Nav Icons -->
    <nav class="flex flex-col items-center space-y-5 w-full">
      <RouterLink
        v-for="link in navLinks"
        :key="link.name"
        :to="link.path"
        class="relative grid place-items-center h-12 w-12 rounded-xl transition border border-transparent
               text-2xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        :class="isActive(link.path)
          ? 'bg-white/10 border-indigo-400/30 text-white'
          : 'hover:bg-white/10 hover:border-white/15 text-white/80'"
        @click="haptic(10)"
        :aria-current="isActive(link.path) ? 'page' : null"
      >
        <span>{{ link.icon }}</span>

        <!-- Tooltip (hover/focus) -->
        <span
          class="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap
                 rounded-lg bg-black/90 text-white text-xs px-2 py-1 opacity-0 translate-x-2
                 shadow-lg border border-white/10 transition group-hover:opacity-100 group-hover:translate-x-0
                 group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
          role="tooltip"
        >
          {{ link.name }}
        </span>

        <!-- Active indicator bar -->
        <span
          v-if="isActive(link.path)"
          class="absolute -right-2 h-6 w-1.5 rounded-full bg-gradient-to-b from-indigo-400 to-cyan-400 shadow-md"
        />

        <!-- Badge -->
        <span
          v-if="link.badge"
          class="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow"
        >{{ link.badge }}</span>
      </RouterLink>
    </nav>

    <!-- Back button at bottom -->
    <button
      class="mt-auto pt-6 text-2xl hover:text-yellow-400 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg"
      @click="goBack"
      aria-label="Go back"
    >
      ‹
    </button>
  </aside>

  <!-- CONTENT OFFSET (so page content isn't hidden under bars) -->
  <div class="md:pl-20 pb-14 md:pb-0"></div>
</template>

<script setup>
import { useRoute, useRouter, RouterLink } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Desktop / tablet rail
const navLinks = [
  { name: 'Workspace',     path: '/dashboard',     icon: '🏠' },
  { name: 'Autoresponder', path: '/autoresponder', icon: '🤖', badge: null },
  { name: 'Analytics',     path: '/analytics',     icon: '📊' },
  { name: 'Billing',       path: '/billing',       icon: '💳' },
  { name: 'Settings',      path: '/settings',      icon: '⚙️' }
]

// Mobile bottom bar (can be a subset/specialized order)
const bottomLinks = [
  { name: 'Workspace', path: '/dashboard',     icon: '🏠', short: 'Home' },
  { name: 'Auto',      path: '/autoresponder', icon: '🤖' },
  { name: 'Live',      path: '/live',          icon: '🎬' },
  { name: 'Stats',     path: '/analytics',     icon: '📊' },
  { name: 'Wallet',    path: '/billing',       icon: '💳', badge: null }
]

const isActive = (p) => route.path === p || route.path.startsWith(p + '/')

function goBack(){
  try { navigator?.vibrate?.(6) } catch {}
  router.back()
}
function haptic(ms=8){ try{ navigator?.vibrate?.(ms) }catch{} }
</script>

<style scoped>
/* Subtle slide-in for tooltips / items is handled via tailwind transitions */

/* Prevent iOS tap highlight */
:host, button, a { -webkit-tap-highlight-color: transparent; }
</style>
