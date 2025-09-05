<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="ids.title"
      @click.self="onDecline('backdrop')"
      :style="safeArea"
    >
      <div
        ref="cardEl"
        class="relative bg-white dark:bg-[#0b1020] text-black dark:text-white rounded-2xl shadow-2xl w-[92vw] max-w-sm p-5 text-center select-none overflow-hidden"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <!-- Countdown ring -->
        <svg class="absolute -top-6 -right-6" width="92" height="92" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="16" stroke="currentColor" stroke-width="2.5" fill="none" class="text-black/10 dark:text-white/15" />
          <circle
            cx="18" cy="18" r="16"
            stroke="url(#grad)"
            stroke-width="3.5"
            fill="none"
            stroke-linecap="round"
            :stroke-dasharray="circ"
            :stroke-dashoffset="dashOffset"
            style="transition: stroke-dashoffset .25s linear"
          />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#22c55e" />
              <stop offset="100%" stop-color="#ef4444" />
            </linearGradient>
          </defs>
        </svg>

        <!-- Header -->
        <h3 :id="ids.title" class="text-base font-extrabold mb-1">🙋‍♂️ Join Request</h3>
        <p class="text-sm mb-3">
          <span class="font-bold text-indigo-600">{{ request?.name || 'Guest' }}</span>
          is requesting to join the stream!
        </p>

        <!-- Avatar + badges -->
        <div class="flex items-center justify-center mb-3">
          <div class="relative">
            <img
              :src="request?.avatar || fallbackAvatar"
              alt=""
              class="w-16 h-16 rounded-full object-cover ring-2 ring-white/70 shadow"
            />
            <span v-if="trending" class="absolute -bottom-1 -right-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-400 text-black font-bold shadow">TRENDING</span>
          </div>
        </div>

        <!-- AI tip -->
        <p v-if="trending" class="text-xs text-yellow-500 italic mb-2">
          💡 We suggest you accept — this session is 🔥 trending!
        </p>

        <!-- Timer -->
        <div class="text-xs text-gray-600 dark:text-gray-300 mb-4">
          Respond in <span class="font-bold">{{ secondsLeft }}</span>s
          <span class="opacity-70">· auto-decline if no response</span>
        </div>

        <!-- Actions -->
        <div class="flex justify-center gap-3">
          <button
            @click="onAccept('tap')"
            class="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-full shadow active:translate-y-[1px]"
          >
            ✅ Accept
          </button>
          <button
            @click="onDecline('tap')"
            class="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-full shadow active:translate-y-[1px]"
          >
            ❌ Decline
          </button>
        </div>

        <!-- Hints -->
        <div class="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          Swipe ➡️ to accept · Swipe ⬅️ to decline · Y/N keys
        </div>

        <!-- Close (corner) -->
        <button
          class="absolute top-2 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
          @click="onDecline('close')"
          aria-label="Close"
          title="Close"
        >×</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/** Props */
const props = defineProps({
  modelValue: { type: Boolean, default: true }, // control visibility
  request: { type: Object, required: true },
  trending: { type: Boolean, default: false },
  durationSec: { type: Number, default: 12 },   // countdown seconds
  autoDecline: { type: Boolean, default: true },
  haptics: { type: Boolean, default: true }
})

/** Emits */
const emit = defineEmits(['update:modelValue','respond','timeout','open','close'])

/** State */
const visible = ref(!!props.modelValue)
watch(() => props.modelValue, v => { visible.value = v; if (v) open() })
watch(visible, v => emit('update:modelValue', v))

const startAt = ref(0)
const now = ref(Date.now())
let tick = null

/** Countdown math */
const circ = 2 * Math.PI * 16
const elapsed = computed(() => Math.max(0, (now.value - startAt.value) / 1000))
const secondsLeft = computed(() => Math.max(0, Math.ceil(props.durationSec - elapsed.value)))
const dashOffset = computed(() => {
  const p = Math.min(1, elapsed.value / props.durationSec)
  return circ * (1 - p)
})

/** Lifecycle */
onMounted(() => { if (visible.value) open(); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { stopTimer(); window.removeEventListener('keydown', onKey) })

/** Open/close helpers */
function open(){
  startAt.value = Date.now()
  stopTimer()
  tick = setInterval(() => {
    now.value = Date.now()
    if (props.autoDecline && secondsLeft.value <= 0) onDecline('timeout')
  }, 250)
  emit('open')
  nextTick(() => focusFirst())
}
function close(){
  visible.value = false
  stopTimer()
  emit('close')
}
function stopTimer(){ if (tick) clearInterval(tick); tick = null }

/** Actions */
function onAccept(source='tap'){
  vibe(10)
  visible.value = false
  stopTimer()
  emit('respond', { accepted: true, guest: props.request, source })
}
function onDecline(source='tap'){
  const isTimeout = source === 'timeout'
  if (props.autoDecline || !isTimeout) {
    vibe(6)
    visible.value = false
    stopTimer()
    emit('respond', { accepted: false, guest: props.request, source })
    if (isTimeout) emit('timeout', props.request)
  }
}

/** Keyboard shortcuts */
function onKey(e){
  if (!visible.value) return
  const k = e.key.toLowerCase()
  if (k === 'y' || k === 'enter') { e.preventDefault(); onAccept('key') }
  else if (k === 'n' || k === 'escape') { e.preventDefault(); onDecline('key') }
}

/** Swipe gestures */
const touch = ref({ x: 0, dx: 0 })
const cardEl = ref(null)
function onTouchStart(e){ touch.value = { x: e.touches[0].clientX, dx: 0 } }
function onTouchMove(e){
  const dx = e.touches[0].clientX - touch.value.x
  touch.value.dx = dx
  // tiny visual nudge
  cardEl.value && (cardEl.value.style.transform = `translateX(${Math.max(-60, Math.min(60, dx))}px)`)
}
function onTouchEnd(){
  const dx = touch.value.dx
  if (dx > 60) onAccept('swipe')
  else if (dx < -60) onDecline('swipe')
  if (cardEl.value) cardEl.value.style.transform = ''
  touch.value = { x: 0, dx: 0 }
}

/** Focus helper */
function focusFirst(){
  try {
    const btn = cardEl.value?.querySelector('button[class*="bg-green"]')
    btn?.focus?.()
  } catch {}
}

/** Haptics */
function vibe(ms){ if (!props.haptics) return; try { navigator.vibrate?.(ms) } catch {} }

/** Misc */
const fallbackAvatar = '/user-avatar.png'
const safeArea = { padding: 'env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px)' }
const ids = { title: 'jr-title-' + Math.random().toString(36).slice(2,7) }
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
