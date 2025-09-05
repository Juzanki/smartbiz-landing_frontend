<template>
  <!-- Live region (optional) -->
  <span v-if="aria" class="sr-only" aria-live="polite">pulse</span>

  <!-- Pulses layer -->
  <div class="pulse-layer" :style="layerStyle">
    <!-- Node pool (reused) -->
    <div
      v-for="n in pool"
      :key="n.id"
      class="pulse-node"
      :class="n.active ? n.variant : ''"
      :style="n.active ? n.style : baseNodeStyle"
      @animationend="onEnd(n)"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount, defineExpose, computed } from 'vue'

type Variant = 'wave'|'ring'|'ripple'
type BurstOpts = {
  x: number,  // page/client X
  y: number,  // page/client Y
  color?: string,
  size?: number|string, // px or '18vw'
  duration?: number,    // ms
  blur?: number,        // px
  variant?: Variant,
  haptics?: boolean
}

const props = withDefaults(defineProps<{
  /** Ambient center pulse loop */
  ambient?: boolean
  ambientColor?: string
  ambientSize?: string | number
  ambientDuration?: number
  /** Max simultaneous pulses (pool size) */
  max?: number
  /** Attach viewport offset (useful if inside scrollable container) */
  offsetX?: number
  offsetY?: number
  /** Set false to remove aria-live */
  aria?: boolean
}>(), {
  ambient: false,
  ambientColor: 'rgba(0, 255, 255, 0.65)',
  ambientSize: '22vw',
  ambientDuration: 1800,
  max: 10,
  offsetX: 0,
  offsetY: 0,
  aria: true
})

/* Node pool */
let idc = 0
const pool = reactive(Array.from({ length: props.max }).map(() => ({
  id: ++idc,
  active: false,
  variant: 'wave' as Variant,
  style: {} as Record<string,string>
})))
const baseNodeStyle = {
  '--x':'50%', '--y':'50%', '--size':'120px', '--color':'rgba(0,255,255,.65)',
  '--duration':'1400ms', '--blur':'12px'
} as Record<string,string>

const layerStyle = computed(() => ({
  // help composited layer be stable
  transform: 'translateZ(0)',
}))

function haptic(ms=10){ try{ navigator.vibrate?.(ms) } catch {} }

/** Borrow an inactive node from the pool */
function takeNode(){
  const n = pool.find(p => !p.active)
  return n ?? pool[0] // if all busy, reuse oldest
}

/** Public API: trigger a pulse anywhere on screen */
function burst(opts: BurstOpts){
  const n = takeNode(); if (!n) return
  const {
    x, y,
    color = 'rgba(0,255,255,.65)',
    size = '120px',
    duration = 1400,
    blur = 12,
    variant = 'wave',
    haptics = true
  } = opts

  const left = (x + (props.offsetX||0)) + 'px'
  const top  = (y + (props.offsetY||0)) + 'px'

  // Activate node with CSS variables
  n.style = {
    '--x': left,
    '--y': top,
    '--size': typeof size === 'number' ? `${size}px` : String(size),
    '--color': color,
    '--duration': `${duration}ms`,
    '--blur': `${blur}px`
  }
  n.variant = variant
  n.active = true
  if (haptics) haptic(8)
}

/** End handler: recycle node */
function onEnd(n: typeof pool[number]){ n.active = false }

/* Optional ambient loop (center) */
let ambientTimer: number | null = null
function startAmbient(){
  if (!props.ambient) return
  stopAmbient()
  ambientTimer = window.setInterval(() => {
    // center screen burst (uses vw/vh sizing for mobile)
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    burst({
      x: cx, y: cy,
      color: props.ambientColor,
      size: typeof props.ambientSize === 'number' ? `${props.ambientSize}px` : props.ambientSize,
      duration: props.ambientDuration,
      variant: 'ripple',
      haptics: false
    })
  }, Math.max(800, props.ambientDuration - 200))
}
function stopAmbient(){ if (ambientTimer){ clearInterval(ambientTimer); ambientTimer=null } }

onMounted(() => { startAmbient(); window.addEventListener('resize', startAmbient) })
onBeforeUnmount(() => { stopAmbient(); window.removeEventListener('resize', startAmbient) })

/* Expose imperative API */
defineExpose({ burst })
</script>

<style scoped>
/* Layer that hosts pulses */
.pulse-layer{
  position: absolute; inset: 0;
  pointer-events: none;
  contain: layout style paint;
  content-visibility: auto;
}

/* Base node */
.pulse-node{
  position: absolute;
  left: var(--x); top: var(--y);
  width: var(--size); height: var(--size);
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  filter: blur(var(--blur)) brightness(1.1);
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
}

/* Variants: use GPU-friendly transforms + opacity */
@keyframes wave {
  0%   { transform: translate(-50%, -50%) scale(.35); opacity: 1; }
  45%  { transform: translate(-50%, -50%) scale(1.15); opacity: .55; }
  100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
}
.pulse-node.wave{
  background: radial-gradient(circle, var(--color), transparent 70%);
  animation: wave var(--duration) ease-out forwards;
}

/* Thin ring that expands */
@keyframes ring {
  0%   { transform: translate(-50%, -50%) scale(.5); opacity: .95; }
  70%  { opacity: .5; }
  100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
}
.pulse-node.ring{
  background:
    radial-gradient(closest-side, transparent calc(50% - 2px), rgba(255,255,255,.65) calc(50% - 1px), transparent 50%),
    radial-gradient(circle, color-mix(in oklab, var(--color) 70%, transparent), transparent 70%);
  animation: ring var(--duration) cubic-bezier(.2,.6,.2,1) forwards;
}

/* Multi-ripple (two waves staggered) */
@keyframes rippleA {
  0%   { transform: translate(-50%, -50%) scale(.3); opacity: .9; }
  100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
}
@keyframes rippleB {
  0%   { transform: translate(-50%, -50%) scale(.5); opacity: .8; }
  100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
}
.pulse-node.ripple{
  /* two layered gradients for richer look */
  background:
    radial-gradient(circle, color-mix(in oklab, var(--color) 85%, transparent), transparent 68%),
    radial-gradient(circle, color-mix(in oklab, var(--color) 55%, transparent), transparent 75%);
  animation:
    rippleA calc(var(--duration) * .95) ease-out forwards,
    rippleB var(--duration) linear forwards;
}

/* Reduced motion: finish instantly (still shows color blip) */
@media (prefers-reduced-motion: reduce){
  .pulse-node{ animation-duration: 1ms !important; }
}

/* Screen-reader only helper */
.sr-only{
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
</style>
