<!-- src/components/PinCommentButton.vue -->
<template>
  <button
    :aria-label="aria"
    :aria-pressed="active ? 'true' : 'false'"
    :disabled="disabled || loading"
    class="pin-btn
           inline-flex items-center justify-center gap-2
           min-w-[104px] h-12 px-4 rounded-2xl
           text-white text-sm font-semibold tracking-wide
           shadow-lg transition-[transform,box-shadow] duration-200
           active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
           relative overflow-hidden select-none"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- “wings” to widen presence on mobile -->
    <span class="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 h-10 w-24 rounded-full blur-2xl bg-white/10"></span>
    <span class="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 h-10 w-24 rounded-full blur-2xl bg-white/10"></span>

    <!-- sheen -->
    <span class="sheen pointer-events-none absolute inset-0"></span>

    <!-- icon / loader -->
    <span class="relative flex items-center justify-center">
      <span v-if="!loading" class="text-lg">📌</span>
      <svg
        v-else
        class="animate-spin h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="9" class="opacity-25" />
        <path d="M21 12a9 9 0 0 1-9 9" class="opacity-90" />
      </svg>

      <!-- count badge (how many are pinned) -->
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

    <span class="whitespace-nowrap">Pin Comment</span>

    <!-- active dot (when a comment is currently pinned) -->
    <span
      v-if="active"
      class="absolute right-1 bottom-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  active?: boolean        // is a comment pinned now?
  disabled?: boolean
  loading?: boolean
  count?: number          // number of pinned items
  aria?: string
}>(), {
  active: false,
  disabled: false,
  loading: false,
  count: 0,
  aria: 'Pin comment'
})

const emit = defineEmits<{
  (e: 'pin-comment'): void            // tap
  (e: 'open-pinned-panel'): void      // long-press action
}>()

function onClick() {
  if (!pressing.value) emit('pin-comment')
}

/* long-press opens the pinned comments panel */
const holdMs = 450
const timer = ref<number | null>(null)
const pressing = ref(false)
function onPointerDown() {
  pressing.value = true
  timer.value = window.setTimeout(() => {
    if (pressing.value) emit('open-pinned-panel')
  }, holdMs)
}
function onPointerUp() {
  pressing.value = false
  if (timer.value) { clearTimeout(timer.value); timer.value = null }
}
onBeforeUnmount(() => { if (timer.value) clearTimeout(timer.value) })

/* 1.2K / 3M formatter */
const shortCount = computed(() => {
  const n = props.count ?? 0
  if (n < 1000) return n
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1_000_000) return Math.round(n / 1000) + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
})
</script>

<style scoped>
/* Premium violet glass (mobile-first) */
.pin-btn{
  background: linear-gradient(100deg, rgba(139,92,246,.96) 0%, rgba(168,85,247,.96) 55%, rgba(99,102,241,.96) 100%);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 10px 18px rgba(0,0,0,.25),
    0 6px 14px rgba(139,92,246,.28);
  backdrop-filter: blur(10px);
}
.pin-btn:hover{
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    0 12px 22px rgba(0,0,0,.30),
    0 8px 16px rgba(168,85,247,.30);
}

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

/* reduced motion */
@media (prefers-reduced-motion: reduce){
  .pin-btn, .sheen::before { animation: none !important; }
}
</style>
