<!-- StatChipMobile.vue -->
<template>
  <!-- Use button semantics when clickable for better mobile a11y -->
  <component
    :is="clickable ? 'button' : 'div'"
    class="w-full max-w-sm mx-auto rounded-2xl p-4 sm:p-5 shadow-md active:scale-[0.99] transition
           focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    :class="[palette.bg, palette.ring]"
    :aria-pressed="clickable ? 'false' : undefined"
    :role="clickable ? 'button' : 'region'"
    @click="handleClick"
    @keydown.enter.space.prevent="handleClick"
    :tabindex="clickable ? 0 : undefined"
  >
    <!-- Top row: icon + label + optional badge -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <span v-if="icon" class="text-xl leading-none" aria-hidden="true">{{ icon }}</span>
        <h3 class="text-sm font-semibold truncate" :class="palette.text">
          {{ label }}
        </h3>
      </div>

      <!-- Optional trend badge -->
      <span v-if="trend"
            class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
            :class="trendClasses.badge">
        <span aria-hidden="true">{{ trend === 'up' ? '▲' : '▼' }}</span>
        <span class="ml-1">{{ trendText }}</span>
      </span>
    </div>

    <!-- Value / loader -->
    <div class="mt-2 sm:mt-3">
      <div v-if="loading" class="h-7 sm:h-8 rounded-md animate-pulse"
           :class="palette.valueSkeleton" aria-label="Loading value"></div>

      <div v-else class="flex items-end flex-wrap gap-x-2">
        <p class="text-2xl sm:text-3xl font-extrabold leading-none" :class="palette.value" aria-live="polite">
          {{ formattedValue }}
          <span v-if="unit" class="text-sm font-semibold opacity-80 ml-1 align-baseline">{{ unit }}</span>
        </p>

        <!-- Secondary note (optional) -->
        <p v-if="subLabel" class="text-xs sm:text-[13px] opacity-80 mt-1" :class="palette.text">
          {{ subLabel }}
        </p>
      </div>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Mobile-first, Tailwind-safe palette (no dynamic class strings that get purged).
 * Add more colors here as needed.
 */
const PALETTES = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/40',
    text: 'text-indigo-800 dark:text-indigo-100',
    value: 'text-indigo-900 dark:text-white',
    valueSkeleton: 'bg-indigo-200/60 dark:bg-white/10',
    ring: 'focus-visible:ring-indigo-400 focus-visible:ring-offset-indigo-50 dark:focus-visible:ring-indigo-300 dark:focus-visible:ring-offset-indigo-900/40'
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-100',
    value: 'text-emerald-900 dark:text-white',
    valueSkeleton: 'bg-emerald-200/60 dark:bg-white/10',
    ring: 'focus-visible:ring-emerald-400 focus-visible:ring-offset-emerald-50 dark:focus-visible:ring-emerald-300 dark:focus-visible:ring-offset-emerald-900/30'
  },
  red: {
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-800 dark:text-rose-100',
    value: 'text-rose-900 dark:text-white',
    valueSkeleton: 'bg-rose-200/60 dark:bg-white/10',
    ring: 'focus-visible:ring-rose-400 focus-visible:ring-offset-rose-50 dark:focus-visible:ring-rose-300 dark:focus-visible:ring-offset-rose-900/30'
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-100',
    value: 'text-amber-900 dark:text-white',
    valueSkeleton: 'bg-amber-200/60 dark:bg-white/10',
    ring: 'focus-visible:ring-amber-400 focus-visible:ring-offset-amber-50 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-amber-900/30'
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-200',
    value: 'text-slate-900 dark:text-white',
    valueSkeleton: 'bg-slate-200/60 dark:bg-white/10',
    ring: 'focus-visible:ring-slate-400 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-white/40 dark:focus-visible:ring-offset-slate-800'
  }
}

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  color: { type: String, default: 'indigo' }, // indigo|green|red|yellow|slate
  icon: { type: String, default: '' },        // emoji or short text icon
  unit: { type: String, default: '' },        // e.g. %, Tsh, pts
  subLabel: { type: String, default: '' },    // e.g. "vs last week"
  loading: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  // formatting
  format: { type: String, default: 'auto' },  // auto|compact|comma|currency
  locale: { type: String, default: 'en-TZ' },
  currency: { type: String, default: 'TZS' },
  // trend
  trend: { type: String, default: '' },       // 'up' | 'down' | ''
  trendValue: { type: [String, Number], default: '' } // e.g. 12% or +34
})

const emit = defineEmits(['click'])

const palette = computed(() => PALETTES[props.color] || PALETTES.indigo)

const formattedValue = computed(() => {
  if (typeof props.value !== 'number') return String(props.value ?? '')
  const n = props.value

  // Choose formatter
  switch (props.format) {
    case 'compact':
      return new Intl.NumberFormat(props.locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    case 'comma':
      return new Intl.NumberFormat(props.locale).format(n)
    case 'currency':
      return new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.currency, maximumFractionDigits: 0 }).format(n)
    case 'auto':
    default: {
      if (Math.abs(n) >= 1000) {
        return new Intl.NumberFormat(props.locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
      }
      return new Intl.NumberFormat(props.locale).format(n)
    }
  }
})

const trendClasses = computed(() => {
  if (props.trend === 'up') {
    return { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' }
  }
  if (props.trend === 'down') {
    return { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200' }
  }
  return { badge: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200' }
})
const trendText = computed(() => (props.trendValue !== '' ? props.trendValue : props.trend === 'up' ? 'Up' : 'Down'))

function handleClick() {
  if (!props.clickable) return
  try { navigator?.vibrate?.(10) } catch {}
  emit('click')
}
</script>

<style scoped>
/* No extra styles needed — everything is Tailwind-first and mobile-friendly */
</style>
