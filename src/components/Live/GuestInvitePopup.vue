<!-- LiveInviteModal.vue -->
<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center
           bg-black/60 sm:bg-black/50 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="live-invite-title"
    @keydown.esc.prevent="handleDecline()"
  >
    <!-- Sheet / Card -->
    <div
      ref="cardRef"
      class="w-full sm:w-[92%] max-w-sm
             rounded-t-2xl sm:rounded-2xl shadow-2xl
             bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100
             px-4 pt-3 pb-4 sm:p-5
             translate-y-0"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Drag handle (mobile) -->
      <div class="mx-auto mb-2 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" />

      <!-- Header row -->
      <div class="flex items-center justify-between gap-2">
        <h3 id="live-invite-title" class="text-base sm:text-lg font-semibold">
          🎤 Live Invitation
        </h3>

        <!-- Live pill + trend score -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 text-[10px] font-bold
                        px-2 py-0.5 rounded-full
                        bg-rose-600/10 text-rose-600 ring-1 ring-rose-600/30">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
            </span>
            LIVE
          </span>

          <span
            v-if="trendScore"
            class="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full
                   bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30"
            aria-label="Trending score"
          >
            🔥 {{ trendScore }}
          </span>
        </div>
      </div>

      <!-- Host summary -->
      <div class="mt-3 flex items-center gap-3">
        <div class="relative">
          <img
            v-if="from?.avatar"
            :src="from.avatar"
            alt=""
            class="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-500/50"
          />
          <div v-else class="h-11 w-11 rounded-full grid place-items-center bg-indigo-100 text-indigo-600 font-bold ring-2 ring-indigo-500/50">
            {{ initials }}
          </div>
          <!-- glow -->
          <span class="absolute -inset-0.5 rounded-full blur-lg bg-indigo-500/20 -z-10"></span>
        </div>

        <div class="min-w-0">
          <p class="text-sm">
            Host
            <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ from?.name }}</span>
            invited you to join.
          </p>
          <p class="mt-0.5 text-[11px] text-pink-600 dark:text-pink-400 italic"
             :class="{'motion-safe:animate-pulse': !reducedMotion}">
            💡 We suggest you accept — this session is 🔥 trending!
          </p>
        </div>
      </div>

      <!-- Countdown + ring -->
      <div class="mt-4 flex items-center justify-between">
        <p v-if="countdown > 0" class="text-[12px] text-gray-500 dark:text-gray-400">
          Auto-decline in <span class="font-semibold text-gray-700 dark:text-gray-200">{{ countdown }}</span>s…
        </p>

        <!-- circular ring -->
        <button
          class="relative grid place-items-center h-10 w-10 rounded-full text-[11px] font-semibold
                 bg-transparent"
          :aria-label="`Seconds left ${countdown}`"
          :style="ringStyle"
          @click="handleDecline()"
        >
          <span class="absolute inset-[3px] rounded-full bg-white dark:bg-zinc-900"></span>
          <span class="relative z-10">{{ countdown }}</span>
        </button>
      </div>

      <!-- Connecting state -->
      <div v-if="connecting" class="mt-4 text-indigo-500 text-sm"
           :class="{'motion-safe:animate-pulse': !reducedMotion}">
        Connecting…
      </div>

      <!-- Actions -->
      <div v-else class="mt-4 grid grid-cols-2 gap-3">
        <button
          ref="acceptBtnRef"
          @click="handleAccept()"
          class="col-span-2 sm:col-span-1 inline-flex items-center justify-center
                 rounded-full px-4 py-3 text-sm font-semibold
                 text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2
                 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
        >
          ✅ Accept
        </button>
        <button
          @click="handleDecline()"
          class="col-span-2 sm:col-span-1 inline-flex items-center justify-center
                 rounded-full px-4 py-3 text-sm font-semibold
                 text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800
                 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2
                 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
        >
          ❌ Decline
        </button>
      </div>

      <!-- Linear progress (auto-decline) -->
      <div class="mt-4 h-1 w-full rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
        <div
          class="h-full bg-indigo-500"
          :style="{ width: progressBarWidth }"
        />
      </div>

      <!-- SR-only live region -->
      <p class="sr-only" aria-live="polite">
        {{ srText }}
      </p>
    </div>

    <!-- Safe-area spacer for mobile bottom -->
    <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  from: { type: Object, required: true },           // { name, avatar? }
  seconds: { type: Number, default: 10 },
  trendScore: { type: Number, default: 0 }
})
const emit = defineEmits(['respond'])

const countdown = ref(props.seconds)
const connecting = ref(false)
const timer = ref(null)

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

// Focus management
const acceptBtnRef = ref(null)
const cardRef = ref(null)

// Haptics for last 3s
function buzz(ms = 15) {
  try { navigator?.vibrate?.(ms) } catch {}
}

// SR text
const srText = computed(() =>
  connecting.value
    ? 'Connecting to live…'
    : `Invitation from ${props.from?.name ?? 'host'}. ${countdown.value} seconds remaining.`
)

// Initials fallback
const initials = computed(() => {
  const n = props.from?.name?.trim() || ''
  return n ? n.split(/\s+/).map(p => p[0]).join('').slice(0,2).toUpperCase() : 'H'
})

// Progress (linear)
const progressBarWidth = computed(() => {
  const used = Math.max(props.seconds - countdown.value, 0)
  const pct = Math.min((used / props.seconds) * 100, 100)
  return `${pct}%`
})

// Ring (conic-gradient)
const ringStyle = computed(() => {
  const pct = Math.min((countdown.value / props.seconds) * 100, 100)
  const deg = (pct / 100) * 360
  return {
    background: `conic-gradient(#6366f1 ${deg}deg, rgba(99,102,241,0.15) 0deg)`
  }
})

// Countdown loop
function tick() {
  countdown.value -= 1
  if (countdown.value <= 0) {
    stopTimer()
    emit('respond', { accepted: false, reason: 'timeout' })
  } else if (countdown.value <= 3 && !reducedMotion) {
    buzz(20)
  }
}

function startTimer() {
  stopTimer()
  timer.value = setInterval(tick, 1000)
}
function stopTimer() {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

// Actions
function handleAccept() {
  stopTimer()
  connecting.value = true
  if (!reducedMotion) buzz(30)
  // Simulate connecting
  setTimeout(() => {
    emit('respond', { accepted: true })
  }, 1400)
}

function handleDecline() {
  stopTimer()
  emit('respond', { accepted: false, reason: 'user' })
}

// Visibility (pause when hidden, resume when visible)
function onVisibility() {
  if (document.hidden) {
    stopTimer()
  } else if (!connecting.value && countdown.value > 0) {
    startTimer()
  }
}

// Swipe-to-dismiss (down)
const startY = ref(0)
const deltaY = ref(0)
const dragging = ref(false)
const dragStyle = computed(() => {
  if (!dragging.value) return {}
  const y = Math.max(deltaY.value, 0)
  const opacity = Math.max(1 - y / 240, 0.4)
  return { transform: `translateY(${y}px)`, opacity }
})

function onTouchStart(e) {
  if (e.touches?.length !== 1) return
  dragging.value = true
  startY.value = e.touches[0].clientY
  deltaY.value = 0
}

function onTouchMove(e) {
  if (!dragging.value) return
  const y = e.touches[0].clientY
  deltaY.value = y - startY.value
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (deltaY.value > 120) {
    handleDecline()
  } else {
    // snap back
    deltaY.value = 0
  }
}

onMounted(() => {
  // Focus primary action for keyboard/screen reader
  requestAnimationFrame(() => acceptBtnRef.value?.focus?.())
  // Start countdown
  startTimer()
  // Visibility listener
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stopTimer()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
/* Minimal pulse only when motion allowed (also toggled via class in template) */
@media (prefers-reduced-motion: reduce) {
  .animate-ping { animation: none !important; }
}
</style>
