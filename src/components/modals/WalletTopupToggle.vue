<!-- WalletQuickLaunch.vue -->
<template>
  <!-- Wrapper handles FAB positioning + safe-area -->
  <div
    class="pointer-events-none"
    :class="variant==='fab' ? 'fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50' : ''"
  >
    <!-- Quick Actions Popover -->
    <transition name="fade-pop">
      <div
        v-if="showQuick"
        class="pointer-events-auto mb-3 w-[86vw] max-w-[320px] rounded-2xl shadow-2xl ring-1
               bg-white/95 dark:bg-zinc-900/95 ring-black/10 dark:ring-white/10 backdrop-blur-xl
               p-3 grid grid-cols-3 gap-2"
        role="menu"
        aria-label="Wallet quick actions"
      >
        <button
          class="qa-btn"
          @click="choose('recharge')"
          :disabled="disabled || loading"
        >
          <span class="text-lg">⚡</span>
          <span class="qa-text">Top-up</span>
        </button>
        <button
          class="qa-btn"
          @click="choose('history')"
          :disabled="disabled || loading"
        >
          <span class="text-lg">📜</span>
          <span class="qa-text">History</span>
        </button>
        <button
          class="qa-btn"
          @click="choose('transfer')"
          :disabled="disabled || loading"
        >
          <span class="text-lg">💸</span>
          <span class="qa-text">Send</span>
        </button>
      </div>
    </transition>

    <!-- Main Button -->
    <button
      ref="btn"
      class="pointer-events-auto wallet-btn"
      :class="[
        variant==='fab' ? 'rounded-full' : 'rounded-full',
        disabled || loading || offline ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ]"
      :aria-label="ariaLabel"
      :aria-expanded="showQuick ? 'true':'false'"
      :disabled="disabled || loading || offline"
      @click="handleClick"
      @pointerdown="onPressStart"
      @pointerup="onPressEnd"
      @pointercancel="onPressCancel"
    >
      <!-- Icon + label -->
      <div class="flex items-center gap-2">
        <div class="relative grid place-items-center h-8 w-8 rounded-full bg-teal-600 text-white">
          <span v-if="!loading">💳</span>
          <svg v-else class="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" class="opacity-25"/>
            <path d="M4 12a8 8 0 018-8" fill="currentColor" class="opacity-75"/>
          </svg>

          <!-- Badge -->
          <span v-if="badge>0"
                class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px]
                       bg-pink-600 text-white font-bold grid place-items-center shadow">
            {{ badge > 99 ? '99+' : badge }}
          </span>
        </div>

        <!-- Pill text (hidden on very small widths if space tight) -->
        <div class="flex flex-col text-left">
          <span class="text-[12px] leading-4 opacity-80">{{ label }}</span>
          <span class="text-sm font-semibold">
            {{ displayBalance }} <span class="opacity-70">{{ currency }}</span>
          </span>
        </div>
      </div>

      <!-- Right chevron for quick menu hint -->
      <span class="ml-2 text-zinc-800/70 dark:text-zinc-100/70">▾</span>

      <!-- Ripple container -->
      <span class="ripple" aria-hidden="true"></span>
    </button>

    <!-- Offline hint -->
    <p v-if="offline" class="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
      Offline — actions disabled
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** Props */
const props = defineProps({
  label: { type: String, default: 'Wallet' },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'TZS' },
  badge: { type: Number, default: 0 },              // unread notifications, promos, etc.
  variant: { type: String, default: 'fab' },        // 'fab' | 'pill'
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  offline: { type: Boolean, default: false },
  longPressMs: { type: Number, default: 450 },      // hold to open quick actions
  enableShortcut: { type: Boolean, default: true }, // press "w" to open
})

/** Emits */
const emit = defineEmits(['open','recharge','history','transfer','quick','longpress'])

/** State */
const showQuick = ref(false)
const pressTimer = ref(null)
const btn = ref(null)
let lastTap = 0

/** Computed */
const displayBalance = computed(() => compact(props.balance))
const ariaLabel = computed(() =>
  `${props.label}. Balance ${displayBalance.value} ${props.currency}. ${props.badge>0?'Notifications '+props.badge:''}`
)

/** Helpers */
function compact(n) {
  const v = Number(n || 0)
  const abs = Math.abs(v)
  if (abs >= 1e9)  return (v/1e9).toFixed(2).replace(/\.0+$/,'') + 'B'
  if (abs >= 1e6)  return (v/1e6).toFixed(2).replace(/\.0+$/,'') + 'M'
  if (abs >= 1e3)  return (v/1e3).toFixed(1).replace(/\.0$/,'') + 'k'
  return v.toLocaleString()
}

function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/** Click / Double-tap / Long-press */
function handleClick(e){
  if (props.disabled || props.loading || props.offline) return

  // Double-tap: open quick top-up directly
  const now = Date.now()
  if (now - lastTap < 300) {
    lastTap = 0
    buzz(12)
    emit('recharge') // shortcut
    return
  }
  lastTap = now

  // Single tap toggles quick menu (or opens if disabled)
  if (!showQuick.value) {
    showQuick.value = true
  } else {
    showQuick.value = false
    emit('open') // when already expanded, tap acts as primary open
  }

  // Ripple visual
  spawnRipple(e)
}

function onPressStart(e){
  if (props.disabled || props.loading || props.offline) return
  clearTimeout(pressTimer.value)
  pressTimer.value = setTimeout(()=>{
    showQuick.value = true
    emit('longpress')
    buzz(16)
  }, props.longPressMs)
}

function onPressEnd(){ clearTimeout(pressTimer.value) }
function onPressCancel(){ clearTimeout(pressTimer.value) }

function choose(action){
  showQuick.value = false
  buzz(10)
  emit('quick', action)
  if (action === 'recharge') emit('recharge')
  else if (action === 'history') emit('history')
  else if (action === 'transfer') emit('transfer')
}

/** Keyboard shortcut (desktop) */
function onKey(e){
  if (!props.enableShortcut) return
  if (e.key.toLowerCase() === 'w') {
    e.preventDefault()
    if (!showQuick.value) { showQuick.value = true; buzz(6) }
    else { showQuick.value = false; emit('open') }
  }
}

/** Ripple effect */
function spawnRipple(e){
  const el = btn.value
  if (!el) return
  const r = el.querySelector('.ripple')
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = (e?.clientX ?? (rect.left + rect.width/2)) - rect.left - size/2
  const y = (e?.clientY ?? (rect.top + rect.height/2)) - rect.top - size/2
  r.style.width = r.style.height = size + 'px'
  r.style.left = x + 'px'
  r.style.top = y + 'px'
  r.classList.remove('ripple-anim')
  // force reflow
  void r.offsetWidth
  r.classList.add('ripple-anim')
}

/** Lifecycle */
onMounted(()=> {
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(()=> {
  document.removeEventListener('keydown', onKey)
  clearTimeout(pressTimer.value)
})
</script>

<style scoped>
/* Main button style (mobile-first) */
.wallet-btn{
  @apply bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white
         px-3 py-2 pr-2 rounded-full shadow-xl flex items-center gap-2
         transition focus:outline-none focus:ring-2 ring-white/60 dark:ring-black/40;
  min-width: 56px;
}

/* Quick action buttons */
.qa-btn{
  @apply flex flex-col items-center justify-center gap-1 py-2 rounded-xl
         bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700
         text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700
         transition;
}
.qa-text{ font-size: 12px; line-height: 1 }

/* Ripple */
.ripple{
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
}
.ripple::before{ content:'' } /* keep container non-empty */
.ripple-anim{
  position: absolute;
  background: rgba(255,255,255,0.35);
  border-radius: 9999px;
  transform: scale(0);
  animation: ripple .6s ease-out forwards;
}
@keyframes ripple{
  to{ transform: scale(1); opacity: 0 }
}

/* Popover animation */
.fade-pop-enter-active,.fade-pop-leave-active{ transition: opacity .18s ease, transform .18s ease }
.fade-pop-enter-from,.fade-pop-leave-to{ opacity: 0; transform: translateY(6px) }

/* Dark mode support */
:host,.wallet-btn{ -webkit-tap-highlight-color: transparent }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .ripple-anim{ animation: none }
  .fade-pop-enter-active,.fade-pop-leave-active{ transition: opacity .15s ease }
}
</style>
