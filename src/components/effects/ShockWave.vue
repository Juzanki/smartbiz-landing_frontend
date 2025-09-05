<template>
  <div class="shockwave" :style="style"></div>
</template>

<script setup lang="ts">
import { ref, watch, defineExpose, onMounted } from 'vue'

/**
 * Mobile-first props (optional):
 * - size: clamp(80px, 26vw, 220px)
 * - color: rgba(255,255,255,0.85)
 * - stroke: 6px
 * - duration: 1200ms
 * - scale: 5   (final burst scale)
 * - layers: 3  (0..3 – idadi ya mawimbi)
 * - variant: 'wave' | 'ring' | 'ripple'
 * - rotate: '0deg'
 * - x / y: position (px or %)
 */
const props = withDefaults(defineProps<{
  size?: string
  color?: string
  stroke?: string
  duration?: number
  scale?: number
  layers?: 0|1|2|3
  variant?: 'wave'|'ring'|'ripple'
  rotate?: string
  x?: number|string
  y?: number|string
  autoCenter?: boolean
}>(), {
  size: 'clamp(80px, 26vw, 220px)',
  color: 'rgba(255,255,255,0.85)',
  stroke: '6px',
  duration: 1200,
  scale: 5,
  layers: 3,
  variant: 'wave',
  rotate: '0deg',
  x: '50%',
  y: '50%',
  autoCenter: true
})

/* Inline style (ili kuendelea kutumia :style kama ulivyoweka) */
const style = ref<Record<string, string>>({
  top: typeof props.y === 'number' ? `${props.y}px` : props.y,
  left: typeof props.x === 'number' ? `${props.x}px` : props.x,
  transform: `${props.autoCenter ? 'translate(-50%, -50%) ' : ''}rotate(${props.rotate})`,
  '--sw-size': props.size,
  '--sw-color': props.color,
  '--sw-stroke': props.stroke,
  '--sw-duration': `${props.duration}ms`,
  '--sw-scale': String(props.scale),
  '--sw-variant': `'${props.variant}'`,
  '--sw-layers': String(props.layers)
})

watch(
  () => [props.x, props.y, props.rotate],
  () => {
    style.value.top = typeof props.y === 'number' ? `${props.y}px` : props.y
    style.value.left = typeof props.x === 'number' ? `${props.x}px` : props.x
    style.value.transform = `${props.autoCenter ? 'translate(-50%, -50%) ' : ''}rotate(${props.rotate})`
  }
)

/* Public API */
function trigger(variant: 'wave'|'ring'|'ripple' = props.variant) {
  style.value['--sw-variant'] = `'${variant}'`
  const el = document.querySelector('.shockwave')
  if (!el) return
  el.classList.remove('is-anim')
  void (el as HTMLElement).offsetWidth // reflow
  el.classList.add('is-anim')
  try { navigator.vibrate?.(8) } catch {}
}
function moveTo(x: number|string, y: number|string, center = true) {
  style.value.left = typeof x === 'number' ? `${x}px` : x
  style.value.top = typeof y === 'number' ? `${y}px` : y
  style.value.transform = `${center ? 'translate(-50%, -50%) ' : ''}rotate(${props.rotate})`
}
function setOptions(opts: Partial<Record<string,string|number>>) {
  if (opts.size) style.value['--sw-size'] = String(opts.size)
  if (opts.color) style.value['--sw-color'] = String(opts.color)
  if (opts.stroke) style.value['--sw-stroke'] = String(opts.stroke)
  if (opts.duration) style.value['--sw-duration'] = typeof opts.duration === 'number' ? `${opts.duration}ms` : String(opts.duration)
  if (opts.scale) style.value['--sw-scale'] = String(opts.scale)
  if (opts.variant) style.value['--sw-variant'] = `'${opts.variant}'`
  if (opts.layers != null) style.value['--sw-layers'] = String(opts.layers)
  trigger((opts.variant as any) ?? props.variant)
}
function burst(times = 3, gapMs = 140) {
  let i = 0
  const tick = () => { trigger(); if (++i < times) setTimeout(tick, gapMs) }
  tick()
}

defineExpose({ trigger, moveTo, setOptions, burst })

onMounted(() => trigger(props.variant))
</script>

<style scoped>
/* Base */
.shockwave {
  position: absolute;
  width: var(--sw-size, clamp(80px, 26vw, 220px));
  height: var(--sw-size, clamp(80px, 26vw, 220px));
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  /* Neon stroke look using border; color via CSS var */
  border: var(--sw-stroke, 6px) solid color-mix(in oklab, var(--sw-color, rgba(255,255,255,.85)) 85%, transparent);
  box-shadow:
    0 0 18px color-mix(in oklab, var(--sw-color) 70%, transparent),
    0 0 46px color-mix(in oklab, var(--sw-color) 40%, transparent);
  filter: blur(.6px);
}

/* Layers via pseudo-elements (max 2 extra) */
.shockwave::before,
.shockwave::after{
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: var(--sw-stroke, 6px) solid color-mix(in oklab, var(--sw-color, rgba(255,255,255,.85)) 60%, transparent);
  opacity: .75;
}

/* Toggle layer visibility by --sw-layers (0..3) */
.shockwave::before{ display: none }
.shockwave::after{ display: none }
.shockwave[style*="--sw-layers: 2"]::before,
.shockwave[style*="--sw-layers: 3"]::before{ display: block }
.shockwave[style*="--sw-layers: 3"]::after{ display: block }

/* Animate when .is-anim present */
.shockwave.is-anim{
  animation-duration: var(--sw-duration, 1200ms);
  animation-fill-mode: forwards;
  animation-timing-function: ease-out;
  animation-name: sw-wave; /* default (wave) */
}
.shockwave.is-anim::before{
  animation: sw-wave var(--sw-duration, 1200ms) ease-out forwards;
  animation-delay: 90ms;
}
.shockwave.is-anim::after{
  animation: sw-wave var(--sw-duration, 1200ms) ease-out forwards;
  animation-delay: 180ms;
}

/* Variants switching using style token */
@keyframes sw-wave {
  0%   { transform: translate(-50%, -50%) scale(.22); opacity: 1; border-width: calc(var(--sw-stroke,6px) * 1.1) }
  60%  { opacity: .55 }
  100% { transform: translate(-50%, -50%) scale(var(--sw-scale, 5)); opacity: 0; border-width: 2px }
}
@keyframes sw-ring {
  0%   { transform: translate(-50%, -50%) scale(.6); opacity: .15 }
  35%  { transform: translate(-50%, -50%) scale(1.1); opacity: .95 }
  100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0 }
}
@keyframes sw-ripple {
  0%   { transform: translate(-50%, -50%) scale(.5); opacity: .18 }
  50%  { transform: translate(-50%, -50%) scale(1.3); opacity: .8 }
  100% { transform: translate(-50%, -50%) scale(2.1); opacity: 0 }
}

/* Apply variant to main + layers */
.shockwave.is-anim[style*="'ring'"]{
  animation-name: sw-ring;
}
.shockwave.is-anim[style*="'ring'"]::before,
.shockwave.is-anim[style*="'ring'"]::after{
  animation-name: sw-ring;
}
.shockwave.is-anim[style*="'ripple'"]{
  animation-name: sw-ripple;
}
.shockwave.is-anim[style*="'ripple'"]::before,
.shockwave.is-anim[style*="'ripple'"]::after{
  animation-name: sw-ripple;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .shockwave.is-anim,
  .shockwave.is-anim::before,
  .shockwave.is-anim::after { animation-duration: 1ms !important; }
}
</style>
