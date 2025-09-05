<template>
  <div class="neon-frame" :style="frameStyle"></div>
</template>

<script setup>
import { ref, watch, defineExpose, onMounted } from 'vue'

/**
 * Mobile-first options via props (optional):
 * - size: 'clamp(140px, 38vw, 220px)' by default
 * - color: cyan neon
 * - thickness: 4px
 * - duration: 1400ms
 * - variant: 'glow' | 'ripple' | 'ring'
 * - radius: 16px
 * - rotate: 0deg
 */
const props = withDefaults(defineProps<{
  size?: string
  color?: string
  thickness?: string
  duration?: number
  variant?: 'glow' | 'ripple' | 'ring'
  radius?: string
  rotate?: string
  x?: number | string // left position (px or %)
  y?: number | string // top position (px or %)
  autoCenter?: boolean
}>(), {
  size: 'clamp(140px, 38vw, 220px)',
  color: 'rgba(0,217,255,0.9)',
  thickness: '4px',
  duration: 1400,
  variant: 'glow',
  radius: '16px',
  rotate: '0deg',
  x: '50%',
  y: '50%',
  autoCenter: true
})

/* Internal reactive style (kept as you had) */
const frameStyle = ref({
  top: typeof props.y === 'number' ? `${props.y}px` : props.y,
  left: typeof props.x === 'number' ? `${props.x}px` : props.x,
  transform: `translate(-50%, -50%) rotate(${props.rotate})`,
  // CSS variables passed inline for the CSS below
  '--nf-size': props.size,
  '--nf-color': props.color,
  '--nf-thickness': props.thickness,
  '--nf-duration': `${props.duration}ms`,
  '--nf-radius': props.radius,
  '--nf-variant': `'${props.variant}'`
})

/* Keep it centered if requested */
watch(() => [props.x, props.y, props.rotate], () => {
  frameStyle.value.top = typeof props.y === 'number' ? `${props.y}px` : props.y
  frameStyle.value.left = typeof props.x === 'number' ? `${props.x}px` : props.x
  frameStyle.value.transform = `${props.autoCenter ? 'translate(-50%, -50%) ' : ''}rotate(${props.rotate})`
})

/* Public APIs (do not change component name/markup) */
function trigger(variant = props.variant) {
  frameStyle.value['--nf-variant'] = `'${variant}'`
  // restart animation by toggling inline animation-name token
  const el = document.querySelector('.neon-frame')
  if (!el) return
  el.classList.remove('is-anim')
  // force reflow
  void el.offsetWidth
  el.classList.add('is-anim')
}
function moveTo(x, y, center = true) {
  frameStyle.value.left = typeof x === 'number' ? `${x}px` : x
  frameStyle.value.top = typeof y === 'number' ? `${y}px` : y
  frameStyle.value.transform = `${center ? 'translate(-50%, -50%) ' : ''}rotate(${props.rotate})`
}
function setOptions(opts = {}) {
  // allow quick runtime customization
  if (opts.size) frameStyle.value['--nf-size'] = opts.size
  if (opts.color) frameStyle.value['--nf-color'] = opts.color
  if (opts.thickness) frameStyle.value['--nf-thickness'] = opts.thickness
  if (opts.duration) frameStyle.value['--nf-duration'] = typeof opts.duration === 'number' ? `${opts.duration}ms` : opts.duration
  if (opts.radius) frameStyle.value['--nf-radius'] = opts.radius
  if (opts.variant) frameStyle.value['--nf-variant'] = `'${opts.variant}'`
  trigger(opts.variant ?? props.variant)
}

defineExpose({ trigger, moveTo, setOptions })

onMounted(() => {
  // auto-fire once on mount for visual feedback
  trigger(props.variant)
})
</script>

<style scoped>
/* MOBILE-FIRST: size via clamp + vw, CSS variables for quick branding */
.neon-frame {
  position: absolute;
  width: var(--nf-size, clamp(140px, 38vw, 220px));
  height: var(--nf-size, clamp(140px, 38vw, 220px));
  border-radius: var(--nf-radius, 16px);
  border: var(--nf-thickness, 4px) solid color-mix(in oklab, var(--nf-color, rgba(0,217,255,0.9)) 90%, transparent);
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(4px);

  /* neon glow layers */
  box-shadow:
    0 0 20px color-mix(in oklab, var(--nf-color, rgba(0,217,255,0.9)) 90%, transparent),
    0 0 60px color-mix(in oklab, var(--nf-color, rgba(0,217,255,0.9)) 65%, transparent),
    0 0 100px color-mix(in oklab, var(--nf-color, rgba(0,217,255,0.9)) 40%, transparent);
}

/* Animation variants — driven by CSS var --nf-variant */
.neon-frame.is-anim {
  animation-duration: var(--nf-duration, 1400ms);
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  animation-name: nf-pulse; /* default fallback */
}

/* Switch via attribute-like token in CSS var */
.neon-frame.is-anim {
  /* use multiple animations with same duration for richer effect */
  animation-name: nf-pulse;
}
.neon-frame.is-anim::before,
.neon-frame.is-anim::after {
  content: '';
  position: absolute;
  inset: -6%;
  border-radius: inherit;
  pointer-events: none;
}

/* Variant: glow (default) */
.neon-frame.is-anim {
  --nf-a: nf-pulse;
}
.neon-frame.is-anim::before {
  animation: nf-aura var(--nf-duration, 1400ms) ease-out forwards;
  background: radial-gradient(circle at 50% 50%,
    color-mix(in oklab, var(--nf-color) 28%, transparent),
    transparent 60%);
  filter: blur(10px);
}

/* Variant: ripple (expanding rings) */
@keyframes nf-ripple {
  0%   { transform: translate(-50%, -50%) scale(0.6); opacity: .12 }
  50%  { transform: translate(-50%, -50%) scale(1.15); opacity: .6 }
  100% { transform: translate(-50%, -50%) scale(1.9); opacity: 0 }
}
.neon-frame.is-anim[style*="'ripple'"]::after {
  border: 2px solid color-mix(in oklab, var(--nf-color) 75%, transparent);
  border-radius: inherit;
  transform: translate(-50%, -50%) scale(.8);
  animation: nf-ripple var(--nf-duration, 1400ms) ease-out forwards;
}

/* Variant: ring (quick pop then fade) */
@keyframes nf-ring {
  0%   { transform: translate(-50%, -50%) scale(.7); opacity: .15 }
  35%  { transform: translate(-50%, -50%) scale(1.05); opacity: .9 }
  100% { transform: translate(-50%, -50%) scale(1.35); opacity: 0 }
}
.neon-frame.is-anim[style*="'ring'"] {
  animation-name: nf-ring;
}

/* Base pulse (fallback / 'glow') */
@keyframes nf-pulse {
  0%   { transform: translate(-50%, -50%) scale(.5); opacity: .1 }
  40%  { transform: translate(-50%, -50%) scale(1.08); opacity: 1 }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0 }
}

/* Aura shimmer */
@keyframes nf-aura {
  0% { opacity: .15 }
  50% { opacity: .5 }
  100% { opacity: 0 }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .neon-frame.is-anim { animation-duration: 1ms !important; }
  .neon-frame.is-anim::before,
  .neon-frame.is-anim::after { animation-duration: 1ms !important; }
}
</style>
