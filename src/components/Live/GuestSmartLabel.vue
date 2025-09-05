<!-- StatusPill.vue -->
<template>
  <transition name="pill-fade">
    <div
      v-if="visible && (kind === 'full' || kind === 'next')"
      class="fixed z-40 pointer-events-auto select-none"
      :class="wrapperClass"
      :style="wrapperStyle"
      role="status"
      aria-live="polite"
      @keydown.esc.prevent="dismiss('esc')"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <div
        class="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold
               text-white shadow-lg ring-1 ring-white/20
               backdrop-blur supports-[backdrop-filter]:backdrop-blur-md"
        :class="pillGradient"
      >
        <!-- Glow pulse -->
        <span class="relative inline-flex h-2.5 w-2.5">
          <span class="absolute inset-0 rounded-full bg-white/70 opacity-90"
                :class="{'animate-ping': !reducedMotion}"></span>
          <span class="relative h-2.5 w-2.5 rounded-full bg-white"></span>
        </span>

        <!-- Copy -->
        <span v-if="kind === 'full'">🛑 Guest Slot Full</span>
        <span v-else>🟢 You’re Next!</span>

        <!-- Queue position -->
        <span v-if="kind === 'next' && position"
              class="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
          #{{ position }}
        </span>

        <!-- ETA ring -->
        <button
          v-if="etaSec > 0 && kind === 'next'"
          class="relative grid place-items-center h-6 w-6 rounded-full text-[10px] font-bold
                 bg-transparent"
          :style="ringStyle"
          :aria-label="`~${etaLeft}s remaining`"
          @click="dismiss('tap')"
        >
          <span class="absolute inset-[2px] rounded-full bg-white/15"></span>
          <span class="relative z-10">{{ etaLeft }}</span>
        </button>

        <!-- Close (desktop) -->
        <button
          class="hidden sm:inline-flex items-center justify-center h-6 w-6 rounded-full
                 hover:bg-white/15 active:bg-white/20"
          aria-label="Dismiss"
          @click="dismiss('x')"
        >✕</button>
      </div>

      <!-- SR-only text -->
      <p class="sr-only">
        {{ srText }}
      </p>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/**
 * Props
 * status: 'waiting' | 'full' | 'next'
 * position: number (queue position if 'next')
 * etaSec: number (estimated seconds until join if 'next')
 * autoHideSec: number (auto-hide after seconds; 0 = persist)
 * placement: 'top-right' | 'top-center' | 'bottom-center'
 */
const props = defineProps({
  status: { type: String, default: 'waiting' },
  position: { type: Number, default: 0 },
  etaSec: { type: Number, default: 0 },
  autoHideSec: { type: Number, default: 8 },
  placement: { type: String, default: 'top-right' }
})
const emit = defineEmits(['dismiss'])

/* ---------- State ---------- */
const visible = ref(true)
const kind = computed(() => (props.status === 'next' ? 'next' : props.status === 'full' ? 'full' : 'waiting'))
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
const etaLeft = ref(props.etaSec)
const timer = ref(null)
const etaTimer = ref(null)

/* ---------- Haptics ---------- */
function buzz(ms=14){ try{ navigator?.vibrate?.(ms) }catch{} }
watch(kind, (k, prev) => {
  if ((prev !== k) && (k === 'next' || k === 'full') && !reducedMotion) buzz(k === 'next' ? 18 : 12)
})

/* ---------- Auto-hide + ETA ---------- */
function startTimers(){
  stopTimers()
  if (props.autoHideSec > 0) {
    timer.value = setTimeout(() => dismiss('auto'), props.autoHideSec * 1000)
  }
  if (kind.value === 'next' && props.etaSec > 0){
    etaLeft.value = props.etaSec
    etaTimer.value = setInterval(() => {
      etaLeft.value = Math.max(0, etaLeft.value - 1)
      if (etaLeft.value <= 0) clearInterval(etaTimer.value)
      else if (etaLeft.value <= 3 && !reducedMotion) buzz(10)
    }, 1000)
  }
}
function stopTimers(){
  if (timer.value){ clearTimeout(timer.value); timer.value = null }
  if (etaTimer.value){ clearInterval(etaTimer.value); etaTimer.value = null }
}
watch(() => [props.status, props.etaSec], () => { if (visible.value) startTimers() }, { immediate: true })

/* ---------- Ring ---------- */
const ringStyle = computed(() => {
  if (props.etaSec <= 0) return {}
  const pct = Math.min((etaLeft.value / props.etaSec) * 100, 100)
  const deg = (pct/100) * 360
  return { background: `conic-gradient(rgba(255,255,255,.92) ${deg}deg, rgba(255,255,255,.25) 0deg)` }
})

/* ---------- Text ---------- */
const srText = computed(() => {
  if (kind.value === 'full') return 'All guest slots are currently full.'
  if (kind.value === 'next') {
    const pos = props.position ? ` Position ${props.position}.` : ''
    const eta = props.etaSec ? ` Approximately ${etaLeft.value} seconds remaining.` : ''
    return `You are next!${pos}${eta}`
  }
  return ''
})

/* ---------- Placement ---------- */
const wrapperClass = computed(() => {
  switch (props.placement) {
    case 'top-center': return 'inset-x-0 top-[max(1rem,env(safe-area-inset-top))] flex justify-center'
    case 'bottom-center': return 'inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center'
    default: return 'top-[max(1rem,env(safe-area-inset-top))] right-4'
  }
})
const wrapperStyle = computed(() => dragStyle.value)

/* ---------- Gradients ---------- */
const pillGradient = computed(() => {
  return kind.value === 'full'
    ? 'bg-gradient-to-r from-fuchsia-700 via-rose-600 to-red-600'
    : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-500'
})

/* ---------- Swipe to dismiss ---------- */
const startX = ref(0)
const dx = ref(0)
const dragging = ref(false)
const dragStyle = computed(() => {
  if (!dragging.value) return {}
  const x = dx.value
  const op = Math.max(1 - Math.abs(x)/240, .4)
  return { transform: `translateX(${x}px)`, opacity: op }
})
function onTouchStart(e){
  if (e.touches?.length !== 1) return
  dragging.value = true
  startX.value = e.touches[0].clientX
  dx.value = 0
}
function onTouchMove(e){
  if (!dragging.value) return
  dx.value = e.touches[0].clientX - startX.value
}
function onTouchEnd(){
  if (!dragging.value) return
  dragging.value = false
  if (Math.abs(dx.value) > 120) dismiss('swipe')
  else dx.value = 0
}

/* ---------- Dismiss ---------- */
function dismiss(reason='manual'){
  visible.value = false
  stopTimers()
  emit('dismiss', { reason, status: kind.value })
}

/* ---------- Lifecycle ---------- */
function onVisibility(){
  if (document.hidden) stopTimers()
  else if (visible.value) startTimers()
}
onMounted(() => {
  if (kind.value === 'waiting') visible.value = false
  else startTimers()
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  stopTimers()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.pill-fade-enter-active,
.pill-fade-leave-active {
  transition: opacity .22s ease, transform .22s ease;
}
.pill-fade-enter-from,
.pill-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (prefers-reduced-motion: reduce){
  .pill-fade-enter-active,.pill-fade-leave-active{ transition-duration: .12s; }
  .animate-ping{ animation: none !important; }
}
</style>
