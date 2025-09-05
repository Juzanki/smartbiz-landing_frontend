<template>
  <transition name="toast">
    <div
      v-if="visible"
      class="fixed z-[9999] pointer-events-auto select-none"
      :class="wrapperClasses"
      role="status"
      aria-live="polite"
    >
      <!-- Swipe backdrop hints -->
      <div class="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div
          class="absolute inset-y-0 left-0 w-1/2 bg-green-500/10"
          :style="{ opacity: Math.max(0, dragX/threshold/2) }"
        />
        <div
          class="absolute inset-y-0 right-0 w-1/2 bg-red-500/10"
          :style="{ opacity: Math.max(0, -dragX/threshold/2) }"
        />
      </div>

      <!-- Card -->
      <div
        ref="card"
        class="min-w-[84vw] max-w-[92vw] md:min-w-[360px] md:max-w-[420px]
               bg-gradient-to-br from-indigo-600 to-indigo-700 text-white
               rounded-2xl shadow-2xl border border-white/15
               px-4 py-3 md:px-5 md:py-4
               backdrop-blur-md"
        :style="{
          transform: `translateX(${dragX}px) scale(${dragScale})`,
          transition: dragging ? 'none' : 'transform .18s ease'
        }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      >
        <!-- Top: countdown bar -->
        <div class="h-1 w-full bg-white/15 rounded-full overflow-hidden mb-3">
          <div class="h-full bg-white/80" :style="{ width: progress + '%' }"></div>
        </div>

        <!-- Body -->
        <div class="flex items-center gap-3">
          <!-- Avatar + pulse -->
          <div class="relative">
            <img
              :src="request.avatar || fallbackAvatar"
              alt=""
              class="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white/40 shadow"
              @error="onImgError"
            />
            <span class="absolute -inset-1 rounded-full animate-ping bg-white/10"></span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold truncate">{{ request.name }}</span>
              <span
                v-if="queueCount > 1"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15"
                :title="`${queueCount - 1} more waiting`"
              >
                +{{ queueCount - 1 }}
              </span>
            </div>
            <div class="text-xs text-white/85 truncate">
              wants to join your live!
            </div>

            <!-- Actions (mobile-first big taps) -->
            <div class="mt-2 flex items-center gap-2">
              <button
                type="button"
                class="flex-1 h-10 rounded-full font-semibold
                       bg-white text-indigo-700 active:bg-white/90"
                @click="doRespond(true, 'tap')"
              >
                ✅ Accept
              </button>
              <button
                type="button"
                class="flex-1 h-10 rounded-full font-semibold
                       bg-black/20 border border-white/25 active:bg-black/30"
                @click="doRespond(false, 'tap')"
              >
                ❌ Decline
              </button>
            </div>

            <!-- Hints -->
            <div class="mt-1 text-[10px] text-white/70">
              Swipe ➡️ to accept, ⬅️ to decline
            </div>
          </div>
        </div>
      </div>

      <!-- Tiny time-left chip -->
      <div class="mt-1 text-[11px] text-white/80 text-center">
        Auto-hide in <span class="font-semibold">{{ secsLeft }}</span>s
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  request: { type: Object, required: true },           // { id, name, avatar? }
  timeoutSec: { type: Number, default: 15 },
  queueCount: { type: Number, default: 1 },            // show how many are queued (1 = only this)
  bottomOffset: { type: Number, default: 56 },         // space above bottom nav (px)
})

const emit = defineEmits(['respond'])

const visible = ref(true)
const fallbackAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="16" ry="16" fill="%23667eea"/><text x="50%" y="54%" font-size="36" text-anchor="middle" fill="white" font-family="Arial">👤</text></svg>'

function onImgError(e){ e.target.src = fallbackAvatar }

const wrapperClasses = computed(() => [
  // bottom center on mobile, bottom-right on desktop
  'left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4',
  // respect safe-area for phones with notches
  `bottom-[calc(${props.bottomOffset}px+env(safe-area-inset-bottom,0px))]`
])

/* ----------------- Countdown ----------------- */
const startAt = ref(Date.now())
const endAt = ref(Date.now() + props.timeoutSec * 1000)
const tick = ref(0)
let timer = null

const totalMs = computed(() => endAt.value - startAt.value)
const remainingMs = computed(() => Math.max(0, endAt.value - (startAt.value + tick.value)))
const progress = computed(() => 100 - Math.round((remainingMs.value / totalMs.value) * 100))
const secsLeft = computed(() => Math.ceil(remainingMs.value / 1000))

/* ----------------- Haptics ----------------- */
function vibrate(ms=15){ try { navigator.vibrate?.(ms) } catch(_){} }

/* ----------------- Swipe logic ----------------- */
const card = ref(null)
const dragging = ref(false)
const dragStartX = ref(0)
const dragX = ref(0)
const threshold = 100   // px to commit
const dragScale = computed(() => (dragging.value ? 0.98 : 1))

function onPointerDown(e){
  dragging.value = true
  dragStartX.value = e.clientX
  dragX.value = 0
  card.value?.setPointerCapture?.(e.pointerId)
  vibrate(5)
}
function onPointerMove(e){
  if(!dragging.value) return
  dragX.value = e.clientX - dragStartX.value
}
function onPointerUp(e){
  if(!dragging.value) return
  dragging.value = false
  if (dragX.value > threshold) { vibrate(20); doRespond(true, 'swipe') }
  else if (dragX.value < -threshold) { vibrate(10); doRespond(false, 'swipe') }
  else { dragX.value = 0 }
}
function onPointerCancel(){
  dragging.value = false
  dragX.value = 0
}

/* ----------------- Respond / Auto-hide ----------------- */
function doRespond(accepted, reason){
  if (!visible.value) return
  visible.value = false
  clearInterval(timer)
  emit('respond', { accepted, request: props.request, reason })
}

onMounted(() => {
  startAt.value = Date.now()
  endAt.value = startAt.value + props.timeoutSec * 1000
  timer = setInterval(() => {
    tick.value = Date.now() - startAt.value
    if (remainingMs.value <= 0) {
      clearInterval(timer)
      doRespond(false, 'timeout')
    }
  }, 100) // smooth progress
})

onBeforeUnmount(() => { clearInterval(timer) })
</script>

<style scoped>
/* Enter/leave transition */
.toast-enter-active, .toast-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(.98);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: none; }
}
</style>
