<!-- src/components/EffectsButton.vue -->
<template>
  <button
    :aria-label="aria"
    :disabled="disabled || loading"
    class="effects-btn w-full sm:w-auto
           inline-flex items-center justify-center gap-2
           px-4 py-3 sm:px-5 sm:py-3 rounded-2xl
           text-white shadow-lg transition-[transform,box-shadow] duration-200
           active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
           select-none relative overflow-hidden"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- soft “wings” -->
    <span class="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 h-10 w-20 rounded-full blur-2xl bg-white/10"></span>
    <span class="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 h-10 w-20 rounded-full blur-2xl bg-white/10"></span>

    <!-- animated sheen -->
    <span class="sheen pointer-events-none absolute inset-0"></span>

    <!-- icon / loader -->
    <span class="relative flex items-center justify-center">
      <span v-if="!loading" class="text-xl">✨</span>
      <svg v-else class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" class="opacity-25" />
        <path d="M21 12a9 9 0 0 1-9 9" class="opacity-90" />
      </svg>

      <!-- badge (e.g., new effects) -->
      <span
        v-if="count && count > 0"
        class="absolute -right-2 -top-2 min-w-[20px] h-[20px] px-1
               rounded-full text-[11px] leading-[20px] text-black
               bg-gradient-to-br from-amber-300 to-yellow-400 font-bold
               border border-black/10 shadow-md"
      >
        {{ shortCount }}
      </span>
    </span>

    <!-- label (truncates on tiny screens) -->
    <span class="font-semibold tracking-wide text-sm sm:text-base max-w-[12ch] truncate">
      {{ label }}
    </span>

    <!-- active glow dot -->
    <span
      v-if="active"
      class="ml-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
  active?: boolean
  disabled?: boolean
  loading?: boolean
  count?: number
  aria?: string
}>(), {
  label: 'Effects',
  active: false,
  disabled: false,
  loading: false,
  count: 0,
  aria: 'Open Effects'
})

const emit = defineEmits<{
  (e: 'effects-open'): void
  (e: 'effects-longpress'): void
}>()

function onClick() {
  if (!pressing.value) emit('effects-open')
}

/* press & hold to open full effects panel */
const holdMs = 450
const timer = ref<number | null>(null)
const pressing = ref(false)

function onPointerDown() {
  pressing.value = true
  timer.value = window.setTimeout(() => {
    if (pressing.value) emit('effects-longpress')
  }, holdMs)
}
function onPointerUp() {
  pressing.value = false
  if (timer.value) {
    clearTimeout(timer.value)
    timer.value = null
  }
}

onBeforeUnmount(() => {
  if (timer.value) clearTimeout(timer.value)
})

/* count formatter */
const shortCount = computed(() => {
  const n = props.count ?? 0
  if (n < 1000) return n
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1_000_000) return Math.round(n / 1000) + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
})
</script>

<style scoped>
/* Mobile-first glassy gradient with depth */
.effects-btn {
  background: linear-gradient(100deg, #7c3aed 0%, #ec4899 50%, #4f46e5 100%);
  background-size: 180% 180%;
  border: 1px solid rgba(255,255,255,.10);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 8px 18px rgba(0,0,0,.25),
    0 4px 12px rgba(147,51,234,.25);
  backdrop-filter: blur(10px);
}
.effects-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    0 10px 22px rgba(0,0,0,.28),
    0 6px 14px rgba(236,72,153,.30);
}

/* animated sheen sweeping across */
.sheen::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(115deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,.18) 35%,
    rgba(255,255,255,0) 70%);
  transform: translateX(-120%);
  animation: sheenMove 2.8s linear infinite;
}
@keyframes sheenMove {
  0% { transform: translateX(-120%); }
  60% { transform: translateX(120%); }
  100% { transform: translateX(120%); }
}

/* reduce motion preference */
@media (prefers-reduced-motion: reduce) {
  .effects-btn, .sheen::before { animation: none !important; }
}
</style>
