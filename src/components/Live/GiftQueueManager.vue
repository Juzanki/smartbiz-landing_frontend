<!-- src/components/Live/GiftQueueHost.vue -->
<template>
  <!-- Fixed layer; non-blocking taps -->
  <div class="fixed inset-x-0 bottom-0 z-[60] pointer-events-none pb-[max(env(safe-area-inset-bottom),0.5rem)]">
    <!-- Main animation -->
    <LiveGiftAnimations
      v-if="currentGift"
      :gift="currentGift"
      :combo-count="comboCount"
      @animation-end="onAnimEnd"
    />

    <!-- Combo badge -->
    <transition name="combo-pop">
      <div
        v-if="showComboBadge && comboCount > 1"
        class="mx-auto mb-2 w-fit max-w-[90%] px-4 py-1 rounded-full text-white text-sm font-semibold
               bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-500 shadow-lg
               backdrop-blur supports-[backdrop-filter]:backdrop-blur-md"
        aria-live="polite"
      >
        🔥 Combo x{{ comboCount }}
      </div>
    </transition>

    <!-- SR announcements -->
    <div class="sr-only" aria-live="polite">
      <span v-if="currentGift">Gift playing. {{ currentGift?.name || 'Gift' }}. Combo {{ comboCount }}.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import LiveGiftAnimations from '@/components/Live/LiveGiftAnimations.vue' // ✅ alias path

type Gift = {
  id?: string | number
  name?: string
  variant?: string
  icon?: string
  image?: string
  message?: string
}

/* Config */
const settings = ref({
  comboWindowMs: 3000,
  maxQueue: 30,
  showComboBadge: true,
  haptics: true,
})

/* State */
const giftQueue = ref<Gift[]>([])
const currentGift = ref<Gift | null>(null)
const lastGiftKey = ref<string | null>(null)
const comboCount = ref(1)
const showComboBadge = ref(true)

let comboTimer: number | null = null
let visBound = false
const reduced = typeof window !== 'undefined'
  ? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  : false

/* Helpers */
const keyOf = (g?: Gift | null) =>
  g?.id != null ? `${g.id}:${g.variant ?? 'base'}` : (g?.name ?? 'gift')

const buzz = (ms = 20) => {
  if (!settings.value.haptics) return
  try { navigator?.vibrate?.(ms) } catch {}
}

/* Public API */
function enqueueGift(g: Gift) {
  if (!g) return
  if (giftQueue.value.length >= settings.value.maxQueue) giftQueue.value.shift()
  giftQueue.value.push(g)
  if (!currentGift.value && !document.hidden) next()
}
function clearQueue() {
  giftQueue.value = []
  currentGift.value = null
  lastGiftKey.value = null
  comboCount.value = 1
  clearComboTimer()
}

/* Core */
function next() {
  if (!giftQueue.value.length || document.hidden) return
  const g = giftQueue.value.shift()!
  const k = keyOf(g)
  if (k === lastGiftKey.value) { comboCount.value += 1; if (!reduced) buzz(25) }
  else { comboCount.value = 1; lastGiftKey.value = k }
  currentGift.value = g
  resetComboWindow()
}
function onAnimEnd() {
  currentGift.value = null
  if (giftQueue.value.length) requestAnimationFrame(next)
}

/* Combo window */
function resetComboWindow() {
  clearComboTimer()
  comboTimer = window.setTimeout(() => { comboCount.value = 1; lastGiftKey.value = null }, settings.value.comboWindowMs)
}
function clearComboTimer() { if (comboTimer) { clearTimeout(comboTimer); comboTimer = null } }

/* Visibility */
function onVis() { if (!document.hidden && !currentGift.value) next() }
onMounted(() => { if (!visBound) { document.addEventListener('visibilitychange', onVis); visBound = true } })
onBeforeUnmount(() => { clearComboTimer(); if (visBound) { document.removeEventListener('visibilitychange', onVis); visBound = false } })

/* Expose to parent */
function setOptions(p: Partial<typeof settings.value>) { settings.value = { ...settings.value, ...p } }
defineExpose({
  enqueueGift, clearQueue, setOptions,
  get length() { return giftQueue.value.length },
  get playing() { return !!currentGift.value },
  get combo() { return comboCount.value },
})
</script>

<style scoped>
.combo-pop-enter-active, .combo-pop-leave-active { transition: transform 160ms ease, opacity 160ms ease }
.combo-pop-enter-from,  .combo-pop-leave-to     { transform: scale(.9); opacity: 0 }
</style>
