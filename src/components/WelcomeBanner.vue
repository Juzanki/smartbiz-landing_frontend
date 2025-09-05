<!-- src/components/SmartBizWelcomeBanner.vue -->
<template>
  <transition name="slide-fade">
    <section
      v-if="visible"
      class="mx-4 mt-safe rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg ring-1 ring-white/10 overflow-hidden"
      role="region"
      aria-label="Welcome banner"
    >
      <!-- top row -->
      <div class="p-4 sm:p-5 flex items-start gap-3">
        <div class="shrink-0 w-10 h-10 rounded-xl bg-white/20 grid place-items-center text-xl">🤖</div>

        <div class="min-w-0 flex-1">
          <h2 class="text-lg sm:text-xl font-bold leading-tight">
            {{ greeting }},
            <span v-if="name" class="opacity-95">{{ name }}</span>
            <span v-else>there</span>!
          </h2>
          <p class="text-sm text-white/90 mt-0.5 truncate">
            {{ message }}
          </p>

          <!-- chips -->
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="chip" :class="online ? 'bg-emerald-500/15 text-emerald-100' : 'bg-yellow-500/20 text-yellow-100'">
              {{ online ? 'Online' : 'Offline mode' }}
            </span>
            <button
              v-if="canInstall"
              class="chip hover:bg-white/25 active:scale-95"
              @click="installApp"
            >⤵️ Install App</button>
            <span class="chip bg-white/20">EAT • {{ timeLabel }}</span>
          </div>
        </div>

        <!-- close -->
        <button
          class="p-2 rounded-lg hover:bg-white/15 active:scale-95"
          aria-label="Dismiss"
          @click="dismiss"
        >✖</button>
      </div>

      <!-- actions -->
      <div class="px-4 pb-safe flex gap-2">
        <button class="btn-primary flex-1" @click="$emit('start')">{{ ctaLabel }}</button>
        <button class="btn-secondary flex-1" @click="dismiss">Maybe later</button>
      </div>
    </section>
  </transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

/* Props */
const props = withDefaults(defineProps<{
  name?: string
  message?: string
  tz?: string
  ctaLabel?: string
  persistDaily?: boolean   // if true, hide for the rest of the day after dismiss
  storageKey?: string
}>(), {
  name: '',
  message: 'Welcome to SmartBiz Assistance!',
  tz: 'Africa/Dar_es_Salaam',
  ctaLabel: 'Get started',
  persistDaily: true,
  storageKey: 'sb_welcome_banner'
})

/* Emits */
defineEmits<{ (e:'start'): void }>()

/* State */
const visible = ref(true)
const online  = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const canInstall = ref(false)
let deferredPrompt: any = null
const now = ref(Date.now())

/* Greeting & time */
const hour = computed(() =>
  parseInt(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: props.tz }).format(new Date(now.value)), 10)
)
const greeting = computed(() =>
  hour.value < 12 ? 'Good morning' : hour.value < 18 ? 'Good afternoon' : 'Good evening'
)
const timeLabel = computed(() =>
  new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: props.tz }).format(new Date(now.value))
)

/* Lifecycle */
onMounted(() => {
  // show/hide based on daily persistence
  if (props.persistDaily && isDismissedToday()) visible.value = false

  // clock tick (lightweight)
  setInterval(() => (now.value = Date.now()), 30_000)

  // online/offline
  window.addEventListener?.('online', () => (online.value = true))
  window.addEventListener?.('offline', () => (online.value = false))

  // PWA install chip
  window.addEventListener?.('beforeinstallprompt', (e: any) => {
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = true
  })
})

/* Actions */
function dismiss() {
  vibrate([8])
  visible.value = false
  if (props.persistDaily) markDismissedToday()
}
async function installApp() {
  try { await deferredPrompt?.prompt?.() } catch {}
  canInstall.value = false
}

/* Persistence helpers */
function todayKey() {
  const d = new Date().toLocaleDateString('en-CA', { timeZone: props.tz })
  return `${props.storageKey}:${d}`
}
function isDismissedToday() { return localStorage.getItem(todayKey()) === '1' }
function markDismissedToday() { localStorage.setItem(todayKey(), '1') }

/* UX */
function vibrate(pattern: number[]) { try { navigator.vibrate?.(pattern) } catch {} }
</script>

<style scoped>
/* Buttons */
.btn-primary {
  @apply h-11 px-4 mb-4 rounded-xl bg-white text-blue-700 font-semibold text-sm active:scale-95;
}
.btn-secondary {
  @apply h-11 px-4 mb-4 rounded-xl bg-white/15 text-white font-medium text-sm active:scale-95;
}

/* Chips */
.chip {
  @apply px-2.5 h-7 rounded-full text-[12px] font-medium bg-white/20 text-white;
}

/* Transition */
.slide-fade-enter-active,
.slide-fade-leave-active { transition: all .28s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateY(-10px); }
.slide-fade-leave-to   { opacity: 0; transform: translateY(-6px); }

/* Safe-area helpers for phones with notches */
.mt-safe { margin-top: max(1rem, env(safe-area-inset-top)); }
.pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .slide-fade-enter-active,
  .slide-fade-leave-active { transition: none; }
}
</style>
