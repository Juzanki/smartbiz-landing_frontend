<!-- src/components/VueWelcomeTips.vue -->
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import WelcomeItem from './WelcomeItem.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import SupportIcon from './icons/IconSupport.vue'

/* ---------- Small helpers ---------- */
function showToast(msg: string) {
  toast.value = msg
  window.clearTimeout(toastTimer.value)
  toastTimer.value = window.setTimeout(() => (toast.value = ''), 1600)
}

async function copy(txt: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(txt)
    } else {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = txt
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    showToast('Copied')
  } catch {
    showToast('Failed to copy')
  }
}

/* ---------- State ---------- */
const q = ref('')
const toast = ref('')
const toastTimer = ref<number | null>(null)

const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const theme = ref(localStorage.getItem('mf_theme') || 'system')

const canInstall = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)

const tags = ['docs', 'tooling', 'ecosystem', 'community', 'support'] as const
const activeTags = ref<string[]>([])

/* ---------- Commands block ---------- */
const cmd = {
  npm: { dev: 'npm run dev', test: 'npm run test', build: 'npm run build' },
  pnpm: { dev: 'pnpm dev', test: 'pnpm test', build: 'pnpm build' },
  yarn: { dev: 'yarn dev', test: 'yarn test', build: 'yarn build' },
}

/* ---------- Filters / Search ---------- */
function toggleTag(t: string) {
  const i = activeTags.value.indexOf(t)
  i >= 0 ? activeTags.value.splice(i, 1) : activeTags.value.push(t)
}

const matches = (title: string, body: string, tag: string) => {
  const term = q.value.trim().toLowerCase()
  if (activeTags.value.length && !activeTags.value.includes(tag)) return false
  if (!term) return true
  return (title + ' ' + body).toLowerCase().includes(term)
}

/* ---------- Theme ---------- */
let mql: MediaQueryList | null = null
function applyThemeClass(mode: 'light' | 'dark') {
  const el = document.documentElement
  el.classList.remove('theme-light', 'theme-dark')
  el.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light')
}

function setTheme() {
  localStorage.setItem('mf_theme', theme.value)
  if (theme.value === 'system') {
    const dark = mql?.matches ?? window.matchMedia?.('(prefers-color-scheme: dark)').matches
    applyThemeClass(dark ? 'dark' : 'light')
  } else {
    applyThemeClass(theme.value === 'dark' ? 'dark' : 'light')
  }
}
watch(theme, setTheme)

/* ---------- PWA install ---------- */
function installPWA() {
  try {
    deferredPrompt.value?.prompt?.()
    canInstall.value = false
  } catch {}
}

/* ---------- Share (fallback to copy) ---------- */
async function share() {
  const data = {
    title: 'Vue 3 + Vite Mobile-first Starter',
    text: 'Check out this project!',
    url: typeof window !== 'undefined' ? window.location.href : '',
  }
  try {
    if (navigator.share) {
      await navigator.share(data)
      showToast('Shared!')
    } else {
      await copy(data.url)
    }
  } catch {
    // user dismissed or not available
  }
}

/* ---------- Dev shortcut ---------- */
const openReadmeInEditor = async () => {
  try {
    await fetch('/__open-in-editor?file=README.md')
    showToast('Opening README…')
  } catch {
    showToast('Could not open README')
  }
}

/* ---------- Lifecycle & listeners ---------- */
function onOnline() {
  online.value = true
  showToast('Back online')
}
function onOffline() {
  online.value = false
  showToast('You’re offline')
}
function onBeforeInstallPrompt(e: Event) {
  // Cast to chrome-compatible event
  const evt = e as BeforeInstallPromptEvent
  e.preventDefault?.()
  deferredPrompt.value = evt
  canInstall.value = true
}
function onThemeChange(e: MediaQueryListEvent) {
  if (theme.value === 'system') applyThemeClass(e.matches ? 'dark' : 'light')
}
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchRef.value?.focus()
  }
}

onMounted(() => {
  // Online/offline
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  // Theme (system)
  mql = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null
  mql?.addEventListener?.('change', onThemeChange)
  setTheme()

  // PWA install
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)

  // Quick open search
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)
  window.removeEventListener('keydown', onKeydown)
  mql?.removeEventListener?.('change', onThemeChange)
})

/* ---------- Computeds for sections ---------- */
const showDocs = computed(() => matches('Documentation', 'Vue’s official docs', 'docs'))
const showTooling = computed(() => matches('Tooling', 'Vite, Vitest, Cypress, Playwright', 'tooling'))
const showEcosystem = computed(() => matches('Ecosystem', 'Pinia, Router, Test Utils, DevTools', 'ecosystem'))
const showCommunity = computed(() => matches('Community', 'Vue Land, StackOverflow, social', 'community'))
const showSupport = computed(() => matches('Support Vue', 'Sponsor Vue', 'support'))

/* ---------- Types ---------- */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}
</script>

<template>
  <section class="p-4 sm:p-6 max-w-3xl mx-auto">
    <!-- Top bar -->
    <header class="flex items-center justify-between gap-2 mb-3">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-white">Welcome 👋</h1>
        <p class="text-xs text-gray-500 dark:text-white/60">
          Mobile-first starter • Vue 3 + Vite
          <span v-if="!online" class="ml-1 text-amber-600">• Offline</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-sm"
          @click="share"
          title="Share"
        >
          Share
        </button>
        <select
          v-model="theme"
          @change="setTheme"
          class="rounded-xl bg-gray-100 dark:bg-white/10 text-sm px-2 py-1.5"
          aria-label="Theme"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <button
          v-if="canInstall"
          class="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-sm"
          @click="installPWA"
        >
          Install App
        </button>
      </div>
    </header>

    <!-- Search + chips -->
    <div class="flex gap-2 -mx-1 px-1 pb-2 mb-3 overflow-x-auto no-scrollbar">
      <div class="relative min-w-[60%] sm:min-w-[280px]">
        <input
          ref="searchRef"
          v-model="q"
          type="search"
          inputmode="search"
          placeholder="Search docs, tooling, community…"
          class="w-full rounded-xl bg-gray-100 dark:bg-white/10 px-9 py-2 text-sm outline-none focus:ring-2 ring-blue-600/60"
          aria-label="Search"
        />
        <svg class="w-4 h-4 absolute left-3 top-2.5 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 1 0 1.06-1.06l-3.25-3.25zM12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <button
        v-for="t in tags"
        :key="t"
        @click="toggleTag(t)"
        class="px-3 h-9 rounded-full text-sm whitespace-nowrap transition"
        :class="activeTags.includes(t) ? 'bg-blue-700 text-white' : 'bg-gray-100 dark:bg-white/10 dark:text-white'"
      >
        {{ t }}
      </button>
    </div>

    <!-- DEV shortcuts -->
    <div class="rounded-2xl bg-white dark:bg-[#0b0b10] border border-gray-200 dark:border-white/10 p-4 mb-4">
      <h3 class="text-sm font-semibold text-gray-800 dark:text-white mb-2">Quick commands</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div class="rounded-xl border border-black/5 dark:border-white/10 p-3">
          <p class="font-semibold mb-1">npm</p>
          <div class="cmd" @click="copy(cmd.npm.dev)"><code>{{ cmd.npm.dev }}</code> ⧉</div>
          <div class="cmd" @click="copy(cmd.npm.test)"><code>{{ cmd.npm.test }}</code> ⧉</div>
          <div class="cmd" @click="copy(cmd.npm.build)"><code>{{ cmd.npm.build }}</code> ⧉</div>
        </div>
        <div class="rounded-xl border border-black/5 dark:border-white/10 p-3">
          <p class="font-semibold mb-1">pnpm</p>
          <div class="cmd" @click="copy(cmd.pnpm.dev)"><code>{{ cmd.pnpm.dev }}</code> ⧉</div>
          <div class="cmd" @click="copy(cmd.pnpm.test)"><code>{{ cmd.pnpm.test }}</code> ⧉</div>
          <div class="cmd" @click="copy(cmd.pnpm.build)"><code>{{ cmd.pnpm.build }}</code> ⧉</div>
        </div>
        <div class="rounded-2xl border border-black/5 dark:border-white/10 p-3">
          <p class="font-semibold mb-1">yarn</p>
          <div class="cmd" @click="copy(cmd.yarn.dev)"><code>{{ cmd.yarn.dev }}</code> ⧉</div>
          <div class="cmd" @click="copy(cmd.yarn.test)"><code>{{ cmd.yarn.test }}</code> ⧉</div>
          <div class="cmd" @click="copy(cmd.yarn.build)"><code>{{ cmd.yarn.build }}</code> ⧉</div>
        </div>
      </div>
    </div>

    <!-- Sections -->
    <WelcomeItem v-show="showDocs">
      <template #icon><DocumentationIcon /></template>
      <template #heading>Documentation</template>
      Vue’s
      <a href="https://vuejs.org/" target="_blank" rel="noopener">official documentation</a>
      provides you with all information you need to get started.
    </WelcomeItem>

    <WelcomeItem v-show="showTooling">
      <template #icon><ToolingIcon /></template>
      <template #heading>Tooling</template>
      This project is served and bundled with
      <a href="https://vite.dev/guide/features.html" target="_blank" rel="noopener">Vite</a>.
      The recommended IDE setup is
      <a href="https://code.visualstudio.com/" target="_blank" rel="noopener">VSCode</a> +
      <a href="https://github.com/johnsoncodehk/volar" target="_blank" rel="noopener">Volar</a>.
      <br />
      For testing: use
      <a href="https://vitest.dev/" target="_blank" rel="noopener">Vitest</a>,
      <a href="https://www.cypress.io/" target="_blank" rel="noopener">Cypress</a>,
      or
      <a href="https://playwright.dev/" target="_blank" rel="noopener">Playwright</a>.
      <br /><br />
      More instructions:
      <a href="javascript:void(0)" @click="openReadmeInEditor"><code>README.md</code></a>
    </WelcomeItem>

    <WelcomeItem v-show="showEcosystem">
      <template #icon><EcosystemIcon /></template>
      <template #heading>Ecosystem</template>
      Official tools:
      <a href="https://pinia.vuejs.org/" target="_blank" rel="noopener">Pinia</a>,
      <a href="https://router.vuejs.org/" target="_blank" rel="noopener">Vue Router</a>,
      <a href="https://test-utils.vuejs.org/" target="_blank" rel="noopener">Vue Test Utils</a>,
      <a href="https://github.com/vuejs/devtools" target="_blank" rel="noopener">Vue Dev Tools</a>.
      <br />
      More resources at
      <a href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">Awesome Vue</a>.
    </WelcomeItem>

    <WelcomeItem v-show="showCommunity">
      <template #icon><CommunityIcon /></template>
      <template #heading>Community</template>
      Ask for help on
      <a href="https://chat.vuejs.org" target="_blank" rel="noopener">Vue Land</a>,
      <a href="https://stackoverflow.com/questions/tagged/vue.js" target="_blank" rel="noopener">StackOverflow</a>,
      or follow
      <a href="https://bsky.app/profile/vuejs.org" target="_blank" rel="noopener">@vuejs.org</a> /
      <a href="https://x.com/vuejs" target="_blank" rel="noopener">@vuejs</a>.
    </WelcomeItem>

    <WelcomeItem v-show="showSupport">
      <template #icon><SupportIcon /></template>
      <template #heading>Support Vue</template>
      Vue relies on community support.
      <a href="https://vuejs.org/sponsor/" target="_blank" rel="noopener">Become a sponsor</a>.
    </WelcomeItem>

    <!-- Sticky quick actions -->
    <div class="sticky bottom-0 left-0 right-0 z-40 mt-4">
      <div
        class="rounded-t-2xl bg-white/90 dark:bg-[#0b0b10]/90 backdrop-blur border-t border-black/10 dark:border-white/10 px-4 py-3 flex items-center gap-2"
      >
        <button class="qa" @click="openReadmeInEditor">Open README</button>
        <button class="qa" @click="copy('npm run dev')">Run dev</button>
        <button class="qa" @click="copy('git clone …')">Clone</button>
      </div>
      <div class="h-3" />
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
      <div class="rounded-xl bg-emerald-600 text-white text-sm px-3 py-2 shadow">
        {{ toast }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

.cmd { @apply cursor-pointer rounded-md px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/15; }
.qa  { @apply h-10 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-sm text-gray-800 dark:text-white active:scale-95; }

/* Safe-area padding for phones with notches */
@supports(padding:max(0px)) {
  section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}

/* Optional: light/dark root helpers (if you want to style globally) */
:root.theme-light {}
:root.theme-dark {}
</style>
