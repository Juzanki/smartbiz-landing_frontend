<template>
  <button
    type="button"
    class="goal-btn"
    :data-size="size"
    :disabled="disabled"
    :aria-label="label"
    @click="emit('open')"
    @keydown.enter.space.prevent="emit('open')"
  >
    <span class="icon" aria-hidden="true">🎯</span>
    <span class="label">{{ label }}</span>
    <span v-if="badge" class="badge">{{ badge }}</span>
  </button>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const emit = defineEmits(['open'])

const props = defineProps({
  label: { type: String, default: 'Goal' },          // button text
  badge: { type: [String, Number], default: '' },    // optional small counter
  size:  { type: String, default: 'md', validator: v => ['sm','md','lg'].includes(v) },
  disabled: { type: Boolean, default: false }
})
</script>

<style scoped>
/* Mobile-first: comfy tap target, high contrast, subtle depth */
.goal-btn {
  @apply relative inline-flex items-center gap-2 rounded-2xl
         font-semibold text-white select-none
         px-4 py-3    /* comfy by default for phones */
         bg-gradient-to-b from-indigo-600 to-indigo-700
         shadow-lg shadow-indigo-900/25
         active:from-indigo-700 active:to-indigo-800
         transition-transform duration-150 ease-out
         focus:outline-none focus-visible:ring-2
         focus-visible:ring-indigo-400 focus-visible:ring-offset-2
         focus-visible:ring-offset-indigo-950
         touch-manipulation;
}
.goal-btn:active { @apply scale-[0.98]; }
.goal-btn:disabled { @apply opacity-60 cursor-not-allowed; }

.icon   { @apply text-lg leading-none -ml-1; }
.label  { @apply text-sm tracking-wide; }
.badge  { @apply ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20; }

/* Size variants (optional) */
.goal-btn[data-size="sm"] { @apply px-3 py-2; }
.goal-btn[data-size="sm"] .icon  { @apply text-base; }
.goal-btn[data-size="sm"] .label { @apply text-xs; }

.goal-btn[data-size="md"] { @apply px-4 py-3; }
.goal-btn[data-size="md"] .icon  { @apply text-lg; }
.goal-btn[data-size="md"] .label { @apply text-sm; }

.goal-btn[data-size="lg"] { @apply px-5 py-4; }
.goal-btn[data-size="lg"] .icon  { @apply text-xl; }
.goal-btn[data-size="lg"] .label { @apply text-base; }

/* Desktop refinement: slightly slimmer if you like */
@media (min-width: 768px) {
  .goal-btn { @apply py-2.5; }
}
</style>
