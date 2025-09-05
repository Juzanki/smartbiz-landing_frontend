<template>
  <transition name="toast">
    <div
      v-if="visible"
      class="fixed z-[9999] pointer-events-auto select-none"
      :class="placementClass"
      :style="offsetStyle"
      role="status"
      aria-live="polite"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <!-- Glow ring when NEXT -->
      <div
        v-if="status === 'next'"
        class="absolute -inset-2 rounded-2xl -z-10"
        :style="glowStyle"
        aria-hidden="true"
      />

      <!-- Card -->
      <div
        class="max-w-[86vw] md:max-w-xs bg-black/80 text-white rounded-xl shadow-2xl backdrop-blur-md
               px-3.5 py-3 text-sm text-center border border-white/10"
        :class="status === 'next' ? 'ring-1 ring-amber-300/40' : ''"
        :style="{ transform: `translateY(${dragY}px)` , transition: dragging ? 'none' : 'transform .16s ease' }"
      >
        <!-- Top progress (optional) -->
        <div v-if="hasProgress" class="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-2">
          <div class="h-full bg-gradient-to-r from-indigo-400 to-violet-400" :style="{ width: pct + '%' }"></div>
        </div>

        <!-- Label -->
        <div class="leading-snug">
          <span v-if="status === 'next'">✅ You’re next — be ready!</span>
          <span v-else-if="status === 'full'">⛔ Screen is full — please wait…</span>
          <span v-else>🔄 Please wait — host is reviewing requests…</span>
        </div>

        <!-- Meta row -->
        <div class="mt-1.5 text-[11px] text-white/80 flex items-center justify-center gap-2">
          <span v-if="position">Pos: <b>#{{ position }}</b></span>
          <span v-if="queueSize && position && etaSec > 0">ETA ≈ {{ etaPretty }}</span>
        </div>

        <!-- Dots (queue preview, up to 6) -->
        <div v-if="queueSize" class="mt-2 flex items-center justify-center gap-1">
          <span
            v-for="i in dotCount"
            :key="i"
            class="h-1.5 w-3 rounded-full"
            :class="i <= (filledDots) ? 'bg-white' : 'bg-white/25'"
          />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'

/* PROPS */
const props = defineProps({
  status: { type: String, default: 'waiting' },  // 'waiting' | 'full' | 'next'
  position: { type: Number, default: 0 },        // 1 = next
  queueSize: { type: Number, default: 0 },       // optional total in queue
  avgTurnSec: { type: Number, default: 30 },     // avg time per turn
  durationMs: { type: Number, default: 6000 },   // auto-hide duration (ms)
  persistOnNext: { type: Boolean, default: true },
  placement: { type: String, default: 'bottom' },// 'bottom' | 'top'
  bottomOffset: { type: Number, default: 80 },   // px above bottom UI
  topOffset: { type: Number, default: 24 },      // px below top
  vibrateOnNext: { type: Boolean, default: true }
})

/* STATE */
const visible = ref(true)
let timer = null

/* COMPUTED */
const hasProgress = computed(() => props.queueSize > 0 && props.position > 0)
const pct = computed(() => {
  if (!hasProgress.value) return 0
  const p = 1 - (props.position - 1) / Math.max(1, props.queueSize)
  return Math.round(p * 100)
})
const etaSec = computed(() => {
  if (!props.avgTurnSec || !props.position) return 0
  // if next => small buffer; otherwise (position-1) turns ahead
  const turnsAhead = Math.max(0, props.position - 1)
  return Math.round(turnsAhead * props.avgTurnSec)
})
const etaPretty = computed(() => {
  const s = etaSec.value
  if (s <= 0) return 'soon'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return r ? `${m}m ${r}s` : `${m}m`
})

const dotCount = computed(() => Math.min(6, Math.max(1, props.queueSize || 0)))
const filledDots = computed(() => {
  if (!props.queueSize || !props.position) return 0
  const filled = Math.round((pct.value / 100) * dotCount.value)
  return Math.min(dotCount.value, Math.max(0, filled))
})

const placementClass = computed(() =>
  props.placement === 'top'
    ? 'top-0 left-1/2 -translate-x-1/2'
    : 'bottom-0 left-1/2 -translate-x-1/2'
)
const offsetStyle = computed(() =>
  props.placement === 'top'
    ? { top: `calc(${props.topOffset}px + env(safe-area-inset-top, 0px))` }
    : { bottom: `calc(${props.bottomOffset}px + env(safe-area-inset-bottom, 0px))` }
)

const glowStyle = computed(() => ({
  background:
    'radial-gradient(120px 60px at 50% 100%, rgba(251, 191, 36, .25), transparent 70%)'
}))

/* HAPTICS */
function vibrate(ms = 18){ try { navigator.vibrate?.(ms) } catch(_){} }

/* SHOW/HIDE LOGIC */
function armTimer(){
  clearTimeout(timer)
  const keep = props.persistOnNext && props.status === 'next'
  const ms = keep ? Math.max(9000, props.durationMs) : props.durationMs
  timer = setTimeout(() => { visible.value = false }, ms)
}
function reshow(){
  visible.value = true
  armTimer()
}
watch(() => [props.status, props.position, props.queueSize], (nv, ov) => {
  reshow()
  if (props.vibrateOnNext && props.status === 'next') vibrate(30)
})

onMounted(() => armTimer())
onBeforeUnmount(() => clearTimeout(timer))

/* SWIPE TO DISMISS (vertical) */
const dragging = ref(false)
const dragStartY = ref(0)
const dragY = ref(0)
const threshold = 60

function onPointerDown(e){ dragging.value = true; dragStartY.value = e.clientY; dragY.value = 0 }
function onPointerMove(e){
  if (!dragging.value) return
  const dy = e.clientY - dragStartY.value
  // allow swipe away in the direction of placement
  dragY.value = dy
}
function onPointerUp(){
  if (!dragging.value) return
  dragging.value = false
  const commit =
    (props.placement === 'bottom' && dragY.value > threshold) ||
    (props.placement === 'top' && dragY.value < -threshold)
  if (commit) {
    vibrate(12)
    visible.value = false
    clearTimeout(timer)
  } else {
    dragY.value = 0
  }
}
function onPointerCancel(){ dragging.value = false; dragY.value = 0 }
</script>

<style scoped>
/* Enter/leave */
.toast-enter-active, .toast-leave-active { transition: opacity .18s ease, transform .18s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(6px) scale(.98); }

/* Reduce motion */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: none; }
}
</style>
