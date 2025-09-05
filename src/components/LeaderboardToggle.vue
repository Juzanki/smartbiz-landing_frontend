<template>
  <button
    type="button"
    class="lb-btn"
    :class="[variantClass, sizeClass, fullWidth ? 'w-full' : 'inline-flex']"
    :data-variant="variant"
    :data-size="size"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click="onClick"
    @keydown.enter.space.prevent="onClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- Left icon -->
    <span class="icon" aria-hidden="true">{{ icon }}</span>

    <!-- Label -->
    <span class="label">{{ label }}</span>

    <!-- Right caret (optional) -->
    <span v-if="caret" class="caret" aria-hidden="true">›</span>

    <!-- Badge / count -->
    <span v-if="count && count>0" class="badge" :title="`${count} new`">{{ count }}</span>

    <!-- Live dot -->
    <span v-if="live" class="live-dot" title="Live"></span>

    <!-- Ripples -->
    <span
      v-for="r in ripples"
      :key="r.id"
      class="ripple"
      :style="{ left: r.x+'px', top: r.y+'px' }"
    />
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['open', 'peek'])

const props = defineProps({
  label: { type: String, default: 'Leaderboard' },
  icon: { type: String, default: '🏆' },
  size: { type: String, default: 'md', validator: v => ['sm','md','lg'].includes(v) },
  variant: { type: String, default: 'gradient', validator: v => ['solid','outline','glass','gradient'].includes(v) },
  fullWidth: { type: Boolean, default: false },
  caret: { type: Boolean, default: true },
  count: { type: Number, default: 0 },      // shows a badge (e.g., new ranks)
  live: { type: Boolean, default: false },   // pulsing live dot
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'Open leaderboard' },
})

/* Classes */
const sizeClass = computed(() => ({
  sm: 'h-10 px-4 text-[13px]',
  md: 'h-12 px-5 text-sm',
  lg: 'h-14 px-6 text-base'
}[props.size]))

const variantClass = computed(() => {
  switch (props.variant) {
    case 'solid':    return 'bg-yellow-500 hover:bg-yellow-400 text-black'
    case 'outline':  return 'bg-transparent text-yellow-700 border border-yellow-500/70 hover:bg-yellow-500/10'
    case 'glass':    return 'bg-white/15 text-white border border-white/25 backdrop-blur hover:bg-white/20'
    default:         return 'bg-gradient-to-b from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400'
  }
})

/* Ripple + haptics */
const ripples = ref([])
let rippleId = 0
function vibrate(ms=12){ try { navigator.vibrate?.(ms) } catch(_){} }
function addRipple(e){
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const id = ++rippleId
  ripples.value.push({ id, x, y })
  setTimeout(() => { ripples.value = ripples.value.filter(r => r.id !== id) }, 500)
}

/* Click / long-press */
let pressTimer = null
function onClick(e){
  if (props.disabled) return
  vibrate(10)
  addRipple(e)
  emit('open')
}
function onPointerDown(e){
  if (props.disabled) return
  pressTimer = setTimeout(() => {
    vibrate(20)
    emit('peek')            // long-press quick peek (e.g., show top 3)
    pressTimer = null
  }, 550)
}
function onPointerUp(){
  if (pressTimer){ clearTimeout(pressTimer); pressTimer = null }
}
</script>

<style scoped>
.lb-btn {
  @apply relative rounded-full select-none
         items-center justify-center gap-2
         font-semibold shadow-lg active:scale-[0.98]
         transition-transform duration-150 ease-out
         focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
         focus-visible:ring-yellow-400 focus-visible:ring-offset-black/0;
}

/* Children */
.icon  { @apply text-lg leading-none -ml-1; }
.label { @apply tracking-wide; }
.caret { @apply ml-1 text-base opacity-70; }

/* Badge */
.badge {
  @apply absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1
         grid place-items-center rounded-full
         text-[11px] font-bold text-white bg-rose-500 shadow;
}

/* Live dot */
.live-dot {
  @apply absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-emerald-500;
  box-shadow: 0 0 0 0 rgba(16,185,129,.6);
  animation: pulseDot 1.4s infinite;
}
@keyframes pulseDot {
  0%   { box-shadow: 0 0 0 0 rgba(16,185,129,.5); }
  70%  { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
  100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
}

/* Ripple */
.ripple {
  @apply pointer-events-none absolute h-6 w-6 rounded-full bg-white/50;
  transform: translate(-50%, -50%) scale(0);
  animation: ripple .5s ease-out forwards;
}
@keyframes ripple {
  to { transform: translate(-50%, -50%) scale(6); opacity: 0; }
}

/* Disabled */
.lb-btn:disabled { @apply opacity-60 cursor-not-allowed; }
</style>
