<template>
  <!-- Floating or inline toggle -->
  <button
    ref="btn"
    :class="rootClass"
    :style="rootStyle"
    role="switch"
    :aria-pressed="isOpen"
    :aria-label="ariaLabel"
    @click="toggle"
    @keydown.enter.space.prevent="toggle"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <!-- Icon + label -->
    <span class="text-xl leading-none">📝</span>
    <span v-if="showLabel" class="ml-2 font-semibold text-sm">{{ labelText }}</span>

    <!-- Unread badge -->
    <span v-if="unread > 0"
          class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold grid place-items-center
                 bg-amber-400 text-black border border-black/10 animate-bounce-slow">
      {{ compact(unread) }}
    </span>

    <!-- Ripple effects -->
    <span v-for="r in ripples" :key="r.id" class="ripple" :style="{ left:r.x+'px', top:r.y+'px' }" aria-hidden="true" />
  </button>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'

/**
 * PROPS
 */
const props = defineProps({
  modelValue: { type: Boolean, default: undefined },   // optional v-model
  label:      { type: String,  default: 'Summary' },
  unread:     { type: Number,  default: 0 },
  floating:   { type: Boolean, default: true },        // FAB vs inline
  position:   { type: String,  default: 'br' },        // br | bl | tr | tl | inline
  size:       { type: String,  default: 'md' },        // sm | md | lg
  showLabel:  { type: Boolean, default: true },        // hide on tiny screens if you prefer
})

/**
 * EMITS
 */
const emit = defineEmits(['update:modelValue','peek','toggle'])

/**
 * INJECT (optional): parent may provide a ref('showLiveSummary')
 */
const injected = inject('showLiveSummary', null)

/**
 * STATE
 */
const btn = ref(null)
const localOpen = ref(false)
const ripples = ref([])
let pressTimer = null
let longPressFired = false

/**
 * OPEN STATE (prefers inject > v-model > local)
 */
const isControlledByInject = computed(() => injected && typeof injected.value === 'boolean')
const isControlledByVModel  = computed(() => props.modelValue !== undefined)

const isOpen = computed({
  get() {
    if (isControlledByInject.value) return injected.value
    if (isControlledByVModel.value) return props.modelValue
    return localOpen.value
  },
  set(v) {
    if (isControlledByInject.value) injected.value = v
    if (isControlledByVModel.value) emit('update:modelValue', v)
    localOpen.value = v
  }
})

/**
 * LABELS & A11y
 */
const labelText = computed(() => props.label)
const ariaLabel = computed(() =>
  `${labelText.value} – ${isOpen.value ? 'on' : 'off'}`
)

/**
 * LAYOUT
 */
const rootClass = computed(() => {
  const base = [
    'relative select-none',
    'rounded-full border backdrop-blur',
    'active:scale-[.98] transition',
    'shadow-lg',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400',
    'text-white'
  ]
  const size = ({
    sm: 'h-10 px-3 text-sm',
    md: 'h-12 px-4 text-sm',
    lg: 'h-14 px-5 text-base'
  }[props.size]) || 'h-12 px-4 text-sm'

  const theme = isOpen.value
    ? 'bg-gradient-to-b from-indigo-600 to-violet-700 border-white/15'
    : 'bg-gradient-to-b from-slate-700 to-slate-900 border-white/10'

  const layout = props.floating && props.position !== 'inline'
    ? 'fixed z-[9998] flex items-center'
    : 'inline-flex items-center'

  return [base.join(' '), size, theme, layout].join(' ')
})

const rootStyle = computed(() => {
  if (!props.floating || props.position === 'inline') return {}
  const top  = 'calc(env(safe-area-inset-top,0px) + 12px)'
  const bot  = 'calc(env(safe-area-inset-bottom,0px) + 14px)'
  const left = 'calc(env(safe-area-inset-left,0px) + 14px)'
  const rgt  = 'calc(env(safe-area-inset-right,0px) + 14px)'
  const map = {
    tr: { top,  right: rgt },
    tl: { top,  left: left },
    br: { bottom: bot, right: rgt },
    bl: { bottom: bot, left: left },
  }
  return map[props.position] || map.br
})

/**
 * INTERACTIONS
 */
function vibrate(ms=10){ try { navigator.vibrate?.(ms) } catch {} }

function toggle(e){
  addRipple(e)
  vibrate(12)
  isOpen.value = !isOpen.value
  emit('toggle', isOpen.value)
}

function onPointerDown(e){
  addRipple(e)
  longPressFired = false
  pressTimer = setTimeout(() => {
    longPressFired = true
    vibrate(20)
    emit('peek') // parent can open a quick preview sheet
  }, 650)
}
function onPointerUp(){
  if (pressTimer){ clearTimeout(pressTimer); pressTimer = null }
}
function onPointerCancel(){
  if (pressTimer){ clearTimeout(pressTimer); pressTimer = null }
}

/**
 * RIPPLE
 */
let rippleId = 0
function addRipple(e){
  const el = btn.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = (e?.clientX ?? rect.width/2) - rect.left
  const y = (e?.clientY ?? rect.height/2) - rect.top
  const id = ++rippleId
  ripples.value.push({ id, x, y })
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== id)
  }, 500)
}

/**
 * UTILS
 */
function compact(n){
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B'
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return String(n ?? 0)
}
</script>

<style scoped>
/* Ripple */
.ripple{
  position:absolute; pointer-events:none; height:10px; width:10px; border-radius:9999px;
  background: rgba(255,255,255,.6);
  transform: translate(-50%,-50%) scale(0);
  animation: ripple .5s ease-out forwards;
}
@keyframes ripple { to { transform: translate(-50%,-50%) scale(10); opacity: 0 } }

/* Subtle playful bounce for unread */
@keyframes bounce-slow { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-2px) } }
.animate-bounce-slow { animation: bounce-slow 1.4s ease-in-out infinite }

/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>
