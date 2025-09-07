<!-- src/components/Live/GiftQueueHost.vue -->
<template>
  <!-- Fixed, non-blocking layer -->
  <div
    class="fixed inset-x-0 bottom-0 pointer-events-none"
    :style="containerStyle"
    aria-label="Live gift animation host"
  >
    <!-- Main animation mount -->
    <component
      :is="GiftAnim"
      v-if="currentGift && !isPaused"
      class="pointer-events-none"
      :gift="currentGift"
      :combo-count="comboCount"
      @animation-start="onAnimStart"
      @animation-end="onAnimEnd"
    />

    <!-- Loading shim (only when component is loading and we have a gift) -->
    <div
      v-else-if="isLoadingAnim && currentGift && !isPaused"
      class="mx-auto mb-2 w-fit max-w-[92%] px-3 py-1 rounded-full text-[12px]
             bg-white/10 text-white/80 border border-white/15 backdrop-blur"
    >
      Loading gift effect…
    </div>

    <!-- Combo badge -->
    <transition name="combo-pop">
      <div
        v-if="showComboBadge && comboCount > 1"
        class="mx-auto mb-2 w-fit max-w-[92%] px-4 py-1 rounded-full text-white text-sm font-semibold
               bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-500 shadow-lg
               backdrop-blur supports-[backdrop-filter]:backdrop-blur-md pointer-events-none"
        aria-live="polite"
      >
        🔥 Combo x{{ comboCount }}
      </div>
    </transition>

    <!-- SR announcements -->
    <div class="sr-only" aria-live="polite" role="status">
      <span v-if="currentGift">
        Gift playing: {{ currentGift?.name || 'Gift' }}. Combo {{ comboCount }}.
      </span>
      <span v-else>Waiting for next gift.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent, watch, markRaw, h } from 'vue'

/** ---------- Types ---------- **/
type Gift = {
  id?: string | number
  name?: string
  variant?: string
  icon?: string
  image?: string
  message?: string
  amount?: number
  sender?: string
  tier?: string
  // …ongeza kama unahitaji
}

/** ---------- Props ---------- **/
const props = defineProps<{
  comboWindowMs?: number
  maxQueue?: number
  showComboBadge?: boolean
  haptics?: boolean
  bottomPadding?: string        // "0.5rem" etc
  zIndex?: number | string
  autoPlay?: boolean            // cheza moja kwa moja bila kusubiri wito
  pauseWhenHidden?: boolean     // pauza ukitoka screen/alt-tab
}>()

/** ---------- Defaults ---------- **/
const settings = ref({
  comboWindowMs: props.comboWindowMs ?? 3000,
  maxQueue: props.maxQueue ?? 30,
  showComboBadge: props.showComboBadge ?? true,
  haptics: props.haptics ?? true,
  autoPlay: props.autoPlay ?? true,
  pauseWhenHidden: props.pauseWhenHidden ?? true,
})

/** ---------- Style / env ---------- **/
const bottomPadding = props.bottomPadding ?? '0.5rem'
const zIndex = (props.zIndex ?? 60) + ''
const containerStyle = computed(() => ({
  paddingBottom: `max(env(safe-area-inset-bottom), ${bottomPadding})`,
  zIndex,
}))
const reducedMotion = typeof window !== 'undefined'
  ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  : false

/** ---------- Lazy component (salama, relative path) ---------- **/
const Noop = { name: 'Noop', render() { return null } }
const LoadingShim = { name: 'GiftAnimLoading', render: () => h('span') }
const isLoadingAnim = ref(false)

const GiftAnim = markRaw(defineAsyncComponent({
  loader: async () => {
    try {
      isLoadingAnim.value = true
      const mod = await import('./LiveGiftAnimation.vue')
      return mod.default ?? mod
    } finally {
      // kidogo kuchelewa kuondoa "loading" ili kuepuka flash
      setTimeout(() => { isLoadingAnim.value = false }, 60)
    }
  },
  loadingComponent: LoadingShim,
  delay: 80,
  timeout: 4000,
  suspensible: false,
  onError: () => { /* kimya; tutarender Noop endapo itashindikana */ }
})) as any

/** ---------- State ---------- **/
const giftQueue = ref<Gift[]>([])
const currentGift = ref<Gift | null>(null)
const lastGiftKey = ref<string | null>(null)
const comboCount = ref(1)
const showComboBadge = ref(settings.value.showComboBadge)
const isPaused = ref(false)

let comboTimer: number | null = null
let visBound = false

/** ---------- Emits ---------- **/
const emit = defineEmits<{
  (e: 'gift-queued', gift: Gift, qlen: number): void
  (e: 'gift-start', gift: Gift, combo: number): void
  (e: 'gift-end', gift: Gift | null, nextInQueue: number): void
  (e: 'gift-skipped', gift: Gift): void
  (e: 'combo-change', combo: number): void
  (e: 'queue-change', length: number): void
  (e: 'queue-empty'): void
  (e: 'queue-overflow', droppedGift: Gift): void
}>()

/** ---------- Helpers ---------- **/
const keyOf = (g?: Gift | null) =>
  g?.id != null ? `${g.id}:${g.variant ?? 'base'}` : (g?.name ?? 'gift')

const buzz = (ms = 20) => {
  if (!settings.value.haptics) return
  try { navigator?.vibrate?.(ms) } catch {}
}

/** ---------- Public API ---------- **/
/** Ongeza zawadi mwishoni mwa foleni */
function enqueueGift(g: Gift) {
  if (!g) return
  if (giftQueue.value.length >= settings.value.maxQueue) {
    const dropped = giftQueue.value.shift()!
    emit('queue-overflow', dropped)
  }
  giftQueue.value.push(g)
  emit('gift-queued', g, giftQueue.value.length)
  emit('queue-change', giftQueue.value.length)

  if (settings.value.autoPlay && !currentGift.value && !isPaused.value) {
    next()
  }
}

/** Weka zawadi nyingi kwa mkupuo */
function enqueueMany(list: Gift[]) {
  for (const g of list) enqueueGift(g)
}

/** Sogeza zawadi mbele ya foleni (priority) */
function priorityEnqueue(g: Gift) {
  if (!g) return
  if (giftQueue.value.length >= settings.value.maxQueue) {
    const dropped = giftQueue.value.pop()!
    emit('queue-overflow', dropped)
  }
  giftQueue.value.unshift(g)
  emit('gift-queued', g, giftQueue.value.length)
  emit('queue-change', giftQueue.value.length)
  if (!currentGift.value && !isPaused.value) next()
}

/** Ruka (skip) zawadi inayochezwa sasa */
function skipCurrent() {
  if (!currentGift.value) return
  emit('gift-skipped', currentGift.value)
  // acha LiveGiftAnimation iite animation-end yenyewe; lakini tukiruka tunamalizia hapa:
  onAnimEnd()
}

/** Pauza/Resume kwa mkono */
function pause()  { isPaused.value = true }
function resume() { isPaused.value = false; if (!currentGift.value && giftQueue.value.length) next() }

/** Safisha kila kitu */
function clearQueue() {
  giftQueue.value = []
  currentGift.value = null
  lastGiftKey.value = null
  comboCount.value = 1
  clearComboTimer()
  emit('queue-change', 0)
  emit('queue-empty')
}

/** ---------- Core playback ---------- **/
function next() {
  if (isPaused.value) return
  if (!giftQueue.value.length) { emit('queue-empty'); return }
  if (typeof document !== 'undefined' && document.hidden && settings.value.pauseWhenHidden) {
    // subiri hadi turudi visible
    return
  }

  const g = giftQueue.value.shift()!
  emit('queue-change', giftQueue.value.length)

  const k = keyOf(g)
  if (k === lastGiftKey.value) {
    comboCount.value += 1
    if (!reducedMotion) buzz(25)
  } else {
    comboCount.value = 1
    lastGiftKey.value = k
  }
  emit('combo-change', comboCount.value)

  currentGift.value = g
  resetComboWindow()
}

function onAnimStart() {
  if (currentGift.value) emit('gift-start', currentGift.value, comboCount.value)
}

function onAnimEnd() {
  const ended = currentGift.value
  currentGift.value = null
  emit('gift-end', ended, giftQueue.value.length)

  if (giftQueue.value.length && !isPaused.value) {
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(next)
    else next()
  } else if (!giftQueue.value.length) {
    emit('queue-empty')
  }
}

/** ---------- Combo window management ---------- **/
function resetComboWindow() {
  clearComboTimer()
  comboTimer = window.setTimeout(() => {
    comboCount.value = 1
    lastGiftKey.value = null
    emit('combo-change', 1)
  }, settings.value.comboWindowMs)
}
function clearComboTimer() {
  if (comboTimer) { clearTimeout(comboTimer); comboTimer = null }
}

/** ---------- Page visibility ---------- **/
function onVisChange() {
  if (document.hidden) {
    if (settings.value.pauseWhenHidden) isPaused.value = true
    return
  }
  if (settings.value.pauseWhenHidden) {
    isPaused.value = false
    if (!currentGift.value && giftQueue.value.length) next()
  }
}
onMounted(() => {
  if (!visBound) {
    document.addEventListener('visibilitychange', onVisChange)
    visBound = true
  }
})
onBeforeUnmount(() => {
  clearComboTimer()
  if (visBound) {
    document.removeEventListener('visibilitychange', onVisChange)
    visBound = false
  }
})

/** ---------- Reactive mirrors ---------- **/
watch(() => settings.value.showComboBadge, v => { showComboBadge.value = v })

/** ---------- Expose to parent ---------- **/
function setOptions(p: Partial<typeof settings.value>) { settings.value = { ...settings.value, ...p } }
defineExpose({
  enqueueGift,
  enqueueMany,
  priorityEnqueue,
  skipCurrent,
  clearQueue,
  pause,
  resume,
  setOptions,
  /** Getters */
  get length()   { return giftQueue.value.length },
  get playing()  { return !!currentGift.value },
  get combo()    { return comboCount.value },
  get paused()   { return isPaused.value },
})
</script>

<style scoped>
/* Combo badge pop */
.combo-pop-enter-active, .combo-pop-leave-active { transition: transform 160ms ease, opacity 160ms ease; }
.combo-pop-enter-from,  .combo-pop-leave-to     { transform: scale(.9); opacity: 0; }
</style>
