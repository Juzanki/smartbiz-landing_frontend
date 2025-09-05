<!-- src/components/ReplayButton.vue -->
<template>
  <button
    :aria-label="aria"
    :disabled="disabled || loading"
    :aria-pressed="active ? 'true' : 'false'"
    class="replay-btn
           inline-flex flex-col items-center justify-center gap-1
           min-w-[86px] h-12 px-3 rounded-2xl
           text-white text-[11px] font-semibold tracking-wide
           shadow-lg transition-[transform,box-shadow] duration-200
           active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
           relative overflow-hidden select-none"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- “tanua wingo” glow -->
    <span class="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 h-10 w-24 rounded-full blur-2xl bg-white/10"></span>
    <span class="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 h-10 w-24 rounded-full blur-2xl bg-white/10"></span>

    <!-- animated sheen -->
    <span class="sheen pointer-events-none absolute inset-0"></span>

    <!-- icon / loader + badge -->
    <span class="relative flex items-center justify-center h-5">
      <span v-if="!loading" class="text-lg spin-slow">📼</span>
      <svg v-else class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" class="opacity-25" />
        <path d="M21 12a9 9 0 0 1-9 9" class="opacity-90" />
      </svg>

      <!-- badge (e.g., highlights count) -->
      <span
        v-if="count && count > 0"
        class="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1
               rounded-full text-[10px] leading-[18px] text-black
               bg-gradient-to-br from-amber-300 to-yellow-400 font-bold
               border border-black/10 shadow-md"
      >
        {{ shortCount }}
      </span>
    </span>

    <!-- label -->
    <span class="leading-none">{{ label }}</span>

    <!-- active dot -->
    <span
      v-if="active"
      class="absolute right-1 bottom-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
  active?: boolean
  disabled?: boolean
  loading?: boolean
  count?: number        // e.g., number of highlights/replays
  aria?: string
}>(), {
  label: 'Replay',
  active: false,
  disabled: false,
  loading: false,
  count: 0,
  aria: 'Open Replay'
})

const emit = defineEmits<{
  (e: 'toggle'): void           // tap (quick open/close)
  (e: 'open-full'): void        // long press -> open full replay panel
}>()

function onClick() {
  if (!pressing.value) emit('toggle')
}

/* Long press */
const holdMs = 450
const timer = ref<number | null>(null)
const pressing = ref(false)
function onPointerDown() {
  pressing.value = true
  timer.value = window.setTimeout(() => {
    if (pressing.value) emit('open-full')
  }, holdMs)
}
function onPointerUp() {
  pressing.value = false
  if (timer.value) { clearTimeout(timer.value); timer.value = null }
}
onBeforeUnmount(() => { if (timer.value) clearTimeout(timer.value) })

/* Count formatter */
const shortCount = computed(() => {
  const n = props.count ?? 0
  if (n < 1000) return n
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1_000_000) return Math.round(n / 1000) + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
})
</script>

<style scoped>
/* Premium teal–blue glass (mobile-first) */
.replay-btn{
  background: linear-gradient(100deg, rgba(20,184,166,.95) 0%, rgba(59,130,246,.95) 60%, rgba(56,189,248,.95) 100%);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 10px 18px rgba(0,0,0,.25),
    0 6px 14px rgba(59,130,246,.28);
  backdrop-filter: blur(10px);
}
.replay-btn:hover{
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    0 12px 22px rgba(0,0,0,.30),
    0 8px 16px rgba(20,184,166,.30);
}

/* gentle slow spin for the tape emoji */
@keyframes spinSlow { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
.spin-slow { animation: spinSlow 8s linear infinite; }

/* animated sheen */
.sheen::before{
  content:'';
  position:absolute; inset:0;
  background-image: linear-gradient(115deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,.18) 35%,
    rgba(255,255,255,0) 70%);
  transform: translateX(-120%);
  animation: sheenMove 2.6s linear infinite;
}
@keyframes sheenMove{
  0%{ transform: translateX(-120%); }
  60%{ transform: translateX(120%); }
  100%{ transform: translateX(120%); }
}

/* respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .replay-btn, .sheen::before, .spin-slow { animation: none !important; }
}
</style>
