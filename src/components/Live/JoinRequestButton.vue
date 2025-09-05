<!-- JoinRequestButton.vue -->
<template>
  <div
    class="fixed z-40 inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-4 flex justify-center sm:justify-end sm:pr-4"
    role="group"
    aria-label="Guest request controls"
  >
    <div class="w-[92vw] sm:w-auto max-w-sm">
      <!-- Main button -->
      <button
        :disabled="disabled"
        @click="onTap()"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2
               rounded-full px-5 py-3 text-sm font-semibold shadow-lg
               text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
               disabled:opacity-60 disabled:cursor-not-allowed
               focus:outline-none focus:ring-2 focus:ring-indigo-300
               dark:focus:ring-indigo-500"
        :aria-busy="pending ? 'true' : 'false'"
      >
        <!-- Status dot -->
        <span class="relative inline-flex h-2.5 w-2.5">
          <span
            v-if="pending && !reducedMotion"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70"
          ></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-white"></span>
        </span>

        <span v-if="!requested && !pending">🙋‍♂️ Request to Join</span>
        <span v-else-if="pending">📡 Sending…</span>
        <span v-else-if="cooldownLeft > 0">⏳ Wait {{ cooldownLeft }}s</span>
        <span v-else>🔁 Retry?</span>

        <!-- ETA ring (cooldown) -->
        <span
          v-if="cooldownTotal>0"
          class="relative grid place-items-center h-6 w-6 rounded-full text-[10px] font-bold bg-transparent"
          :style="ringStyle"
          :aria-label="`Seconds left ${cooldownLeft}`"
        >
          <span class="absolute inset-[2px] rounded-full bg-white/20"></span>
          <span class="relative z-10">{{ Math.max(cooldownLeft, 0) }}</span>
        </span>
      </button>

      <!-- Linear progress (cooldown) -->
      <div v-if="cooldownTotal>0" class="mt-2 h-1 w-full rounded-full bg-white/25 overflow-hidden">
        <div class="h-full bg-white/80" :style="{ width: progressWidth }"></div>
      </div>

      <!-- Smart message -->
      <p
        v-if="smartMessage"
        class="mt-2 text-[12px] leading-5 text-white text-center bg-black/60 dark:bg-zinc-900/70 rounded-xl px-3 py-2 ring-1 ring-white/10"
        aria-live="polite"
      >
        🤖 {{ smartMessage }}
      </p>

      <!-- Sub-hints (network/offline) -->
      <p v-if="!online" class="mt-1 text-[11px] text-amber-200/90 text-center">
        You’re offline — we’ll retry when back online.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * Props you can tweak from parent:
 * - streamFull: boolean (true if all guest slots are full)
 * - minCooldown: base cooldown seconds after each try
 * - backoffFactor: multiplier for retries (e.g., 1.7)
 * - maxCooldown: clamp cooldown seconds
 * - storageKey: persist last request to stop spam across reloads
 * - payload: object merged into emitted event
 */
const props = defineProps({
  streamFull: { type: Boolean, default: false },
  minCooldown: { type: Number, default: 20 },
  backoffFactor: { type: Number, default: 1.7 },
  maxCooldown: { type: Number, default: 120 },
  storageKey: { type: String, default: 'join_request_meta' },
  payload: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'request-sent',    // (payload)
  'notify-host',     // ()
  'cancelled',       // ({ reason })
  'error'            // ({ code, message })
])

/* ---------- State ---------- */
const online = ref(navigator.onLine)
const pending = ref(false)
const requested = ref(false)

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

// Cooldown handling (exponential backoff)
const cooldownLeft = ref(0)
const cooldownTotal = ref(0)
const attempts = ref(0)

const smartMessage = ref('')
let cdTimer = null
let visibilityBound = false

// Long-press to cancel the “pending” state (before cooldown starts)
let touchHoldTimer = null
const HOLD_MS = 600

/* ---------- Haptics ---------- */
function buzz(ms=16){ try{ navigator?.vibrate?.(ms) }catch{} }

/* ---------- Storage helpers ---------- */
function saveMeta() {
  const meta = { attempts: attempts.value, until: Date.now() + cooldownLeft.value * 1000 }
  try { sessionStorage.setItem(props.storageKey, JSON.stringify(meta)) } catch {}
}
function loadMeta() {
  try {
    const raw = sessionStorage.getItem(props.storageKey)
    if (!raw) return
    const meta = JSON.parse(raw)
    attempts.value = Number(meta.attempts||0)
    const remainMs = Math.max(0, (meta.until||0) - Date.now())
    if (remainMs > 0) {
      startCooldown(Math.ceil(remainMs/1000), false)
    }
  } catch {}
}

/* ---------- Cooldown ---------- */
function startCooldown(sec, incrementAttempt = true) {
  stopCooldown()
  cooldownLeft.value = sec
  cooldownTotal.value = sec
  if (incrementAttempt) attempts.value += 1
  saveMeta()

  cdTimer = setInterval(() => {
    cooldownLeft.value -= 1
    if (cooldownLeft.value <= 0) {
      stopCooldown()
      smartMessage.value = 'No response. You may retry.'
      requested.value = false
    } else if (cooldownLeft.value <= 3 && !reducedMotion) {
      buzz(10)
    }
  }, 1000)
}
function stopCooldown() {
  if (cdTimer) { clearInterval(cdTimer); cdTimer = null }
  cooldownLeft.value = Math.max(cooldownLeft.value, 0)
  cooldownTotal.value = Math.max(cooldownTotal.value, 0)
}

/* ---------- Computed UI ---------- */
const disabled = computed(() => pending.value || cooldownLeft.value > 0)
const progressWidth = computed(() => {
  if (cooldownTotal.value <= 0) return '0%'
  const used = Math.max(0, cooldownTotal.value - cooldownLeft.value)
  return `${Math.min(100, (used / cooldownTotal.value) * 100)}%`
})
const ringStyle = computed(() => {
  if (cooldownTotal.value <= 0) return {}
  const pct = Math.min((cooldownLeft.value / cooldownTotal.value) * 100, 100)
  const deg = (pct/100) * 360
  return { background: `conic-gradient(rgba(255,255,255,.95) ${deg}deg, rgba(255,255,255,.25) 0deg)` }
})

/* ---------- Actions ---------- */
async function onTap() {
  if (disabled.value) return
  if (!online.value) {
    smartMessage.value = 'No internet. We’ll retry automatically when you’re online.'
    if (!reducedMotion) buzz(14)
    // Minimal backoff to avoid spam clicks while offline
    return startCooldown(8, false)
  }

  if (props.streamFull) {
    smartMessage.value = 'All guest slots are full. We will notify you once a slot opens.'
    if (!reducedMotion) buzz(12)
    // small courtesy cooldown to prevent repeated taps
    return startCooldown(10, false)
  }

  // Send request
  try {
    pending.value = true
    requested.value = true
    smartMessage.value = 'Request sent to host. Please wait…'
    if (!reducedMotion) buzz(18)

    // Emit data to parent (parent handles actual API/send)
    const payload = {
      name: 'You (Guest)',
      avatar: '/you-avatar.png',
      timestamp: Date.now(),
      ...props.payload
    }
    emit('request-sent', payload)
    emit('notify-host')

    // Simulate server acknowledgement wait (parent may also flip states via props)
    await sleep(600)

    // Start exponential backoff cooldown window
    const next = Math.min(
      Math.round((attempts.value === 0 ? props.minCooldown : props.minCooldown * Math.pow(props.backoffFactor, attempts.value))),
      props.maxCooldown
    )
    startCooldown(next, true)
  } catch (e) {
    pending.value = false
    requested.value = false
    smartMessage.value = 'Failed to send request. Check connection and try again.'
    emit('error', { code: 'SEND_FAILED', message: (e?.message || 'Unknown error') })
    startCooldown(8, false)
  } finally {
    pending.value = false
  }
}

function onTouchStart() {
  // long-press to cancel pending (before cooldown)
  if (!requested.value || cooldownLeft.value > 0) return
  touchHoldTimer = setTimeout(() => {
    if (pending.value) {
      pending.value = false
      requested.value = false
      smartMessage.value = 'Cancelled before sending.'
      emit('cancelled', { reason: 'long-press' })
    }
  }, HOLD_MS)
}
function onTouchEnd() {
  clearTimeout(touchHoldTimer)
}

/* ---------- Online/visibility ---------- */
function onOnline(){ online.value = true; smartMessage.value = 'Back online. You can retry.' }
function onOffline(){ online.value = false }
function onVisibility(){
  if (document.hidden) { /* do nothing (countdown keeps going) */ }
  else { /* could refresh UI if needed */ }
}

/* ---------- Utils ---------- */
function sleep(ms){ return new Promise(r => setTimeout(r, ms)) }

/* ---------- Lifecycle ---------- */
onMounted(() => {
  loadMeta()
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisibility)
  visibilityBound = true
})
onBeforeUnmount(() => {
  stopCooldown()
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  if (visibilityBound) document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
/* No extra styles needed — Tailwind/Uno utility classes used.
   Works great with reduced motion too. */
</style>
