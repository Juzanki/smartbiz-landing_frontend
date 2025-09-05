<!-- src/layouts/SmartBizShell.vue -->
<template>
  <!-- A11y: Skip to content -->
  <a href="#main" class="skip">Skip to content</a>

  <div
    :class="rootClasses"
    :data-theme="effectiveTheme"
  >
    <!-- 🔝 Navbar -->
    <header
      class="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/70 backdrop-blur-sm border-b border-black/5 dark:border-white/10"
      :class="scrolled ? 'shadow-sm' : ''"
    >
      <div class="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <!-- Logo + App Name -->
        <div class="flex items-center gap-3">
          <img src="/assets/logo.svg" alt="SmartBiz" class="w-10 h-10 rounded" />
          <span class="text-lg sm:text-xl font-extrabold text-blue-900 dark:text-white tracking-tight">
            SmartBiz
          </span>
        </div>

        <!-- Right controls -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Install chip (PWA) -->
          <button
            v-if="canInstall"
            class="chip hidden xs:flex"
            @click="installApp"
            aria-label="Install App"
            title="Install App"
          >⤵️ Install</button>

          <!-- Lang & Theme Switcher -->
          <Suspense>
            <div class="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeSelector />
            </div>
            <template #fallback>
              <div class="skeleton w-24 h-8 rounded-lg" />
            </template>
          </Suspense>

          <!-- Mobile menu (slot, optional) -->
          <button
            v-if="$slots.menu"
            class="icon-btn"
            :aria-expanded="menuOpen ? 'true' : 'false'"
            aria-controls="mobile-menu"
            @click="menuOpen = !menuOpen"
          >☰</button>
        </div>
      </div>

      <!-- Mobile dropdown menu (optional) -->
      <nav
        v-if="menuOpen && $slots.menu"
        id="mobile-menu"
        class="sm:hidden border-t border-black/5 dark:border-white/10 bg-white dark:bg-gray-900"
      >
        <div class="px-4 py-2">
          <slot name="menu" />
        </div>
      </nav>
    </header>

    <!-- 🌐 Connectivity banner -->
    <div
      v-if="!online"
      class="mx-4 mt-3 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm"
    >
      You’re offline — some features may be limited. ({{ netLabel }})
    </div>

    <!-- 🌐 Main Content -->
    <main id="main" class="min-h-screen px-4 sm:px-6 py-6 sm:py-10 max-w-6xl mx-auto">
      <slot />
    </main>

    <!-- 🔻 Footer -->
    <footer class="text-center text-gray-500 text-sm py-safe dark:text-gray-400">
      © {{ year }} SmartBiz Assistance — All rights reserved
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import ThemeSelector from '@/components/ThemeSelector.vue'

/* ------------------ Theme (system/dark/light) ------------------ */
const THEME_KEY = 'theme' // expected values: 'light' | 'dark' | 'system'
const theme = ref(localStorage.getItem(THEME_KEY) || 'system')
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')

const effectiveTheme = computed(() =>
  theme.value === 'system' ? (prefersDark?.matches ? 'dark' : 'light') : theme.value
)

function applyTheme() {
  // Tailwind dark mode via class on <html>, plus data-theme for CSS vars
  const html = document.documentElement
  html.dataset.theme = effectiveTheme.value
  html.classList.toggle('dark', effectiveTheme.value === 'dark')
}
watch(effectiveTheme, applyTheme)

/* Persist + cross-tab sync */
window.addEventListener('storage', (e) => {
  if (e.key === THEME_KEY && e.newValue) theme.value = e.newValue
})
prefersDark?.addEventListener?.('change', () => {
  if (theme.value === 'system') applyTheme()
})

/* ------------------ PWA install chip ------------------ */
let deferredPrompt = null
const canInstall = ref(false)
function installApp() {
  try { deferredPrompt?.prompt?.() } catch {}
  canInstall.value = false
}

/* ------------------ Connectivity + header behavior ------------------ */
const online = ref(navigator.onLine)
const netLabel = computed(() => (navigator.connection?.effectiveType || 'online').toUpperCase())
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

const scrolled = ref(false)
function onScroll(){ scrolled.value = window.scrollY > 4 }

/* ------------------ Mobile menu ------------------ */
const menuOpen = ref(false)

/* ------------------ Year ------------------ */
const year = new Date().getFullYear()

/* ------------------ Lifecycle ------------------ */
onMounted(() => {
  applyTheme()

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = true
  })

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  window.removeEventListener('scroll', onScroll)
})

/* ------------------ Root classes ------------------ */
const rootClasses = computed(() => [
  'min-h-screen',
  effectiveTheme.value === 'dark' ? 'theme-dark dark' : 'theme-light',
  'bg-[var(--bg-color)] text-[var(--text-color)] transition-colors duration-200 ease-in-out'
])
</script>

<style scoped>
/* Skip link */
.skip {
  position: absolute; left: -9999px; top: auto; width: 1px; height: 1px; overflow: hidden;
}
.skip:focus {
  left: 1rem; top: 1rem; width: auto; height: auto; z-index: 50;
  background: #111827; color: #fff; padding: .5rem .75rem; border-radius: .5rem;
}

/* Chips & buttons */
.chip {
  display: inline-flex; align-items: center; gap: .35rem;
  height: 2rem; padding: 0 .65rem; border-radius: 9999px;
  background: rgba(255,255,255,.18); color: #fff; font-size: 12px; font-weight: 600;
  border: 1px solid rgba(255,255,255,.22);
  backdrop-filter: saturate(120%) blur(6px);
}
.icon-btn {
  height: 2.25rem; width: 2.25rem; border-radius: .75rem;
  display: grid; place-items: center;
  background: rgba(0,0,0,.06); color: inherit; border: 1px solid rgba(0,0,0,.06);
}
.dark .icon-btn { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.08); }

/* Skeleton for switchers fallback */
.skeleton {
  background: linear-gradient(90deg, rgba(0,0,0,.08), rgba(0,0,0,.04), rgba(0,0,0,.08));
  background-size: 200% 100%; animation: shimmer 1.1s linear infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

/* Theme tokens (mobile-first) */
.theme-light {
  --bg-color: #ffffff;
  --text-color: #0f172a;
}
.theme-dark {
  --bg-color: #0d1117;
  --text-color: #e5e7eb;
}

/* Safe-area helpers for phones with notches */
@supports(padding: max(0px)) {
  .py-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  :global(html) { scroll-behavior: auto; }
}
</style>
