<!-- src/layouts/DashboardLayout.vue -->
<template>
  <div class="dashboard-root bg-[var(--bg-color)] text-[var(--text-color)] min-h-[100dvh]">
    <!-- Top bar (mobile-first) -->
    <header
      class="sticky top-0 z-40 flex items-center gap-2 px-3 py-2 sm:py-3 border-b border-black/5 dark:border-white/10
             bg-white/90 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm"
    >
      <!-- Hamburger (mobile) -->
      <button
        class="icon-btn md:hidden"
        :aria-expanded="drawerOpen ? 'true' : 'false'"
        aria-controls="sb-drawer"
        aria-label="Open sidebar"
        @click="openDrawer"
      >☰</button>

      <!-- Brand -->
      <div class="flex items-center gap-2 min-w-0">
        <img :src="logoUrl" alt="SmartBiz" class="w-8 h-8 rounded-full ring-1 ring-black/5 dark:ring-white/10" />
        <div class="flex flex-col leading-tight min-w-0">
          <span class="font-extrabold tracking-tight text-slate-900 dark:text-white truncate">SmartBiz Assistance</span>
          <span class="hidden sm:block text-[11px] text-black/50 dark:text-white/50 truncate">Real people. Real business.</span>
        </div>
      </div>

      <!-- Ticker (auto-scroll, non-intrusive) -->
      <div class="flex-1 min-w-0 mx-2 overflow-hidden">
        <div v-if="announcements?.length" class="ticker" aria-label="Announcements">
          <div class="ticker__track" :style="{ animationDuration: tickerSpeed + 's' }">
            <span v-for="(msg, i) in loopedAnnouncements" :key="i" class="ticker__item">
              • {{ msg }}
            </span>
          </div>
        </div>
      </div>

      <!-- LIVE + likes + quick actions -->
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <span
          v-if="showLive"
          class="inline-flex items-center gap-1 text-[11px] sm:text-xs px-2 py-1 rounded-full
                 bg-red-500/10 text-red-600 dark:text-red-400"
        >
          <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          LIVE {{ likesText }}
        </span>

        <!-- Compact actions (mobile friendly) -->
        <details class="relative">
          <summary class="icon-btn !h-8 !w-8 list-none cursor-pointer" title="More">
            ⋯
          </summary>
          <div
            class="absolute right-0 mt-2 w-44 rounded-xl border border-black/10 dark:border-white/10
                   bg-white/95 dark:bg-gray-900/95 shadow-lg p-2 backdrop-blur"
          >
            <button class="menu-item" @click="$emit('explore')">🔎 Explore</button>
            <button class="menu-item" @click="$emit('featured')">⭐ Featured</button>
            <button class="menu-item" @click="$emit('top-fans')">🏆 Top Fans</button>
          </div>
        </details>

        <!-- extra actions from parent when available -->
        <slot name="header-actions" />
      </div>
    </header>

    <div class="flex min-h-[calc(100dvh-var(--topbar-h,56px))]">
      <!-- Off-canvas overlay (mobile) -->
      <div
        v-if="isMobile && drawerOpen"
        class="fixed inset-0 z-30 bg-black/45 md:hidden"
        @click="closeDrawer"
      />

      <!-- Sidebar -->
      <aside
        id="sb-drawer"
        :class="[
          'sb base-panel',
          isMobile
            ? (drawerOpen ? 'translate-x-0' : '-translate-x-full')
            : (collapsedDesktop ? 'w-16' : 'w-64')
        ]"
        :aria-hidden="isMobile ? String(!drawerOpen) : 'false'"
        :role="isMobile ? 'dialog' : undefined"
        :tabindex="isMobile && drawerOpen ? 0 : undefined"
        ref="drawerRef"
        @keydown.esc.prevent="isMobile ? closeDrawer() : null"
      >
        <!-- Sidebar header -->
        <div class="flex items-center justify-between mb-4">
          <h2 v-if="!isMobile && !collapsedDesktop" class="text-lg font-bold">SmartBiz</h2>

          <!-- Desktop collapse toggle -->
          <button
            class="icon-btn hidden md:grid"
            :title="collapsedDesktop ? 'Expand' : 'Collapse'"
            @click="toggleDesktop"
          >{{ collapsedDesktop ? '☰' : '×' }}</button>

          <!-- Mobile close -->
          <button
            v-if="isMobile"
            class="icon-btn md:hidden"
            aria-label="Close sidebar"
            @click="closeDrawer"
          >×</button>
        </div>

        <!-- Navigation -->
        <nav class="flex flex-col gap-1 text-sm" ref="navRef">
          <RouterLink
            to="/dashboard"
            class="navlink"
            :class="linkClass('/dashboard')"
          >
            <span class="nl-icon">📊</span>
            <span v-if="!collapsedDesktop || isMobile" class="nl-label">{{ $t('dashboard') }}</span>
          </RouterLink>

          <RouterLink
            v-if="role === 'admin'"
            to="/admin"
            class="navlink"
            :class="linkClass('/admin')"
          >
            <span class="nl-icon">👥</span>
            <span v-if="!collapsedDesktop || isMobile" class="nl-label">{{ $t('users') }}</span>
          </RouterLink>

          <RouterLink
            v-if="role === 'owner'"
            to="/owner"
            class="navlink"
            :class="linkClass('/owner')"
          >
            <span class="nl-icon">⚙️</span>
            <span v-if="!collapsedDesktop || isMobile" class="nl-label">{{ $t('settings') }}</span>
          </RouterLink>

          <button class="navlink text-rose-600 hover:text-rose-500" @click="logout">
            <span class="nl-icon">🔓</span>
            <span v-if="!collapsedDesktop || isMobile" class="nl-label">{{ $t('logout') }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main content -->
      <main
        class="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white p-4 sm:p-6 overflow-y-auto"
        @click="isMobile && drawerOpen ? closeDrawer() : null"
      >
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import logoUrl from '@/assets/logo.svg' // ✅ avoid /assets/... runtime error

/* ---------- Props (for live/ticker) ---------- */
const props = withDefaults(defineProps<{
  likes?: number
  showLive?: boolean
  announcements?: string[]
  tickerSpeed?: number // seconds per loop
}>(), {
  likes: 0,
  showLive: true,
  announcements: () => [
    'Welcome to SmartBiz Assistance',
    'Grow your business with AI • Real people. Real business.',
    'Tip: Visit Featured to see trending streams',
  ],
  tickerSpeed: 18,
})

/* ---------- Responsive state ---------- */
const MOBILE_BP = 768
const isMobile = ref(window.innerWidth < MOBILE_BP)
const drawerOpen = ref(false)
const drawerRef = ref<HTMLElement|null>(null)
const navRef = ref<HTMLElement|null>(null)

/* Persisted desktop collapse */
const COLLAPSE_KEY = 'sb_sidebar_collapsed'
const collapsedDesktop = ref(localStorage.getItem(COLLAPSE_KEY) === '1')

function handleResize() {
  isMobile.value = window.innerWidth < MOBILE_BP
  if (!isMobile.value) drawerOpen.value = false
}
function toggleDesktop(){
  collapsedDesktop.value = !collapsedDesktop.value
  localStorage.setItem(COLLAPSE_KEY, collapsedDesktop.value ? '1' : '0')
}

/* ---------- Role & routing ---------- */
const role = computed(() => localStorage.getItem('user_role') || '')
const route = useRoute()
function linkClass(path: string) {
  const active = route.path.startsWith(path)
  return active ? 'is-active' : ''
}
watch(() => route.fullPath, () => { if (isMobile.value) closeDrawer() })

/* ---------- Drawer controls (mobile) ---------- */
function openDrawer(){ drawerOpen.value = true; trapFocus(true); lockScroll(true) }
function closeDrawer(){ drawerOpen.value = false; trapFocus(false); lockScroll(false) }

/* Focus trap (simple) */
let lastFocused: HTMLElement | null = null
function trapFocus(enable: boolean){
  if (!isMobile.value) return
  if (enable) {
    lastFocused = document.activeElement as HTMLElement
    setTimeout(() => {
      const first = drawerRef.value?.querySelector<HTMLElement>('button, a, [tabindex]:not([tabindex="-1"])')
      first?.focus?.()
    }, 0)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
    lastFocused?.focus?.()
  }
}
function onKeydown(e: KeyboardEvent){
  if (e.key !== 'Tab') return
  const focusables = drawerRef.value?.querySelectorAll<HTMLElement>('button, a, [tabindex]:not([tabindex="-1"])')
  if (!focusables || focusables.length === 0) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); (last as HTMLElement).focus() }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); (first as HTMLElement).focus() }
}

/* Scroll lock when drawer open */
function lockScroll(v: boolean){
  const el = document.documentElement
  if (v) el.classList.add('overflow-hidden', 'md:overflow-visible')
  else el.classList.remove('overflow-hidden', 'md:overflow-visible')
}

/* ---------- Swipe-to-open (edge swipe) ---------- */
let touchX = 0, tracking = false
function onTouchStart(e: TouchEvent){
  const x = e.touches[0].clientX
  tracking = x < 24 && isMobile.value && !drawerOpen.value
  touchX = x
}
function onTouchMove(e: TouchEvent){
  if (!tracking) return
  const dx = e.touches[0].clientX - touchX
  if (dx > 36) { openDrawer(); tracking = false }
}
function onTouchEnd(){ tracking = false }

/* ---------- LIVE likes formatter ---------- */
const likesText = computed(() => formatCount(props.likes))
function formatCount(n: number){
  if (n < 1000) return String(n)
  const units = ['k','M','B','T']
  let u = -1; let num = n
  while (num >= 1000 && u < units.length - 1) { num /= 1000; u++ }
  const decimals = num < 10 ? 1 : 0
  return `${parseFloat(num.toFixed(decimals))}${units[u]}`
}

/* ---------- Ticker helpers ---------- */
const announcements = computed(() => props.announcements)
const tickerSpeed = computed(() => props.tickerSpeed)
const loopedAnnouncements = computed(() => [...announcements.value, ...announcements.value])

/* ---------- Lifecycle ---------- */
onMounted(() => {
  // expose topbar height for sticky sidebar math
  const header = document.querySelector('header')
  if (header) document.documentElement.style.setProperty('--topbar-h', `${(header as HTMLElement).offsetHeight}px`)

  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
})

/* ---------- Logout ---------- */
function logout(){
  localStorage.clear()
  window.location.assign('/login')
}
</script>

<style scoped>
/* Root */
.dashboard-root { transition: background .2s ease, color .2s ease; }

/* Panel base */
.base-panel{
  background: #fff; color:#0f172a;
  border-right: 1px solid rgba(0,0,0,.06);
  padding: 1rem;
  min-height: calc(100svh - var(--topbar-h,56px));
}
:global(.dark) .base-panel{
  background: #0f172a; color:#fff; border-color: rgba(255,255,255,.08);
}

/* Sidebar sizing & transitions */
.sb{
  position: fixed; inset: auto auto 0 0; top: var(--topbar-h,56px);
  width: 16rem; z-index: 40;
  transform: translateX(-100%);
  transition: transform .22s ease, width .18s ease;
}
@media (min-width: 768px){
  .sb{ position: sticky; top: 0; inset: 0 auto auto 0; transform: none; z-index: 10; min-height: 100svh; }
}

/* Icon button + menu items */
.icon-btn{
  height: 2rem; width: 2rem; border-radius: .75rem;
  display:grid; place-items:center;
  background: rgba(0,0,0,.06); color: inherit; border: 1px solid rgba(0,0,0,.06);
}
:global(.dark) .icon-btn{ background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.1); }
.icon-btn:active{ transform: scale(.97) }
.menu-item{
  display:block; width:100%; text-align:left; padding:.5rem .6rem; border-radius:.6rem;
}
.menu-item:hover{ background: rgba(0,0,0,.05); }
:global(.dark) .menu-item:hover{ background: rgba(255,255,255,.06); }

/* Nav links */
.navlink{
  display:flex; align-items:center; gap:.75rem;
  padding:.55rem .6rem; border-radius:.75rem;
  transition: background .15s ease, color .15s ease; color: inherit;
}
.navlink:hover{ background: rgba(0,0,0,.05); }
:global(.dark) .navlink:hover{ background: rgba(255,255,255,.06); }
.is-active{ background: rgba(59,130,246,.12); color:#1d4ed8; }
:global(.dark) .is-active{ background: rgba(59,130,246,.16); color:#93c5fd; }
.nl-icon{ width: 1.25rem; text-align:center; }
.nl-label{ white-space: nowrap; }

/* Ticker: smooth horizontal scroll, single line */
.ticker{
  position: relative; height: 1.25rem; line-height: 1.25rem;
  mask-image: linear-gradient(to right, transparent 0, black 10%, black 90%, transparent 100%);
}
.ticker__track{
  display: inline-flex; gap: 1.25rem; white-space: nowrap;
  will-change: transform; animation: ticker-move linear infinite;
}
.ticker__item{ font-size: 12px; color: rgba(0,0,0,.6); }
:global(.dark) .ticker__item{ color: rgba(255,255,255,.6); }
@keyframes ticker-move {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); } /* because we doubled items */
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .sb{ transition: none; }
  .ticker__track{ animation: none; }
}
</style>
