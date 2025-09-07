<!-- src/components/Live/GiftFly.vue -->
<template>
  <div
    class="gift-fly"
    :class="[variantClass, glow ? 'glow' : '']"
    :style="styleObj"
    aria-hidden="true"
    @animationstart="onStart"
    @animationend="onEnd"
  >
    <img
      v-if="gift?.image"
      :src="gift.image"
      :alt="gift?.name || 'gift'"
      class="img"
      :style="{ width: sizePx + 'px', height: sizePx + 'px' }"
      draggable="false"
    />
    <div
      v-else
      class="emoji"
      :style="{ fontSize: Math.round(sizePx * 0.8) + 'px' }"
      draggable="false"
    >
      {{ gift?.icon ?? '🎁' }}
    </div>

    <!-- spark trail (optional) -->
    <div v-if="trail" class="trail"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/** ---------- Types ---------- **/
type Gift = { name?: string; icon?: string; image?: string; themeColor?: string }

/** ---------- Props ---------- **/
const props = defineProps<{
  gift?: Gift

  /** Animation */
  variant?: 'up' | 'arc-left' | 'arc-right' | 'zigzag' | 'curve'
  durationMs?: number        // muda wa kuruka
  distancePx?: number        // urefu wa kuruka juu (px)
  delayMs?: number           // kuchelewa kuanza (ms)

  /** Position / sizing */
  startXPct?: number         // 0–100 (asili: random 10–90)
  startBottomPx?: number     // px from bottom (asili: 0)
  driftXPct?: number         // ongeza kuteleza upande (−20…+20, asili: random kidogo)
  size?: number              // icon/img size (px, asili: 44)

  /** Visuals */
  glow?: boolean             // mwanga wa pembeni
  trail?: boolean            // chelezo ya cheche
  zIndex?: number | string
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'end'): void
}>()

/** ---------- Defaults + computed ---------- **/
const reduced = typeof window !== 'undefined'
  ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  : false

const sizePx     = computed(() => Math.max(20, props.size ?? 44))
const durationMs = computed(() => Math.max(300, props.durationMs ?? 1100))
const distancePx = computed(() => Math.max(60, props.distancePx ?? 120))
const delayMs    = computed(() => Math.max(0, props.delayMs ?? 0))
const startXPct  = computed(() => {
  const v = props.startXPct
  return v != null ? Math.min(100, Math.max(0, v)) : (10 + Math.floor(Math.random() * 80))
})
const startBottomPx = computed(() => props.startBottomPx ?? 0)
const driftXPct = computed(() => {
  const d = props.driftXPct
  if (d == null) return (Math.random() * 16 - 8) | 0 // -8%..+8%
  return Math.max(-40, Math.min(40, d))
})
const zIndex = computed(() => (props.zIndex ?? 60) + '')

const variant = computed(() => props.variant ?? 'up')
const variantClass = computed(() => {
  switch (variant.value) {
    case 'arc-left':  return 'v-arc-left'
    case 'arc-right': return 'v-arc-right'
    case 'zigzag':    return 'v-zigzag'
    case 'curve':     return 'v-curve'
    default:          return 'v-up'
  }
})

/** ---------- Style via CSS vars (GPU friendly) ---------- **/
const styleObj = computed(() => {
  // NOTE: CSS variables hutumiwa kwenye keyframes ili kila instance iwe na njia yake
  const color = props.gift?.themeColor || '#f472b6'
  return {
    // positioning
    left: startXPct.value + '%',
    bottom: startBottomPx.value + 'px',
    zIndex: zIndex.value,

    // animation control
    animationDuration: (reduced ? Math.min(durationMs.value, 600) : durationMs.value) + 'ms',
    animationDelay: delayMs.value + 'ms',

    // CSS variables
    // shift ya X (kwa translate initial), na drift ya X wakati wa kuruka
    '--sx': '-50%',
    '--dx': (driftXPct.value >= 0 ? '+' : '') + driftXPct.value + '%',
    '--distance': distancePx.value + 'px',
    '--color': color,
    '--size': sizePx.value + 'px',
  } as Record<string, string>
})

/** ---------- Events ---------- **/
function onStart() { emit('start') }
function onEnd()   { emit('end') }
</script>

<style scoped>
/* Base node */
.gift-fly {
  position: absolute;
  pointer-events: none;
  transform: translate(var(--sx), 0);
  will-change: transform, opacity;
  /* fallback if no variant class set */
  animation-name: flyUp;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}
.img {
  width: var(--size);
  height: var(--size);
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,.35));
}
.emoji {
  filter: drop-shadow(0 2px 8px rgba(0,0,0,.35));
}

/* Optional glow ring */
.glow::after{
  content: "";
  position: absolute;
  inset: -8px;
  border-radius: 999px;
  background: radial-gradient(closest-side, var(--color, #f472b6)33, transparent 70%);
  filter: blur(6px);
  z-index: -1;
}

/* Optional trail */
.trail{
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 28px;
  background: linear-gradient(to top, var(--color, #f472b6), transparent);
  opacity: .7;
  border-radius: 4px;
  filter: blur(1px);
  animation: trailShrink linear forwards;
  animation-duration: inherit;
  animation-delay: inherit;
}

/* Variants -------------------------------------------------- */
/* Default: straight up */
.v-up { animation-name: flyUp; }

/* Soft curve (S-curve) */
.v-curve { animation-name: flyCurve; }

/* Arc left / right */
.v-arc-left  { --arcx1: -60%; --arcx2: -56%; animation-name: flyArc; }
.v-arc-right { --arcx1: -40%; --arcx2: -44%; animation-name: flyArc; }

/* Zigzag */
.v-zigzag { animation-name: flyZigZag; }

/* Keyframes -------------------------------------------------- */
@keyframes flyUp {
  0%   { transform: translate(var(--sx), 0) scale(.96); opacity: .96; }
  100% { transform: translate(calc(var(--sx) + var(--dx)), calc(-1 * var(--distance))); opacity: 0; }
}
@keyframes flyCurve {
  0%   { transform: translate(var(--sx), 0) scale(.95); opacity: .96; }
  40%  { transform: translate(calc(var(--sx) + calc(var(--dx) * .4)), calc(-0.45 * var(--distance))) rotate(-4deg); }
  70%  { transform: translate(calc(var(--sx) + calc(var(--dx) * .7)), calc(-0.8 * var(--distance))) rotate(4deg); }
  100% { transform: translate(calc(var(--sx) + var(--dx)), calc(-1 * var(--distance))); opacity: 0; }
}
@keyframes flyArc {
  0%   { transform: translate(var(--sx), 0) scale(.95); opacity: .96; }
  50%  { transform: translate(var(--arcx1, -60%), calc(-0.6 * var(--distance))) rotate(-8deg); }
  100% { transform: translate(var(--arcx2, -56%), calc(-1 * var(--distance))); opacity: 0; }
}
@keyframes flyZigZag {
  0%   { transform: translate(var(--sx), 0) scale(.95); opacity: .96; }
  25%  { transform: translate(calc(var(--sx) - 6%), calc(-0.33 * var(--distance))) rotate(-6deg); }
  50%  { transform: translate(calc(var(--sx) + 6%), calc(-0.66 * var(--distance))) rotate(6deg); }
  75%  { transform: translate(calc(var(--sx) - 4%), calc(-0.85 * var(--distance))); }
  100% { transform: translate(calc(var(--sx) + var(--dx)), calc(-1 * var(--distance))); opacity: 0; }
}
@keyframes trailShrink {
  0%   { height: 28px; opacity: .75; }
  100% { height: 0;    opacity: 0; }
}

/* Reduced motion: tumia fade tu */
@media (prefers-reduced-motion: reduce) {
  .gift-fly {
    animation-duration: 420ms !important;
    animation-name: fadeQuick !important;
  }
  @keyframes fadeQuick {
    to { opacity: 0; transform: translate(var(--sx), -20px); }
  }
}
</style>
