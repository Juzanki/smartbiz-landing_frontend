<!-- src/components/CoHostButton.vue -->
<template>
  <button
    :aria-label="aria"
    :aria-pressed="active ? 'true' : 'false'"
    :disabled="disabled || loading"
    class="cohost-btn pointer-events-auto w-full sm:w-auto
           inline-flex items-center justify-center gap-2
           px-4 py-3 sm:px-5 sm:py-3 rounded-2xl
           bg-white/10 hover:bg-white/14 active:bg-white/16
           border border-white/15 backdrop-blur-xl
           text-white shadow-lg transition-all duration-200
           disabled:opacity-50 disabled:cursor-not-allowed select-none"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- Ripple -->
    <span class="absolute inset-0 overflow-hidden rounded-2xl -z-10">
      <span
        v-for="r in ripples"
        :key="r.id"
        class="absolute aspect-square rounded-full bg-white/15 scale-0 animate-[ripple_600ms_ease-out_forwards]"
        :style="{ left: r.x + 'px', top: r.y + 'px', width: r.size + 'px' }"
      />
    </span>

    <!-- Icon / Loader -->
    <span class="relative flex items-center justify-center">
      <i v-if="!loading" class="i-lucide-user-plus-2 text-lg sm:text-xl"></i>
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

      <!-- Badge (count) -->
      <span
        v-if="count && count > 0"
        class="absolute -right-2 -top-2 min-w-[20px] h-[20px]
               px-1 rounded-full text-[11px] leading-[20px] text-black
               bg-gradient-to-br from-amber-300 to-yellow-400 font-bold
               border border-black/10 shadow-md"
      >
        {{ shortCount }}
      </span>
    </span>

    <!-- Label (auto-trims on very small screens) -->
    <span class="font-semibold tracking-wide text-sm sm:text-base max-w-[12ch] truncate">
      {{ label }}
    </span>

    <!-- Active dot -->
    <span
      v-if="active"
      class="ml-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * Mobile-first, wide “Co-Host” button
 * - Emits:
 *   - toggle: when tapped/clicked
 *   - open-panel: on press-and-hold (~450ms)
 */
const props = withDefaults(defineProps<{
  label?: string
  active?: boolean
  disabled?: boolean
  loading?: boolean
  count?: number
  aria?: string
}>(), {
  label: 'Co-Host',
  active: false,
  disabled: false,
  loading: false,
  count: 0,
  aria: 'Toggle Co-Host'
})

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'open-panel'): void
}>()

function onClick() {
  if (!pressing.value) emit('toggle')
}

/* Press-and-hold to open the panel */
const holdMs = 450
const timer = ref<number | null>(null)
const pressing = ref(false)

function onPointerDown(e: PointerEvent) {
  pressing.value = true
  addRipple(e)
  timer.value = window.setTimeout(() => {
    if (pressing.value) emit('open-panel')
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

/* Count formatter (e.g., 1200 -> 1.2K) */
const shortCount = computed(() => {
  const n = props.count ?? 0
  if (n < 1000) return n
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1_000_000) return Math.round(n / 1000) + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
})

/* Tiny ripple effect */
type Ripple = { id: number; x: number; y: number; size: number }
const ripples = ref<Ripple[]>([])
let rid = 0
function addRipple(e: PointerEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.1
  ripples.value.push({
    id: ++rid,
    x: e.clientX - rect.left - size / 2,
    y: e.clientY - rect.top - size / 2,
    size
  })
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== rid)
  }, 650)
}
</script>

<style scoped>
/* Subtle neon edge & focus styles (mobile-first) */
.cohost-btn {
  position: relative;
  outline: none;
  --glow: 0 0 0 0 rgba(99,102,241,0.0);
  box-shadow:
    var(--glow),
    0 10px 20px rgba(0,0,0,0.25) inset,
    0 1px 0 rgba(255,255,255,0.06);
}
.cohost-btn:focus-visible {
  --glow: 0 0 0 6px rgba(59,130,246,0.25);
}
@keyframes ripple {
  to { transform: scale(1); opacity: 0; }
}
/* For UnoCSS/Tailwind users: the custom animation name above is mapped inline */
</style>
