<!-- src/components/SuperChatButton.vue -->
<template>
  <button
    :aria-label="aria"
    :aria-pressed="active ? 'true' : 'false'"
    :disabled="disabled || loading"
    class="superchat-btn
           inline-flex items-center justify-center gap-2
           min-w-[120px] h-12 px-4 rounded-2xl
           text-white text-sm font-semibold tracking-wide
           shadow-lg transition-[transform,box-shadow] duration-200
           active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
           relative overflow-hidden select-none"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- Wide glowing wings -->
    <span class="pointer-events-none absolute -left-10 top-1/2 -translate-y-1/2 h-12 w-28 rounded-full blur-2xl bg-pink-400/20"></span>
    <span class="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 h-12 w-28 rounded-full blur-2xl bg-purple-400/20"></span>

    <!-- Sheen sweep -->
    <span class="sheen pointer-events-none absolute inset-0"></span>

    <!-- Icon with pulse -->
    <span class="relative flex items-center justify-center">
      <span v-if="!loading" class="text-lg relative">
        <span class="absolute inset-0 animate-ping-slow rounded-full bg-gradient-to-r from-pink-400 to-purple-400 opacity-40"></span>
        💬✨
      </span>
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

      <!-- New/pending chats badge -->
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

    <!-- Label -->
    <span class="whitespace-nowrap">{{ label }}</span>

    <!-- Active status dot -->
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
  count?: number
  aria?: string
}>(), {
  label: 'Super Chat',
  active: false,
  disabled: false,
  loading: false,
  count: 0,
  aria: 'Open Super Chat'
})

const emit = defineEmits<{
  (e: 'superchat-open'): void
  (e: 'superchat-advanced'): void
}>()

function onClick() {
  if (!pressing.value) emit('superchat-open')
}

/* Long-press for advanced panel */
const holdMs = 450
const timer = ref<number | null>(null)
const pressing = ref(false)
function onPointerDown() {
  pressing.value = true
  timer.value = window.setTimeout(() => {
    if (pressing.value) emit('superchat-advanced')
  }, holdMs)
}
function onPointerUp() {
  pressing.value = false
  if (timer.value) { clearTimeout(timer.value); timer.value = null }
}
onBeforeUnmount(() => { if (timer.value) clearTimeout(timer.value) })

/* Short count format */
const shortCount = computed(() => {
  const n = props.count ?? 0
  if (n < 1000) return n
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1_000_000) return Math.round(n / 1000) + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
})
</script>

<style scoped>
.superchat-btn {
  background: linear-gradient(100deg, rgba(236,72,153,.95), rgba(139,92,246,.95), rgba(99,102,241,.95));
  border: 1px solid rgba(255,255,255,.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 10px 18px rgba(0,0,0,.25),
    0 6px 14px rgba(236,72,153,.28);
  backdrop-filter: blur(10px);
}
.superchat-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    0 12px 22px rgba(0,0,0,.30),
    0 8px 16px rgba(236,72,153,.30);
}

/* Sheen animation */
.sheen::before {
  content:'';
  position:absolute; inset:0;
  background-image: linear-gradient(115deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,.18) 35%,
    rgba(255,255,255,0) 70%);
  transform: translateX(-120%);
  animation: sheenMove 2.6s linear infinite;
}
@keyframes sheenMove {
  0% { transform: translateX(-120%); }
  60% { transform: translateX(120%); }
  100% { transform: translateX(120%); }
}

/* Slow pulse behind icon */
@keyframes pingSlow {
  0% { transform: scale(1); opacity: .4; }
  50% { transform: scale(1.5); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
}
.animate-ping-slow {
  animation: pingSlow 2.5s cubic-bezier(0,0,.2,1) infinite;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .superchat-btn, .sheen::before, .animate-ping-slow { animation: none !important; }
}
</style>
