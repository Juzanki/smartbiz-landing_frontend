<template>
  <div class="smoke-trail" :style="style"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineExpose } from 'vue'

/**
 * Mobile-first props (hiari):
 * - size: clamp(56px, 20vw, 140px)
 * - color: rgba(220,220,220,0.65)
 * - blur: 8px
 * - duration: 2500 (ms)
 * - distance: 220 (px, how high it rises)
 * - variant: 'puff' | 'swirl' | 'drift'
 * - rotate: '0deg'
 * - x: left position (px or %). Default random (20–80%)
 * - y: bottom offset (px) – default 0
 */
const props = withDefaults(defineProps<{
  size?: string
  color?: string
  blur?: string
  duration?: number
  distance?: number
  variant?: 'puff'|'swirl'|'drift'
  rotate?: string
  x?: number|string
  y?: number|string
}>(), {
  size: 'clamp(56px, 20vw, 140px)',
  color: 'rgba(220,220,220,0.65)',
  blur: '8px',
  duration: 2500,
  distance: 220,
  variant: 'puff',
  rotate: '0deg',
  x: '',
  y: 0
})

/* Inline style (tunabaki na :style) */
const style = ref<Record<string,string>>({})

function randomX(){
  return `${Math.round(20 + Math.random()*60)}%` // 20%..80%
}

/* Public APIs */
function trigger(variant: 'puff'|'swirl'|'drift' = props.variant) {
  style.value['--sm-variant'] = `'${variant}'`
  const el = document.querySelector('.smoke-trail') as HTMLElement | null
  if (!el) return
  el.classList.remove('is-anim')
  void el.offsetWidth // reflow to restart
  el.classList.add('is-anim')
}
function moveTo(x: number|string, y: number|string = 0) {
  style.value.left = typeof x === 'number' ? `${x}px` : String(x)
  style.value.bottom = typeof y === 'number' ? `${y}px` : String(y)
}
function setOptions(opts: Partial<Record<string,string|number>>) {
  if (opts.size) style.value['--sm-size'] = String(opts.size)
  if (opts.color) style.value['--sm-color'] = String(opts.color)
  if (opts.blur) style.value['--sm-blur'] = String(opts.blur)
  if (opts.duration) style.value['--sm-duration'] = typeof opts.duration === 'number' ? `${opts.duration}ms` : String(opts.duration)
  if (opts.distance) style.value['--sm-distance'] = String(opts.distance)
  if (opts.variant) style.value['--sm-variant'] = `'${opts.variant}'`
  if (opts.rotate) style.value['--sm-rotate'] = String(opts.rotate)
  trigger((opts.variant as any) ?? props.variant)
}
function burst(times = 3, gapMs = 180) {
  let i = 0
  const tick = () => { trigger(); if (++i < times) setTimeout(tick, gapMs) }
  tick()
}
defineExpose({ trigger, moveTo, setOptions, burst })

onMounted(() => {
  style.value = {
    left: props.x === '' ? randomX() : (typeof props.x === 'number' ? `${props.x}px` : String(props.x)),
    bottom: typeof props.y === 'number' ? `${props.y}px` : String(props.y),
    transform: 'translateX(-50%)',
    '--sm-size': props.size,
    '--sm-color': props.color,
    '--sm-blur': props.blur,
    '--sm-duration': `${props.duration}ms`,
    '--sm-distance': `${props.distance}`,
    '--sm-variant': `'${props.variant}'`,
    '--sm-rotate': props.rotate
  }
  trigger(props.variant)
})
</script>

<style scoped>
/* Base node (mobile-first sizing via clamp) */
.smoke-trail{
  position: absolute;
  width: var(--sm-size, clamp(56px, 20vw, 140px));
  height: var(--sm-size, clamp(56px, 20vw, 140px));
  pointer-events: none;
  z-index: 1000;
  filter: blur(var(--sm-blur, 8px));
  /* Soft smoke cloud (layered radial gradients) */
  background:
    radial-gradient(closest-side, color-mix(in oklab, var(--sm-color, rgba(220,220,220,.65)) 80%, transparent), transparent 70%),
    radial-gradient(closest-side at 70% 30%, color-mix(in oklab, var(--sm-color) 45%, transparent), transparent 72%);
  border-radius: 50%;
  opacity: .9;
  transform-origin: center;
}

/* Multi-layer using pseudo-elements (hakuna DOM extra) */
.smoke-trail::before,
.smoke-trail::after{
  content:'';
  position:absolute; inset:-18% -10% -8% -12%;
  border-radius: 50%;
  background:
    radial-gradient(closest-side, color-mix(in oklab, var(--sm-color) 65%, transparent), transparent 70%),
    radial-gradient(closest-side at 25% 60%, color-mix(in oklab, var(--sm-color) 35%, transparent), transparent 75%);
  filter: blur(calc(var(--sm-blur, 8px) * 1.1));
  opacity: .7;
}

/* Animate only when class added (API trigger) */
.smoke-trail.is-anim{
  animation-duration: var(--sm-duration, 2500ms);
  animation-fill-mode: forwards;
  animation-timing-function: ease-out;
  animation-name: sm-rise; /* default (puff) */
}
.smoke-trail.is-anim::before{
  animation: sm-rise var(--sm-duration, 2500ms) ease-out forwards;
  animation-delay: 90ms;
}
.smoke-trail.is-anim::after{
  animation: sm-rise var(--sm-duration, 2500ms) ease-out forwards;
  animation-delay: 180ms;
}

/* Variants: switch via style token '--sm-variant' */
@keyframes sm-rise {
  0%   { transform: translate(-50%, 0) scale(.85) rotate(var(--sm-rotate,0deg)); opacity:.92 }
  50%  { transform: translate(-50%, calc(var(--sm-distance, 220px) * -0.45)) scale(1.04) rotate(var(--sm-rotate,0deg)); opacity:.6 }
  100% { transform: translate(-50%, calc(var(--sm-distance, 220px) * -1)) scale(1.12) rotate(var(--sm-rotate,0deg)); opacity:0 }
}
@keyframes sm-swirl {
  0%   { transform: translate(-50%, 0) scale(.85) rotate(0deg); opacity:.92 }
  40%  { transform: translate(-50%, calc(var(--sm-distance, 220px) * -0.5)) scale(1.05) rotate(12deg); opacity:.65 }
  100% { transform: translate(-50%, calc(var(--sm-distance, 220px) * -1)) scale(1.15) rotate(24deg); opacity:0 }
}
@keyframes sm-drift {
  0%   { transform: translate(-50%, 0) scale(.85) rotate(var(--sm-rotate,0deg)); opacity:.92 }
  60%  { transform: translate(calc(-50% - 12px), calc(var(--sm-distance, 220px) * -0.55)) scale(1.02) rotate(var(--sm-rotate,0deg)); opacity:.58 }
  100% { transform: translate(calc(-50% + 18px), calc(var(--sm-distance, 220px) * -1)) scale(1.12) rotate(var(--sm-rotate,0deg)); opacity:0 }
}

/* Apply chosen variant to main + layers */
.smoke-trail.is-anim[style*="'swirl'"]{ animation-name: sm-swirl; }
.smoke-trail.is-anim[style*="'swirl'"]::before,
.smoke-trail.is-anim[style*="'swirl'"]::after{ animation-name: sm-swirl }

.smoke-trail.is-anim[style*="'drift'"]{ animation-name: sm-drift; }
.smoke-trail.is-anim[style*="'drift'"]::before,
.smoke-trail.is-anim[style*="'drift'"]::after{ animation-name: sm-drift }

/* Accessibility: reduced motion */
@media (prefers-reduced-motion: reduce){
  .smoke-trail.is-anim,
  .smoke-trail.is-anim::before,
  .smoke-trail.is-anim::after{ animation-duration: 1ms !important; }
}
</style>
