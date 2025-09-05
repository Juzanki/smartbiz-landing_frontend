<!-- src/components/GiftsButton.vue -->
<template>
  <button
    :aria-label="aria"
    :aria-pressed="isActive ? 'true' : 'false'"
    :aria-expanded="isActive ? 'true' : 'false'"
    :disabled="disabled || loading"
    class="gifts-btn inline-flex flex-col items-center justify-center gap-0.5
           h-12 min-w-[72px] px-3 rounded-2xl text-white text-[11px] font-semibold tracking-wide
           shadow-lg transition-[transform,box-shadow,background,filter] duration-200
           active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
           relative overflow-hidden select-none focus:outline-none"
    :data-active="isActive ? 'true' : 'false'"
    :data-loading="loading ? 'true' : 'false'"
    :data-pressed="pressing ? 'true' : 'false'"
    :data-tone="tone"
    :style="toneVars"
    @click="onClick"
    @pointerdown.passive="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerUp"
    @keydown.space.prevent="onKeyActivate"
    @keydown.enter.prevent="onKeyActivate"
    title="Gifts"
  >
    <!-- side glow wings -->
    <span class="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 h-8 w-16 rounded-full blur-2xl bg-white/10"></span>
    <span class="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 h-8 w-16 rounded-full blur-2xl bg-white/10"></span>

    <!-- sheen -->
    <span class="sheen pointer-events-none absolute inset-0"></span>

    <!-- pulse ring -->
    <span v-if="pulseKey" :key="pulseKey" class="pulse pointer-events-none absolute inset-0" aria-hidden="true"></span>

    <!-- ripple -->
    <span
      v-if="rippleKey"
      class="ripple pointer-events-none"
      :key="rippleKey"
      :style="{ left: `calc(${rippleX}px - var(--ripple-r))`, top: `calc(${rippleY}px - var(--ripple-r))` }"
      aria-hidden="true"
    />

    <!-- icon / loader -->
    <span class="relative flex items-center justify-center h-5">
      <slot name="icon">
        <span v-if="!loading" class="text-lg leading-none">🎁</span>
      </slot>

      <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" class="opacity-25" />
        <path d="M21 12a9 9 0 0 1-9 9" class="opacity-90" />
      </svg>

      <!-- count badge -->
      <span
        v-if="showBadge"
        class="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1 rounded-full
               text-[10px] leading-[18px] text-black font-bold
               bg-gradient-to-br from-amber-300 to-yellow-400
               border border-black/10 shadow-md"
      >
        {{ shortCount }}
      </span>
    </span>

    <!-- label -->
    <span class="mt-0.5 leading-none">
      <slot>{{ label }}</slot>
    </span>

    <!-- active glow dot -->
    <span
      v-if="isActive"
      class="absolute right-1 bottom-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
/**
 * Mobile-first GiftsButton
 * - v-model (active) inafungua/kufunga drawer
 * - Double-tap => open mara moja
 * - Long-press => hutuma 'longpress' (kwa vitendo maalum)
 * - Event Bus (kusikiliza amri kutoka nje): window.dispatchEvent(new CustomEvent('sb:gifts', {detail:{type:'open'|...}}))
 */
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'

type BusCmd =
  | { type: 'open' }
  | { type: 'toggle' }
  | { type: 'pulse' }
  | { type: 'loading'; on: boolean }
  | { type: 'set-count'; value: number }
  | { type: 'increment'; amount?: number }
  | { type: 'decrement'; amount?: number }

const BUS = 'sb:gifts'

const props = withDefaults(defineProps<{
  label?: string
  modelValue?: boolean
  active?: boolean
  disabled?: boolean
  loading?: boolean
  count?: number
  aria?: string
  holdMs?: number
  haptics?: boolean
  dblTapOpens?: boolean
  tone?: 'pink' | 'indigo' | 'emerald' | 'sky' | 'violet'
}>(), {
  label: 'Gifts',
  modelValue: undefined,
  active: false,
  disabled: false,
  loading: false,
  count: 0,
  aria: 'Open Gift Drawer',
  holdMs: 420,            // kidogo chini kwa simu
  haptics: true,
  dblTapOpens: true,
  tone: 'pink'
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'toggle'): void
  (e: 'longpress'): void
  (e: 'open'): void
}>()

/* ----- active (controlled/uncontrolled) ----- */
const internalActive = ref<boolean>(!!props.active)
const isControlled = computed(() => props.modelValue !== undefined)
const isActive = computed(() => (isControlled.value ? !!props.modelValue : internalActive.value))
function setActive(v: boolean){
  if (isControlled.value) emit('update:modelValue', v)
  else internalActive.value = v
}

/* ----- badge count (compact) ----- */
const iCount = ref<number>(props.count ?? 0)
watch(() => props.count, v => { if (v !== undefined) iCount.value = v as number })
const shortCount = computed(() => {
  const n = iCount.value ?? 0
  if (n <= 0) return '0'
  if (n < 1000) return String(n)
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1_000_000) return Math.round(n / 1000) + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
})
const showBadge = computed(() => (iCount.value ?? 0) > 0)

/* ----- press/long-press ----- */
const timer = ref<number | null>(null)
const pressing = ref(false)
const didLongPress = ref(false)
let lastTap = 0
let lastPointerId: number | null = null

function vibrate (ms = 12) {
  if (!props.haptics) return
  try { navigator.vibrate?.(ms) } catch {}
}

function onClick() {
  // NB: usikatishe kwa 'pressing' – simu zingine huchelewesha pointerup
  if (didLongPress.value || props.disabled || loading.value) { didLongPress.value = false; return }
  const now = Date.now()
  const dbl = props.dblTapOpens && (now - lastTap) < 280
  lastTap = now
  vibrate(dbl ? 16 : 10)
  if (dbl) {
    setActive(true)
    emit('open')
  } else {
    emit('toggle')
    setActive(!isActive.value)
  }
}

function onKeyActivate() {
  if (props.disabled || loading.value) return
  vibrate(10)
  emit('toggle')
  setActive(!isActive.value)
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled || loading.value) return
  pressing.value = true
  didLongPress.value = false

  // hakikisha tutapata pointerup hata kama kidole kinatoka eneo la btn
  const el = e.currentTarget as HTMLElement
  try { el.setPointerCapture?.(e.pointerId); lastPointerId = e.pointerId } catch {}

  startRipple(e)

  timer.value = window.setTimeout(() => {
    if (pressing.value && !props.disabled && !loading.value) {
      didLongPress.value = true
      vibrate(18)
      emit('longpress')
    }
  }, props.holdMs)
}

function onPointerUp(e?: PointerEvent) {
  pressing.value = false
  if (timer.value) { clearTimeout(timer.value); timer.value = null }
  if (e && lastPointerId != null) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture?.(lastPointerId) } catch {}
    lastPointerId = null
  }
}

onBeforeUnmount(() => { if (timer.value) clearTimeout(timer.value) })

/* ----- ripple & pulse ----- */
const rippleKey = ref(0)
const rippleX = ref(0)
const rippleY = ref(0)
function startRipple(e: PointerEvent){
  const el = (e.currentTarget as HTMLElement)
  const rect = el.getBoundingClientRect()
  rippleX.value = e.clientX - rect.left
  rippleY.value = e.clientY - rect.top
  rippleKey.value++ // restart anim
}
const pulseKey = ref(0)
function pulse(){ pulseKey.value++ }

/* ----- Event Bus: receive external commands ----- */
function onBus(ev: Event){
  const cmd = (ev as CustomEvent<BusCmd>).detail
  if (!cmd || typeof cmd !== 'object') return
  switch(cmd.type){
    case 'open':      setActive(true); emit('open'); pulse(); break
    case 'toggle':    setActive(!isActive.value); emit('toggle'); break
    case 'pulse':     pulse(); break
    case 'loading':   isLoading.value = !!cmd.on; break
    case 'set-count': iCount.value = Math.max(0, Math.floor(cmd.value || 0)); break
    case 'increment': iCount.value += Math.max(1, Math.floor(cmd.amount ?? 1)); break
    case 'decrement': iCount.value = Math.max(0, iCount.value - Math.max(1, Math.floor(cmd.amount ?? 1))); break
  }
}
onMounted(() => window.addEventListener(BUS, onBus as EventListener))
onBeforeUnmount(() => window.removeEventListener(BUS, onBus as EventListener))

/* ----- expose API (kwa parent refs) ----- */
defineExpose({
  open: () => { setActive(true); emit('open') },
  toggle: () => { setActive(!isActive.value); emit('toggle') },
  pulse,
  setCount: (v: number) => (iCount.value = Math.max(0, v|0)),
})

/* ----- external loading override (via bus or prop) ----- */
const isLoading = ref<boolean>(!!props.loading)
watch(() => props.loading, v => (isLoading.value = !!v))
const loading = computed(() => isLoading.value)

/* ----- theming (tone) via CSS vars ----- */
const toneVars = computed(() => {
  const t = props.tone
  const map: Record<string, {p1: string, p2: string, ring: string}> = {
    pink:    { p1:'rgba(236,72,153,.90)',  p2:'rgba(219,39,119,.96)', ring:'rgba(236,72,153,.45)' },
    indigo:  { p1:'rgba(99,102,241,.92)',  p2:'rgba(67,56,202,.98)',  ring:'rgba(99,102,241,.40)' },
    emerald: { p1:'rgba(16,185,129,.92)',  p2:'rgba(5,150,105,.98)',  ring:'rgba(16,185,129,.40)' },
    sky:     { p1:'rgba(14,165,233,.92)',  p2:'rgba(2,132,199,.98)',  ring:'rgba(14,165,233,.40)' },
    violet:  { p1:'rgba(139,92,246,.92)',  p2:'rgba(109,40,217,.98)',  ring:'rgba(139,92,246,.40)' },
  }
  const c = map[t] ?? map.pink
  return { '--pink-1': c.p1, '--pink-2': c.p2, '--ring': c.ring } as Record<string,string>
})
</script>

<style scoped>
/* ================= Mobile-first styles ================= */
:host, .gifts-btn{
  --pink-1: rgba(236,72,153,.90);
  --pink-2: rgba(219,39,119,.96);
  --shine:  rgba(255,255,255,.18);
  --ring:   rgba(236,72,153,.45);
  --ripple-r: 120px;
  -webkit-tap-highlight-color: transparent;
}

/* Glassy gradient + depth */
.gifts-btn{
  background: linear-gradient(105deg, var(--pink-1) 0%, var(--pink-2) 55%, var(--pink-1) 100%);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 8px 18px rgba(0,0,0,.25),
    0 6px 14px color-mix(in oklab, var(--pink-2) 45%, rgba(0,0,0,0));
  backdrop-filter: blur(10px);
}

.gifts-btn[data-active="true"]{
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    0 0 0 2px rgba(255,255,255,.35),
    0 0 0 6px var(--ring),
    0 10px 20px rgba(0,0,0,.28);
}

.gifts-btn:hover{
  transform: translateY(-1px);
}

/* Keyboard focus */
.gifts-btn:focus-visible{
  box-shadow:
    0 0 0 3px rgba(255,255,255,.65),
    0 0 0 6px var(--ring),
    0 10px 18px rgba(0,0,0,.25);
}

/* sheen */
.sheen::before{
  content:''; position:absolute; inset:0;
  background-image: linear-gradient(115deg, transparent 0%, var(--shine) 35%, transparent 70%);
  transform: translateX(-120%); animation: sheenMove 2.4s linear infinite;
}
@keyframes sheenMove{
  0%{ transform: translateX(-120%) }
  60%{ transform: translateX(120%) }
  100%{ transform: translateX(120%) }
}

/* pulse ring */
.pulse::before{
  content:''; position:absolute; inset:-2px; border-radius:18px;
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--ring) 60%, transparent);
  animation: pulseRing .9s ease-out;
}
@keyframes pulseRing{
  0%{ box-shadow:0 0 0 0 color-mix(in oklab, var(--ring) 65%, transparent) }
  100%{ box-shadow:0 0 0 18px rgba(0,0,0,0) }
}

/* ripple */
.ripple{
  position:absolute; width: calc(var(--ripple-r) * 2); height: calc(var(--ripple-r) * 2);
  border-radius: 9999px; background: radial-gradient(circle, rgba(255,255,255,.35), rgba(255,255,255,0) 60%);
  transform: scale(0); opacity: .75; mix-blend-mode: overlay;
  animation: ripple .45s ease-out forwards;
}
@keyframes ripple{ to{ transform: scale(1); opacity: 0 } }

/* Hint states */
.gifts-btn[data-pressed="true"]{ filter: brightness(1.02) }
.gifts-btn[data-loading="true"]{ cursor: progress }

/* Small phones */
@media (max-width: 380px){
  .gifts-btn{ min-width: 68px; height: 48px; }
}

/* Larger phones & tablets */
@media (min-width: 420px){
  .gifts-btn{ min-width: 76px; height: 48px; }
}
</style>
