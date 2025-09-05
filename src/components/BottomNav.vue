<!-- BottomNav.vue — mobile-first, safe-area aware, with FAB + badges + a11y -->
<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-50 backdrop-blur-md
           bg-white/90 dark:bg-black/70 border-t border-gray-200 dark:border-gray-700"
    :style="{
      paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 8px)`
    }"
    role="tablist"
    aria-label="Primary navigation"
  >
    <!-- bar -->
    <div
      class="relative mx-auto max-w-screen-sm px-2"
      :style="{ '--count': String(items.length), '--idx': String(activeIndex) }"
    >
      <!-- indicator -->
      <span
        class="pointer-events-none absolute -top-0.5 left-0 h-0.5
               bg-yellow-500/90 rounded-full transition-all duration-300"
        :style="{
          width: `calc(100% / var(--count))`,
          transform: `translateX(calc(var(--idx) * 100%))`
        }"
        aria-hidden="true"
      />

      <!-- nav buttons -->
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }">
        <button
          v-for="(item, i) in items"
          :key="item.name"
          :role="'tab'"
          :aria-selected="route.path === item.path"
          class="relative py-2 pt-3 flex flex-col items-center justify-center gap-1
                 text-[11px] sm:text-xs select-none
                 text-gray-600 dark:text-gray-300
                 transition-colors focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2
                 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
          :class="route.path === item.path ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'hover:text-yellow-500'"
          @click="go(item)"
          @keydown.enter.space.prevent="go(item)"
        >
          <!-- icon -->
          <span class="text-xl leading-none" aria-hidden="true">{{ item.icon }}</span>
          <!-- label -->
          <span class="truncate">{{ item.name }}</span>

          <!-- badge (optional) -->
          <span
            v-if="item.badge && item.badge > 0"
            class="absolute top-1.5 right-5 min-w-[18px] h-[18px] px-1
                   rounded-full text-[10px] font-bold
                   bg-red-500 text-white flex items-center justify-center shadow"
            aria-label="notifications"
          >
            {{ item.badge > 99 ? '99+' : item.badge }}
          </span>
        </button>
      </div>
    </div>

    <!-- Center FAB for Live (if present) -->
    <button
      v-if="liveItem"
      class="absolute -top-6 left-1/2 -translate-x-1/2
             w-14 h-14 rounded-full shadow-xl
             bg-gradient-to-tr from-yellow-400 to-amber-500
             text-black text-2xl flex items-center justify-center
             active:scale-95 transition"
      :aria-label="`Open ${liveItem.name}`"
      @click="go(liveItem, true)"
    >
      {{ liveItem.icon }}
      <span class="sr-only">{{ liveItem.name }}</span>

      <!-- subtle pulse -->
      <span
        class="absolute inset-0 rounded-full animate-ping bg-amber-400/30"
        aria-hidden="true"
      />
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// You can also pass items as a prop; here we keep sensible defaults.
const props = defineProps({
  navItems: {
    type: Array,
    default: () => ([
      { name: 'Home',   icon: '🏠', path: '/dashboard/user' },
      { name: 'Live',   icon: '📺', path: '/live-stream' },
      { name: 'Gifts',  icon: '🎁', path: '/gifts',  badge: 0 },
      { name: 'Profile',icon: '👤', path: '/profile' }
    ])
  }
})

const items = computed(() => props.navItems)
const liveItem = computed(() => items.value.find(i => i.path === '/live-stream'))

const activeIndex = computed(() => {
  const idx = items.value.findIndex(i => route.path.startsWith(i.path))
  return idx >= 0 ? idx : 0
})

function go(item, isFab = false) {
  // light haptic feedback on supported devices
  try { navigator?.vibrate?.(isFab ? 20 : 10) } catch {}
  if (route.path !== item.path) {
    router.push(item.path)
  } else {
    // already on the route: optionally scroll to top or emit event
    window?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }
}
</script>

<style scoped>
/* subtle top shadow of the bar */
nav { box-shadow: 0 -6px 20px rgba(0,0,0,.08); }

/* ensure the indicator aligns with grid cells */
span[aria-hidden="true"] { will-change: transform, width; }
</style>
