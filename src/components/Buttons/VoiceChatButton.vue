<!-- src/components/VoiceChatButton.vue -->
<template>
  <button
    :aria-label="aria"
    :aria-pressed="active ? 'true' : 'false'"
    :disabled="disabled || loading"
    class="voice-btn
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
    <!-- wide “wings” -->
    <span class="pointer-events-none absolute -left-12 top-1/2 -translate-y-1/2 h-12 w-32 rounded-full blur-2xl bg-sky-400/20"></span>
    <span class="pointer-events-none absolute -right-12 top-1/2 -translate-y-1/2 h-12 w-32 rounded-full blur-2xl bg-indigo-400/20"></span>

    <!-- sheen -->
    <span class="sheen pointer-events-none absolute inset-0"></span>

    <!-- icon area -->
    <span class="relative flex items-center justify-center">
      <!-- connecting/loader -->
      <svg
        v-if="loading"
        class="animate-spin h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="9" class="opacity-25" />
        <path d="M21 12a9 9 0 0 1-9 9" class="opacity-90" />
      </svg>

      <!-- mic icon + level bars -->
      <template v-else>
        <span class="text-lg" :class="muted ? 'opacity-60' : ''">🎙️</span>
        <span class="ml-1 flex items-end gap-[2px] h-3" aria-hidden="true">
          <i class="bar" :class="barClass(0)"></i>
          <i class="bar" :class="barClass(1)"></i>
          <i class="bar" :class="barClass(2)"></i>
        </span>
      </template>

      <!-- badge: listeners / speakers -->
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
    <span class="whitespace-nowrap">
      {{ label }}<span v-if="muted"> (Muted)</span>
    </span>

    <!-- active/muted dot -->
    <span
      v-if="active && !muted"
      class="absolute right-1 bottom-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
      aria-hidden="true"
    />
    <span
      v-else-if="active && muted"
      class="absolute right-1 bottom-1 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_0_4px_rgba(244,63,94,0.25)]"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
  active?: boolean        // voice room joined
  muted?: boolean         // local mic muted
  disabled?: boolean
  loading?: boolean       // connecting state
  count?: number          // listeners/speakers count
  level?: number          // 0..1 mic level for bars
  aria?: string
}>(), {
  label: 'Voice Chat',
  active: false,
  muted: false,
  disabled: false,
  loading: false,
  count: 0,
  level: 0,               // pass real-time level if you have it
  aria: 'Toggle voice chat'
})

const emit = defineEmits<{
  (e: 'toggle-voice'): void
  (e: 'open-voice-settings'): void   // long-press
}>()

function onClick() {
  if (!pressing.value) emit('toggle-voice')
}

/* long-press -> open advanced settings */
const holdMs = 450
const timer = ref<number | null>(null)
const pressing = ref(false)
function onPointerDown() {
  pressing.value = true
  timer.value = window.setTimeout(() => {
    if (pressing.value) emit('open-voice-settings')
  }, holdMs)
}
function onPointerUp() {
  pressing.value = false
  if (timer.value) { clearTimeout(timer.value); timer.value = null }
}
onBeforeUnmount(() => { if (timer.value) clearTimeout(timer.value) })

/* format count */
const shortCount = computed(() => {
  const n = props.count ?? 0
  if (n < 1000) return n
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1_000_000) return Math.round(n / 1000) + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
})

/* bar animation classes based on level (0..1) */
function barClass(index: number) {
  // three bars with staggered animation; use level to modulate amplitude
  const base = props.muted ? 'bar-muted' : 'bar-anim'
  return `${base} delay-${index}`
}
</script>

<style scoped>
/* Futuristic sky→indigo glass with wings */
.voice-btn{
  background: linear-gradient(100deg, rgba(56,189,248,.96) 0%, rgba(99,102,241,.96) 55%, rgba(59,130,246,.96) 100%);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 10px 18px rgba(0,0,0,.25),
    0 6px 14px rgba(99,102,241,.28);
  backdrop-filter: blur(10px);
}
.voice-btn:hover{
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    0 12px 22px rgba(0,0,0,.30),
    0 8px 16px rgba(56,189,248,.30);
}

/* sheen */
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
  0%{ transform: translateX(-120%) }
  60%{ transform: translateX(120%) }
  100%{ transform: translateX(120%) }
}

/* mic level bars */
.bar{
  display:block; width:3px; background: currentColor; color: #fff;
  border-radius: 999px;
  height: 6px; /* base, will scale via transform */
  transform-origin: bottom center;
  opacity: .9;
}
.bar-anim{
  animation: barBounce 900ms ease-in-out infinite;
}
.bar-muted{
  opacity:.35;
}
.delay-0{ animation-delay: 0ms }
.delay-1{ animation-delay: 150ms }
.delay-2{ animation-delay: 300ms }

@keyframes barBounce{
  0%   { transform: scaleY(0.6) }
  25%  { transform: scaleY(1.0) }
  50%  { transform: scaleY(0.7) }
  75%  { transform: scaleY(1.2) }
  100% { transform: scaleY(0.6) }
}

/* reduced motion */
@media (prefers-reduced-motion: reduce){
  .voice-btn, .sheen::before, .bar-anim { animation: none !important; }
}
</style>
