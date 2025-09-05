<!-- GiftQueueHost.vue -->
<template>
  <!-- Fixed, mobile-first layer (safe-area + pointer-events-none so it doesn't block taps) -->
  <div
    class="fixed inset-x-0 bottom-0 z-[60] pointer-events-none pb-[max(env(safe-area-inset-bottom),0.5rem)]"
  >
    <!-- Main animation mount -->
    <LiveGiftAnimations
      v-if="currentGift"
      :gift="currentGift"
      :combo-count="comboCount"
      @animation-end="handleAnimationEnd"
    />

    <!-- 🔥 Combo / Streak badge (motivational) -->
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

    <!-- 📣 Screen-reader only announcements -->
    <div class="sr-only" aria-live="polite">
      <span v-if="currentGift">Gift playing. {{ currentGift?.name || 'Gift' }}. Combo {{ comboCount }}.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import LiveGiftAnimations from './LiveGiftAnimations.vue'

/**
 * Mobile-first, motivational gift queue host:
 * - Caps queue size to avoid overload on small devices
 * - Combo detection with a short window (default 3s)
 * - Haptics (Vibration API) on combos
 * - Pauses when tab is hidden; resumes when visible
 * - Respects prefers-reduced-motion
 * - Exposes enqueue/clear for parent usage
 */

// ====== Config (feel free to tweak from parent via methods) ======
const settings = ref({
  comboWindowMs: 3000,
  maxQueue: 30,         // hard cap to keep memory & battery happy
  showComboBadge: true,
  haptics: true,        // mobile buzz on combos
})

// ====== State ======
const giftQueue = ref([])
const currentGift = ref(null)
const lastGiftKey = ref(null)     // stable key, not just id (handles variants)
const comboCount = ref(1)

const showComboBadge = ref(true)
let comboTimer = null
let visibilityHandlerBound = false

// ====== Helpers ======
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

function stableKey(g) {
  // Make combos smarter (same gift id + variant merges)
  return g?.id != null ? `${g.id}:${g.variant ?? 'base'}` : `${g?.name ?? 'gift'}`
}

function buzz(ms = 20) {
  if (!settings.value.haptics) return
  if (navigator?.vibrate) {
    try { navigator.vibrate(ms) } catch {}
  }
}

// ====== Public API: enqueue & clear ======
function enqueueGift(gift) {
  if (!gift) return

  // Cap queue (drop oldest quietly)
  if (giftQueue.value.length >= settings.value.maxQueue) {
    giftQueue.value.shift()
  }
  giftQueue.value.push(gift)

  // Auto-start if idle and tab visible
  if (!currentGift.value && !document.hidden) {
    showNextGift()
  }
}

function clearQueue() {
  giftQueue.value = []
  currentGift.value = null
  lastGiftKey.value = null
  comboCount.value = 1
  clearTimeoutSafe()
}

// ====== Core flow ======
function showNextGift() {
  if (giftQueue.value.length === 0) return
  if (document.hidden) return // wait until visible to keep UX tight

  const nextGift = giftQueue.value.shift()
  const key = stableKey(nextGift)

  // Combo calc
  if (key === lastGiftKey.value) {
    comboCount.value += 1
    if (!reducedMotion) buzz(25) // subtle haptic on combo
  } else {
    comboCount.value = 1
    lastGiftKey.value = key
  }

  currentGift.value = nextGift

  // Reset combo window
  resetComboWindow()
}

function handleAnimationEnd() {
  currentGift.value = null
  // If there’s still a queue, continue
  if (giftQueue.value.length > 0) {
    // Small rAF delay helps layout on low-end phones
    requestAnimationFrame(() => showNextGift())
  }
}

// ====== Combo window logic ======
function resetComboWindow() {
  clearTimeoutSafe()
  comboTimer = setTimeout(() => {
    comboCount.value = 1
    lastGiftKey.value = null
  }, settings.value.comboWindowMs)
}

function clearTimeoutSafe() {
  if (comboTimer) {
    clearTimeout(comboTimer)
    comboTimer = null
  }
}

// ====== Visibility handling (pause when hidden, resume when visible) ======
function onVisibilityChange() {
  if (document.hidden) return
  // When we come back, if nothing is playing, kick off the next gift
  if (!currentGift.value) showNextGift()
}

onMounted(() => {
  if (!visibilityHandlerBound) {
    document.addEventListener('visibilitychange', onVisibilityChange)
    visibilityHandlerBound = true
  }
})

onBeforeUnmount(() => {
  clearTimeoutSafe()
  if (visibilityHandlerBound) {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    visibilityHandlerBound = false
  }
})

// ====== Expose to parent ======
function setOptions(partial) {
  settings.value = { ...settings.value, ...partial }
}
defineExpose({
  enqueueGift,
  clearQueue,
  setOptions,
  // Optional: surface a few state bits (read-only usage recommended)
  get length() { return giftQueue.value.length },
  get playing() { return !!currentGift.value },
  get combo() { return comboCount.value },
  get showComboBadge() { return showComboBadge.value },
})
</script>

<style scoped>
/* Subtle, mobile-friendly pop animation for combo badge */
.combo-pop-enter-active,
.combo-pop-leave-active {
  transition: transform 160ms ease, opacity 160ms ease;
}
.combo-pop-enter-from,
.combo-pop-leave-to {
  transform: scale(0.9);
  opacity: 0;
}
</style>
