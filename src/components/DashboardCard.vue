<template>
  <component
    :is="href ? 'a' : clickable ? 'button' : 'div'"
    :href="href || undefined"
    :target="href ? target : undefined"
    :rel="href ? 'noopener noreferrer' : undefined"
    class="group relative w-full max-w-full touch-manipulation select-none outline-none"
    :class="[
      'rounded-2xl p-[1px] transition active:scale-[.995]',
      disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer',
      gradientClass
    ]"
    @click="onPress"
    :aria-label="aria"
  >
    <!-- card body -->
    <div
      class="relative flex flex-col items-center justify-center text-center rounded-2xl bg-white/90 dark:bg-slate-900/70 backdrop-blur shadow-md ring-1 ring-black/5 dark:ring-white/10 px-4 py-4 md:px-6 md:py-6"
    >
      <!-- Loading skeleton -->
      <div v-if="loading" class="w-full animate-pulse">
        <div class="mx-auto h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 mb-3"></div>
        <div class="h-3 w-2/3 mx-auto rounded bg-slate-200 dark:bg-slate-700 mb-2"></div>
        <div class="h-6 w-1/2 mx-auto rounded bg-slate-200 dark:bg-slate-700"></div>
      </div>

      <!-- Content -->
      <div v-else class="w-full">
        <!-- Icon -->
        <div
          class="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-white/70 to-white/40 dark:from-white/10 dark:to-white/5 ring-1 ring-black/5 dark:ring-white/10 shadow-sm"
        >
          <i v-if="icon" :class="[icon, 'text-2xl md:text-3xl text-[var(--tone)]']"></i>
          <slot v-else name="icon"></slot>
        </div>

        <!-- Title -->
        <h4 class="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
          {{ title }}
        </h4>

        <!-- Value -->
        <p
          class="mt-1 font-extrabold tabular-nums tracking-tight text-2xl md:text-3xl"
          :class="valueTone"
        >
          <span v-if="prefix" class="opacity-80 mr-0.5">{{ prefix }}</span>
          {{ formatted }}
          <span v-if="suffix" class="opacity-80 ml-0.5">{{ suffix }}</span>
        </p>

        <!-- Delta + subtext + sparkline -->
        <div class="mt-2 flex items-center justify-center gap-2">
          <span
            v-if="showDelta"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1"
            :class="deltaClass"
          >
            <i :class="deltaIcon"></i>
            {{ deltaLabel }}
          </span>

          <span v-if="subtext" class="text-[11px] md:text-xs text-slate-500 dark:text-slate-300">
            {{ subtext }}
          </span>
        </div>

        <div v-if="sparkline && sparkline.length > 1" class="mt-3 h-10 w-full">
          <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-full">
            <defs>
              <linearGradient :id="gradId" x1="0" y1="0" :x2="W" y2="0">
                <stop offset="0%" :stop-color="toneHex" stop-opacity="1"/>
                <stop offset="100%" :stop-color="toneHex" stop-opacity="0.35"/>
              </linearGradient>
            </defs>
            <path :d="areaPath" :fill="`url(#${gradId})`" opacity="0.18"/>
            <path :d="linePath" :stroke="toneHex" stroke-width="2" fill="none"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: '' },                 // e.g., 'i-tabler-coin'
  title: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  format: { type: String, default: 'auto' },           // 'auto' | 'number' | 'currency' | 'percent' | 'string'
  currency: { type: String, default: 'USD' },
  locale: { type: String, default: undefined },         // defaults to browser
  minimumFractionDigits: { type: Number, default: 0 },
  maximumFractionDigits: { type: Number, default: 2 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },

  delta: { type: Number, default: null },               // positive/negative => up/down
  deltaMode: { type: String, default: 'auto' },         // 'auto' | 'absolute' | 'percent'
  subtext: { type: String, default: '' },

  sparkline: { type: Array, default: () => [] },        // numbers
  tone: { type: String, default: 'indigo' },            // indigo | emerald | rose | amber | sky | violet …
  clickable: { type: Boolean, default: false },
  href: { type: String, default: '' },
  target: { type: String, default: '_blank' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['press'])

/* ----- Formatting ----- */
const isNumeric = (v) => typeof v === 'number' || (!isNaN(parseFloat(v)) && isFinite(v))
const normValue = computed(() => (isNumeric(props.value) ? Number(props.value) : props.value))

const formatted = computed(() => {
  if (!isNumeric(props.value) || props.format === 'string') return String(props.value ?? '—')
  const n = Number(props.value)
  const opt = {
    minimumFractionDigits: props.minimumFractionDigits,
    maximumFractionDigits: props.maximumFractionDigits,
  }
  if (props.format === 'currency') {
    return new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.currency, ...opt }).format(n)
  }
  if (props.format === 'percent') {
    return new Intl.NumberFormat(props.locale, { style: 'percent', ...opt }).format(n)
  }
  if (props.format === 'number' || props.format === 'auto') {
    return new Intl.NumberFormat(props.locale, opt).format(n)
  }
  return String(n)
})

/* ----- Delta chip ----- */
const showDelta = computed(() => props.delta !== null && !isNaN(props.delta))
const trend = computed(() => (props.delta > 0 ? 'up' : props.delta < 0 ? 'down' : 'flat'))

const deltaLabel = computed(() => {
  if (!showDelta.value) return ''
  if (props.deltaMode === 'percent' || (props.deltaMode === 'auto' && Math.abs(props.delta) <= 1 && Math.abs(props.delta) >= 0 && String(props.value).includes('%')))
    return `${(props.delta).toFixed(2)}%`
  const isPctMode = props.deltaMode === 'percent'
  return isPctMode ? `${props.delta.toFixed(2)}%` : `${props.delta > 0 ? '+' : ''}${props.delta}`
})

const deltaIcon = computed(() =>
  trend.value === 'up' ? 'i-tabler-arrow-up-right text-emerald-500'
  : trend.value === 'down' ? 'i-tabler-arrow-down-right text-rose-500'
  : 'i-tabler-minus text-slate-400'
)
const deltaClass = computed(() => ({
  'bg-emerald-50 text-emerald-700 ring-emerald-200': trend.value === 'up',
  'bg-rose-50 text-rose-700 ring-rose-200': trend.value === 'down',
  'bg-slate-50 text-slate-600 ring-slate-200': trend.value === 'flat',
}))

/* ----- Tones / gradient ring ----- */
const toneMap = {
  indigo:  { hex: '#6366f1', grad: 'from-indigo-400/40 via-indigo-500/30 to-indigo-600/40' },
  emerald: { hex: '#10b981', grad: 'from-emerald-400/40 via-emerald-500/30 to-emerald-600/40' },
  rose:    { hex: '#f43f5e', grad: 'from-rose-400/40 via-rose-500/30 to-rose-600/40' },
  amber:   { hex: '#f59e0b', grad: 'from-amber-400/40 via-amber-500/30 to-amber-600/40' },
  sky:     { hex: '#0ea5e9', grad: 'from-sky-400/40 via-sky-500/30 to-sky-600/40' },
  violet:  { hex: '#8b5cf6', grad: 'from-violet-400/40 via-violet-500/30 to-violet-600/40' },
}
const toneHex = computed(() => (toneMap[props.tone]?.hex ?? toneMap.indigo.hex))
const gradientClass = computed(() =>
  `bg-gradient-to-br ${toneMap[props.tone]?.grad ?? toneMap.indigo.grad}`
)
const valueTone = computed(() =>
  trend.value === 'up' ? 'text-emerald-600 dark:text-emerald-400'
  : trend.value === 'down' ? 'text-rose-600 dark:text-rose-400'
  : 'text-slate-900 dark:text-white'
)

/* ----- Sparkline (SVG) ----- */
const W = 120, H = 36, P = 2
const minY = (arr) => Math.min(...arr)
const maxY = (arr) => Math.max(...arr)
const scaleX = (i, n) => (n <= 1 ? P : P + (i * (W - P * 2)) / (n - 1))
const scaleY = (v, lo, hi) => {
  if (hi === lo) return H / 2
  const t = (v - lo) / (hi - lo)
  return H - (P + t * (H - P * 2))
}
const linePath = computed(() => {
  const a = props.sparkline || []
  if (!a.length) return ''
  const lo = minY(a), hi = maxY(a)
  return a.map((v, i) => `${i ? 'L' : 'M'} ${scaleX(i, a.length)} ${scaleY(v, lo, hi)}`).join(' ')
})
const areaPath = computed(() => {
  const a = props.sparkline || []
  if (!a.length) return ''
  const lo = minY(a), hi = maxY(a)
  const top = a.map((v, i) => `${i ? 'L' : 'M'} ${scaleX(i, a.length)} ${scaleY(v, lo, hi)}`).join(' ')
  return `${top} L ${W - P} ${H - P} L ${P} ${H - P} Z`
})
const gradId = `g${Math.random().toString(36).slice(2)}`

/* ----- A11y & interactions ----- */
const aria = computed(() => {
  const d = showDelta.value ? ` (${trend.value === 'up' ? 'up' : trend.value === 'down' ? 'down' : 'flat'} ${deltaLabel.value})` : ''
  return `${props.title}: ${formatted.value}${props.suffix ? ' ' + props.suffix : ''}${d}${props.subtext ? '. ' + props.subtext : ''}`
})
function onPress(e) {
  if (props.disabled) return
  emit('press', e)
}
</script>
