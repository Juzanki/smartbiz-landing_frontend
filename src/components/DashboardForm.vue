<template>
  <component
    :is="href ? 'a' : clickable ? 'button' : 'div'"
    :href="href || undefined"
    :target="href ? target : undefined"
    :rel="href ? 'noopener noreferrer' : undefined"
    class="group relative w-full touch-manipulation select-none outline-none active:scale-[.995]"
    :class="[
      'rounded-2xl p-[1px] transition',
      disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer',
      gradientClass
    ]"
    @click="onPress"
    :aria-label="aria"
    ref="rootEl"
  >
    <div
      class="rounded-2xl bg-white/90 dark:bg-slate-900/70 backdrop-blur ring-1 ring-black/5 dark:ring-white/10 shadow-md px-4 py-4 md:px-6 md:py-6 grid place-items-center text-center"
    >
      <!-- Skeleton -->
      <template v-if="loading">
        <div class="animate-pulse w-full">
          <div class="mx-auto h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-700 mb-3"></div>
          <div class="h-3 w-2/3 mx-auto rounded bg-slate-200 dark:bg-slate-700 mb-2"></div>
          <div class="h-7 w-1/2 mx-auto rounded bg-slate-200 dark:bg-slate-700"></div>
        </div>
      </template>

      <!-- Content -->
      <template v-else>
        <!-- Icon -->
        <div
          class="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-white/70 to-white/40 dark:from-white/10 dark:to-white/5 ring-1 ring-black/5 dark:ring-white/10 shadow-sm"
        >
          <i v-if="icon" :class="[icon, 'text-2xl md:text-3xl', toneText]"></i>
          <slot v-else name="icon"></slot>
        </div>

        <!-- Title -->
        <h4 class="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
          {{ title }}
        </h4>

        <!-- Value -->
        <p class="mt-1 font-extrabold tabular-nums tracking-tight text-2xl md:text-3xl" :class="valueTone">
          <span v-if="prefix" class="opacity-80 mr-0.5">{{ prefix }}</span>
          <span>{{ displayValue }}</span>
          <span v-if="suffix" class="opacity-80 ml-0.5">{{ suffix }}</span>
        </p>

        <!-- Delta + subtext -->
        <div class="mt-2 flex items-center justify-center gap-2">
          <span
            v-if="showDelta"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1"
            :class="deltaClass"
          >
            <i :class="deltaIcon"></i>{{ deltaLabel }}
          </span>

          <span v-if="subtext" class="text-[11px] md:text-xs text-slate-500 dark:text-slate-300">
            {{ subtext }}
          </span>
        </div>

        <!-- Sparkline (optional) -->
        <div v-if="sparkline && sparkline.length > 1" class="mt-3 h-10 w-full">
          <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-full">
            <defs>
              <linearGradient :id="gradId" x1="0" y1="0" :x2="W" y2="0">
                <stop offset="0%" :stop-color="toneHex" stop-opacity="1"/>
                <stop offset="100%" :stop-color="toneHex" stop-opacity="0.35"/>
              </linearGradient>
            </defs>
            <path :d="areaPath" :fill="`url(#${gradId})`" opacity="0.18"/>
            <path :d="linePath" :stroke="toneHex" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </template>
    </div>
  </component>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  icon: { type: String, default: '' },              // e.g. 'i-tabler-coin'
  title: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  format: { type: String, default: 'auto' },        // 'auto'|'number'|'currency'|'percent'|'string'
  currency: { type: String, default: 'TZS' },
  locale: { type: String, default: undefined },
  minimumFractionDigits: { type: Number, default: 0 },
  maximumFractionDigits: { type: Number, default: 2 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },

  delta: { type: Number, default: null },           // >0 up, <0 down
  deltaMode: { type: String, default: 'auto' },     // 'auto'|'absolute'|'percent'
  subtext: { type: String, default: '' },

  sparkline: { type: Array, default: () => [] },    // numbers
  tone: { type: String, default: 'amber' },         // amber|emerald|indigo|rose|sky|violet
  clickable: { type: Boolean, default: false },
  href: { type: String, default: '' },
  target: { type: String, default: '_blank' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },

  animate: { type: Boolean, default: true },        // count-up animation
  duration: { type: Number, default: 900 }          // ms
})

const emit = defineEmits(['press'])

/* ---------- Number formatting ---------- */
const isNumeric = v => typeof v === 'number' || (!!v && !isNaN(parseFloat(v)))
const formatter = computed(() => {
  const opt = {
    minimumFractionDigits: props.minimumFractionDigits,
    maximumFractionDigits: props.maximumFractionDigits
  }
  if (props.format === 'currency') return new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.currency, ...opt })
  if (props.format === 'percent')  return new Intl.NumberFormat(props.locale, { style: 'percent', ...opt })
  return new Intl.NumberFormat(props.locale || undefined, opt)
})

/* Count-up animation (on visible) */
const rootEl = ref(null)
const visible = ref(false)
let io = null, raf = 0, startTs = 0
const animFrom = ref(0)
const animTo = ref(isNumeric(props.value) ? Number(props.value) : 0)
const current = ref(animTo.value)

function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3) }

function startAnim(from, to){
  cancelAnimationFrame(raf)
  startTs = performance.now()
  animFrom.value = from
  animTo.value = to
  const step = (ts)=>{
    const t = Math.min(1, (ts - startTs) / props.duration)
    current.value = from + (to - from) * easeOutCubic(t)
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(()=>{
  if (!props.animate) { visible.value = true; current.value = animTo.value; return }
  io = new IntersectionObserver(([e])=>{
    if (e.isIntersecting && !visible.value){
      visible.value = true
      if (isNumeric(props.value)) startAnim(0, Number(props.value))
    }
  }, { rootMargin: '0px 0px -20% 0px', threshold: 0.2 })
  if (rootEl.value) io.observe(rootEl.value)
})
onBeforeUnmount(()=>{
  if (io && rootEl.value) io.unobserve(rootEl.value)
  cancelAnimationFrame(raf)
})

watch(() => props.value, (nv)=>{
  if (!isNumeric(nv)) return
  const to = Number(nv)
  if (!props.animate || !visible.value){ current.value = to; return }
  startAnim(current.value, to)
})

const displayValue = computed(()=>{
  if (!isNumeric(props.value)) return String(props.value ?? '—')
  const n = props.animate ? current.value : Number(props.value)
  if (props.format === 'string') return String(props.value)
  if (props.format === 'currency' || props.format === 'percent' || props.format === 'number' || props.format === 'auto'){
    return formatter.value.format(n)
  }
  return String(n)
})

/* ---------- Delta chip ---------- */
const showDelta = computed(() => props.delta !== null && !isNaN(props.delta))
const trend = computed(() => props.delta > 0 ? 'up' : props.delta < 0 ? 'down' : 'flat')
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
const deltaLabel = computed(()=>{
  if (!showDelta.value) return ''
  if (props.deltaMode === 'percent') return `${Number(props.delta).toFixed(2)}%`
  if (props.deltaMode === 'absolute') return `${props.delta>0?'+':''}${Number(props.delta).toLocaleString()}`
  // auto
  return `${props.delta>0?'+':''}${Number(props.delta).toLocaleString()}`
})

/* ---------- Tone & gradient ---------- */
const toneMap = {
  amber:   { hex: '#f59e0b', grad: 'from-amber-400/40 via-amber-500/30 to-amber-600/40', text: 'text-amber-600 dark:text-amber-400' },
  emerald: { hex: '#10b981', grad: 'from-emerald-400/40 via-emerald-500/30 to-emerald-600/40', text: 'text-emerald-600 dark:text-emerald-400' },
  indigo:  { hex: '#6366f1', grad: 'from-indigo-400/40 via-indigo-500/30 to-indigo-600/40', text: 'text-indigo-600 dark:text-indigo-400' },
  rose:    { hex: '#f43f5e', grad: 'from-rose-400/40 via-rose-500/30 to-rose-600/40', text: 'text-rose-600 dark:text-rose-400' },
  sky:     { hex: '#0ea5e9', grad: 'from-sky-400/40 via-sky-500/30 to-sky-600/40', text: 'text-sky-600 dark:text-sky-400' },
  violet:  { hex: '#8b5cf6', grad: 'from-violet-400/40 via-violet-500/30 to-violet-600/40', text: 'text-violet-600 dark:text-violet-400' },
}
const toneHex = computed(() => toneMap[props.tone]?.hex || toneMap.amber.hex)
const gradientClass = computed(() => `bg-gradient-to-br ${toneMap[props.tone]?.grad || toneMap.amber.grad}`)
const toneText = computed(() => toneMap[props.tone]?.text || toneMap.amber.text)
const valueTone = computed(() =>
  trend.value === 'up' ? 'text-emerald-600 dark:text-emerald-400'
  : trend.value === 'down' ? 'text-rose-600 dark:text-rose-400'
  : 'text-slate-900 dark:text-white'
)

/* ---------- Sparkline ---------- */
const W = 120, H = 36, P = 2
const minY = a => Math.min(...a)
const maxY = a => Math.max(...a)
const scaleX = (i, n) => n <= 1 ? P : P + (i * (W - P*2)) / (n - 1)
const scaleY = (v, lo, hi) => {
  if (hi === lo) return H/2
  const t = (v - lo) / (hi - lo)
  return H - (P + t * (H - P*2))
}
const linePath = computed(() => {
  const a = props.sparkline || []
  if (!a.length) return ''
  const lo = minY(a), hi = maxY(a)
  return a.map((v,i)=>`${i?'L':'M'} ${scaleX(i,a.length)} ${scaleY(v,lo,hi)}`).join(' ')
})
const areaPath = computed(() => {
  const a = props.sparkline || []
  if (!a.length) return ''
  const lo = minY(a), hi = maxY(a)
  const top = a.map((v,i)=>`${i?'L':'M'} ${scaleX(i,a.length)} ${scaleY(v,lo,hi)}`).join(' ')
  return `${top} L ${W-P} ${H-P} L ${P} ${H-P} Z`
})
const gradId = `g${Math.random().toString(36).slice(2)}`

/* ---------- A11y & interactions ---------- */
const aria = computed(() => {
  const d = showDelta.value ? ` (${trend.value})` : ''
  return `${props.title}: ${displayValue.value}${props.suffix ? ' '+props.suffix : ''}${d}${props.subtext ? '. '+props.subtext : ''}`
})
function onPress(e){ if (!props.disabled) emit('press', e) }
</script>

<style scoped>
/* keep numbers steady on mobile */
.tabular-nums { font-variant-numeric: tabular-nums; }
</style>
