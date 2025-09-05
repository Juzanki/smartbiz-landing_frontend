<!-- JoinRequestToast.vue -->
<template>
  <transition name="toast-fade">
    <div
      v-if="visible"
      class="fixed z-50 pointer-events-auto"
      :class="positionClass"
      :style="positionStyle"
      role="status"
      aria-live="polite"
      @mouseenter="pause()"
      @mouseleave="resume()"
      @keydown.esc.prevent="handleDismiss('esc')"
    >
      <div
        ref="cardRef"
        class="flex items-center gap-3 w-[92vw] sm:w-80 max-w-sm
               bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100
               shadow-xl rounded-2xl px-4 py-3 ring-1 ring-black/10 dark:ring-white/10
               backdrop-blur supports-[backdrop-filter]:backdrop-blur-md
               animate-in"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        :style="dragStyle"
      >
        <!-- Avatar -->
        <img
          v-if="request?.avatar"
          :src="request.avatar"
          alt=""
          class="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/40"
        />
        <div
          v-else
          class="h-10 w-10 rounded-full grid place-items-center bg-indigo-100 text-indigo-600 font-bold ring-2 ring-indigo-500/40"
        >
          {{ initials }}
        </div>

        <!-- Text + Actions -->
        <div class="min-w-0 flex-1">
          <p class="text-sm leading-5 truncate">
            <span class="font-semibold text-indigo-600 dark:text-indigo-400">{{ request?.name }}</span>
            <span class="ml-1">wants to join your live!</span>
          </p>
          <div class="mt-2 flex items-center gap-2">
            <button
              ref="acceptBtnRef"
              @click="respond(true)"
              class="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold
                     text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none
                     focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-white
                     dark:focus:ring-offset-zinc-900"
            >
              ✅ Accept
            </button>
            <button
              @click="respond(false)"
              class="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold
                     text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus:outline-none
                     focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-white
                     dark:focus:ring-offset-zinc-900"
            >
              ❌ Decline
            </button>
          </div>

          <!-- Progress bar -->
          <div class="mt-2 h-1 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div class="h-full bg-indigo-500" :style="{ width: progressBarWidth }"></div>
          </div>

          <!-- SR-only -->
          <p class="sr-only">
            {{ request?.name }} requested to join. Auto-dismiss in {{ remaining }} seconds.
          </p>
        </div>
      </div>
      <!-- safe-area spacer (mobile) -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  request: { type: Object, required: true },           // { id, name, avatar? }
  /**
   * For stacking multiple toasts on mobile: pass the index (0-based).
   * Each toast offsets a bit higher.
   */
  index: { type: Number, default: 0 },
  /**
   * Auto-hide after N seconds
   */
  timeoutSec: { type: Number, default: 15 },
  /**
   * Position: 'mobile-bottom' (default)  or 'desktop-bottom-right'
   */
  position: { type: String, default: 'mobile-bottom' }
})

const emit = defineEmits(['respond', 'dismiss'])

const visible = ref(true)
const remaining = ref(props.timeoutSec)
const ticking = ref(true)
const timer = ref(null)

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

// Haptics
function buzz(ms = 15) { try { navigator?.vibrate?.(ms) } catch {} }

// Initials
const initials = computed(() => {
  const n = props.request?.name?.trim() || ''
  return n ? n.split(/\s+/).map(p => p[0]).join('').slice(0,2).toUpperCase() : 'U'
})

// Positioning (mobile: bottom stack; desktop: bottom-right)
const positionClass = computed(() =>
  props.position === 'desktop-bottom-right'
    ? 'right-4 bottom-4'
    : 'inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex justify-center sm:justify-end sm:pr-4'
)
// Each toast stacks 72px apart (card height ~ + gap)
const positionStyle = computed(() => {
  const offset = props.index * 72
  if (props.position === 'desktop-bottom-right') {
    return { transform: `translateY(-${offset}px)` }
  }
  // mobile center/bottom: lift up by offset
  return { transform: `translateY(-${offset}px)` }
})

// Progress width
const progressBarWidth = computed(() => {
  const used = Math.max(props.timeoutSec - remaining.value, 0)
  const pct = Math.min((used / props.timeoutSec) * 100, 100)
  return `${pct}%`
})

function tick() {
  if (!ticking.value) return
  remaining.value -= 1
  if (remaining.value <= 0) {
    stopTimer()
    handleDismiss('timeout')
  } else if (remaining.value <= 3 && !reducedMotion) {
    buzz(18)
  }
}
function startTimer() {
  stopTimer()
  timer.value = setInterval(tick, 1000)
}
function stopTimer() {
  if (timer.value) { clearInterval(timer.value); timer.value = null }
}
function pause() { ticking.value = false }
function resume() { if (!connecting.value) ticking.value = true }

// Swipe-to-dismiss (horizontal)
const startX = ref(0)
const deltaX = ref(0)
const dragging = ref(false)
const cardRef = ref(null)
const dragStyle = computed(() => {
  if (!dragging.value) return {}
  const x = deltaX.value
  const opacity = Math.max(1 - Math.abs(x) / 220, 0.35)
  return { transform: `translateX(${x}px)`, opacity }
})
function onTouchStart(e) {
  if (e.touches?.length !== 1) return
  dragging.value = true
  startX.value = e.touches[0].clientX
  deltaX.value = 0
  pause()
}
function onTouchMove(e) {
  if (!dragging.value) return
  deltaX.value = e.touches[0].clientX - startX.value
}
function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  // dismiss if swiped far
  if (Math.abs(deltaX.value) > 120) {
    handleDismiss('swipe')
  } else {
    deltaX.value = 0
    resume()
  }
}

const connecting = ref(false)
const acceptBtnRef = ref(null)

function respond(accepted) {
  visible.value = false
  stopTimer()
  emit('respond', { accepted, request: props.request })
}

function handleDismiss(reason = 'dismiss') {
  visible.value = false
  stopTimer()
  emit('dismiss', { reason, request: props.request })
}

function onVisibility() {
  if (document.hidden) {
    pause(); stopTimer()
  } else {
    if (visible.value && remaining.value > 0) {
      resume(); startTimer()
    }
  }
}

onMounted(() => {
  // focus accept button for keyboard/screen reader
  requestAnimationFrame(() => acceptBtnRef.value?.focus?.())
  startTimer()
  document.addEventListener('visibilitychange', onVisibility)
  if (!reducedMotion) buzz(12) // subtle buzz on show
})

onBeforeUnmount(() => {
  stopTimer()
  document.removeEventListener('visibilitychange', onVisibility)
})

// If the same request updates (e.g., avatar loaded), keep timer intact
watch(() => props.request, () => {}, { deep: true })
</script>

<style scoped>
/* Fade + slight lift */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity .22s ease, transform .22s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Entrance micro-animation on the card */
.animate-in {
  animation: toast-pop .18s ease-out both;
}
@keyframes toast-pop {
  from { transform: scale(.98); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .animate-in { animation: none !important; }
  .toast-fade-enter-active,
  .toast-fade-leave-active { transition-duration: .1s; }
}
</style>
