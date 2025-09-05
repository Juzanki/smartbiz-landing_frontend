<!-- 📁 src/components/AppNavPro.vue -->
<template>
  <!-- Skip to content (A11y) -->
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 bg-yellow-300 text-black px-3 py-1 rounded">
    Skip to content
  </a>

  <nav
    class="fixed top-0 inset-x-0 z-[100] transition-all"
    :class="[
      'backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-[#0b1020]/60',
      compact ? 'py-1' : 'py-2',
      'border-b border-black/10 dark:border-white/10'
    ]"
    :style="safeAreaTop"
    role="navigation"
    aria-label="Primary"
  >
    <!-- Offline pill -->
    <transition name="fade">
      <div v-if="!online" class="mx-auto max-w-6xl px-3">
        <div class="mb-1 text-[11px] rounded-full px-2 py-0.5 bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-400/40 w-max">
          ⚠️ You’re offline — some features may be limited
        </div>
      </div>
    </transition>

    <div class="mx-auto max-w-6xl px-3 flex items-center justify-between gap-3">
      <!-- Left: Brand -->
      <div class="flex items-center gap-2 min-w-0">
        <router-link to="/" class="flex items-center gap-2 group">
          <img
            :src="logoSrc"
            alt="SmartBiz Logo"
            class="h-8 w-8 rounded-md ring-1 ring-black/10 dark:ring-white/10 object-cover"
          />
          <span class="font-extrabold tracking-tight text-blue-900 dark:text-white truncate">
            SmartBiz
          </span>
        </router-link>
      </div>

      <!-- Center: Desktop links -->
      <ul class="hidden md:flex items-center gap-4 text-sm">
        <li v-for="(l,i) in links" :key="i">
          <router-link
            :to="l.to"
            class="px-2 py-1 rounded hover:text-yellow-500 transition"
            :class="isActive(l.to) ? 'text-yellow-400 font-semibold' : 'text-slate-700 dark:text-slate-200'"
          >
            {{ l.label }}
          </router-link>
        </li>
      </ul>

      <!-- Right: Actions -->
      <div class="flex items-center gap-1">
        <!-- Search toggle -->
        <button
          class="icon-btn"
          :aria-pressed="showSearch"
          aria-label="Search"
          @click="toggleSearch"
          title="Search"
        >
          <i class="i-tabler-search text-lg"></i>
        </button>

        <!-- Language -->
        <div class="relative">
          <button class="icon-btn w-10" aria-haspopup="listbox" :aria-expanded="openLang" @click="openLang = !openLang" title="Language">
            <span class="text-[11px] font-semibold">{{ locale.toUpperCase() }}</span>
          </button>
          <transition name="fade">
            <div v-if="openLang" class="abs-menu right-0 w-32">
              <button v-for="c in ['en','sw']" :key="c" class="menu-item" @click="setLocale(c)">
                {{ c==='en' ? 'English' : 'Kiswahili' }}
                <span v-if="locale===c">✔</span>
              </button>
            </div>
          </transition>
        </div>

        <!-- Theme -->
        <button class="icon-btn" aria-label="Toggle theme" @click="toggleTheme" :title="theme==='dark' ? 'Light' : 'Dark'">
          <i :class="theme==='dark' ? 'i-tabler-sun' : 'i-tabler-moon'"></i>
        </button>

        <!-- Notifications (dot demo) -->
        <router-link to="/notifications" class="icon-btn relative" aria-label="Notifications">
          <i class="i-tabler-bell"></i>
          <span v-if="unread > 0" class="dot" />
        </router-link>

        <!-- Auth / Avatar -->
        <template v-if="loggedIn">
          <div class="relative">
            <button class="icon-btn px-1" @click="openUser = !openUser" aria-haspopup="menu" :aria-expanded="openUser">
              <img :src="user.avatar" alt="" class="h-8 w-8 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10" />
            </button>
            <transition name="fade">
              <div v-if="openUser" class="abs-menu right-0 w-44">
                <div class="px-3 py-2 text-[12px] text-slate-600 dark:text-slate-300 truncate">@{{ user.username }}</div>
                <router-link to="/dashboard" class="menu-item">Dashboard</router-link>
                <router-link to="/profile" class="menu-item">Profile</router-link>
                <button class="menu-item" @click="$emit('settings')">Settings</button>
                <div class="h-px bg-white/10 my-1"></div>
                <button class="menu-item text-rose-400" @click="$emit('logout')">Logout</button>
              </div>
            </transition>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="btn-ghost hidden sm:inline-flex">Login</router-link>
          <router-link to="/signup" class="btn-cta hidden sm:inline-flex">Sign Up</router-link>
        </template>

        <!-- PWA Install -->
        <button v-if="canInstall" class="btn-ghost hidden sm:inline-flex" @click="installPWA">
          Install
        </button>

        <!-- Hamburger (mobile) -->
        <button class="md:hidden icon-btn ml-1" @click="open = true" aria-label="Open menu">
          <i class="i-tabler-menu-2 text-xl"></i>
        </button>
      </div>
    </div>

    <!-- Search bar (overlay under nav) -->
    <transition name="fade">
      <div v-if="showSearch" class="mx-auto max-w-6xl px-3 mt-2">
        <div class="relative">
          <input
            v-model="search"
            :placeholder="locale==='sw' ? 'Tafuta...' : 'Search...'"
            class="w-full h-11 rounded-xl bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @keydown.enter.prevent="doSearch"
          />
          <i class="i-tabler-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
          <button v-if="search" class="abs-clear" @click="search=''">✖</button>
        </div>
      </div>
    </transition>
  </nav>

  <!-- Mobile Sheet -->
  <transition name="sheet">
    <div v-if="open" class="fixed inset-0 z-[90] md:hidden">
      <button class="absolute inset-0 bg-black/50" @click="open=false" aria-label="Close menu"></button>
      <div class="absolute bottom-0 inset-x-0 rounded-t-2xl bg-white dark:bg-[#0b1020] border-t border-black/10 dark:border-white/10 p-4">
        <div class="mx-auto h-1 w-12 rounded-full bg-black/10 dark:bg-white/20 mb-3"></div>

        <!-- Auth CTA (mobile) -->
        <div v-if="!loggedIn" class="flex gap-2 mb-3">
          <router-link to="/login" class="btn-ghost flex-1">Login</router-link>
          <router-link to="/signup" class="btn-cta flex-1">Sign Up</router-link>
        </div>

        <!-- Links -->
        <ul class="grid grid-cols-1 gap-1 text-sm">
          <li v-for="(l,i) in links" :key="'m'+i">
            <router-link
              :to="l.to"
              class="block px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
              @click="open=false"
              :class="isActive(l.to) ? 'text-yellow-500' : ''"
            >
              {{ l.label }}
            </router-link>
          </li>
        </ul>

        <!-- Utilities -->
        <div class="mt-3 grid grid-cols-3 gap-2">
          <button class="btn-ghost" @click="toggleTheme">
            <i :class="theme==='dark' ? 'i-tabler-sun' : 'i-tabler-moon'"></i> {{ theme==='dark' ? 'Light' : 'Dark' }}
          </button>
          <button class="btn-ghost" @click="openLang = !openLang">
            🌐 {{ locale.toUpperCase() }}
          </button>
          <button v-if="canInstall" class="btn-ghost" @click="installPWA">Install</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

/* Props (customizable) */
const props = defineProps({
  logoSrc: { type: String, default: '/logo.svg' },
  links: {
    type: Array,
    default: () => ([
      { label: 'Features', to: '/#features' },
      { label: 'Pricing',  to: '/#pricing'  },
      { label: 'Contact',  to: '/#contact'  },
    ])
  },
  user: {
    type: Object,
    default: () => ({ username: 'guest', avatar: '/user-avatar.png' })
  },
  loggedIn: { type: Boolean, default: false },
  unread: { type: Number, default: 0 }, // notifications
})

/* Emits */
defineEmits(['logout','settings','search'])

/* Safe-area */
const safeAreaTop = { paddingTop: 'env(safe-area-inset-top, 0px)' }

/* State */
const route = useRoute()
const open = ref(false)        // mobile sheet
const openUser = ref(false)
const openLang = ref(false)
const showSearch = ref(false)
const search = ref('')

/* Online */
const online = ref(navigator.onLine)
function onNet(){ online.value = navigator.onLine }

/* Theme */
const theme = ref(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
function applyTheme(){
  const root = document.documentElement
  if (theme.value === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  localStorage.setItem('theme', theme.value)
}
function toggleTheme(){ theme.value = theme.value === 'dark' ? 'light' : 'dark'; applyTheme() }

/* Locale */
const locale = ref(localStorage.getItem('lang') || 'en')
function setLocale(c){ locale.value = c; localStorage.setItem('lang', c); openLang.value = false }

/* Active route check (supports hash links too) */
function isActive(path){
  if (!path) return false
  if (path.startsWith('/#')) return route.hash === path.replace('/','')
  return route.path === path
}

/* Search */
function toggleSearch(){ showSearch.value = !showSearch.value }
function doSearch(){ if (search.value.trim()) { emit('search', search.value.trim()); showSearch.value=false } }

/* Shrink on scroll */
const compact = ref(false)
let lastY = 0
function onScroll(){
  const y = window.scrollY || document.documentElement.scrollTop
  compact.value = y > 8 && y >= lastY  // shrink when scrolling down
  lastY = y
}

/* PWA install */
let deferredPrompt = null
const canInstall = ref(false)
function beforeInstall(e){ e.preventDefault(); deferredPrompt = e; canInstall.value = true }
async function installPWA(){
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  await deferredPrompt.userChoice
  deferredPrompt = null
  canInstall.value = false
}

/* Lifecycle */
onMounted(() => {
  applyTheme()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('online', onNet)
  window.addEventListener('offline', onNet)
  window.addEventListener('beforeinstallprompt', beforeInstall)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('online', onNet)
  window.removeEventListener('offline', onNet)
  window.removeEventListener('beforeinstallprompt', beforeInstall)
})
</script>

<style scoped>
/* Buttons */
.icon-btn {
  @apply h-9 w-9 grid place-items-center rounded-full
         text-slate-700 dark:text-slate-200
         hover:bg-black/5 dark:hover:bg-white/10
         border border-black/10 dark:border-white/10 active:scale-[.98];
}
.btn-ghost {
  @apply h-9 px-3 rounded-full text-sm font-semibold
         border border-black/10 dark:border-white/10
         bg-black/5 dark:bg-white/10 text-slate-800 dark:text-white active:translate-y-[1px];
}
.btn-cta {
  @apply h-9 px-3 rounded-full text-sm font-bold
         bg-yellow-400 text-black hover:bg-yellow-300
         border border-black/10 active:translate-y-[1px];
}

/* Menus */
.abs-menu {
  @apply absolute mt-2 rounded-xl overflow-hidden
         bg-white/95 dark:bg-[#0b1020]/95 border border-black/10 dark:border-white/10 min-w-[9rem] shadow-xl;
}
.menu-item {
  @apply w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between;
}

/* Misc */
.dot { @apply absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500; }
.abs-clear { @apply absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700; }

/* Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }

.sheet-enter-active,.sheet-leave-active { transition: transform .24s ease, opacity .24s ease }
.sheet-enter-from,.sheet-leave-to { transform: translateY(8%); opacity: 0 }
</style>
