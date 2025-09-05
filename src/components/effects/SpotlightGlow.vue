<template>
  <div class="spotlight-wrapper" :style="wrapStyle">
    <div class="spotlight" :style="spotStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineExpose } from 'vue'

/**
 * Props (mobile-first defaults):
 * size: clamp(180px, 48vw, 360px)
 * color: rgba(255,255,255,0.75)
 * blur: 12px
 * duration: 1200 (ms)
 * variant: 'glow' | 'cone' | 'sweep'
 * rotate: 'auto' | angle e.g. '45deg'
 * x/y: position (px | %) of wrapper
 * autoCenter: center transform
 */
const props = withDefaults(defineProps<{
  size?: string
  color?: string
  blur?: string
  duration?: number
  variant?: 'glow'|'cone'|'sweep'
  rotate?: string
  x?: number|string
  y?: number|string
  autoCenter?: boolean
}>(), {
  size: 'clamp(180px, 48vw, 360px)',
  color: 'rgba(255,255,255,0.75)',
  blur: '12px',
  duration: 1200,
  variant: 'glow',
  rotate: 'auto',
  x: '50%',
  y: '10%',
  autoCenter: true
})

/* Inline styles (tunabaki na :style) */
const wrapStyle = ref<Record<string,string>>({
  left: typeof props.x === 'number' ? `${props.x}px` : props.x,
  top:  typeof props.y === 'number' ? `${props.y}px` : props.y,
  transform: props.autoCenter ? 'translate(-50%, 0)' : ''
})
const spotStyle = ref<Record<string,string>>({
  '--sp-size': props.size,
  '--sp-color': props.color,
  '--sp-blur': props.blur,
  '--sp-duration': `${props.duration}ms`,
  '--sp-variant': `'${props.variant}'`,
  '--sp-rot': props.rotate === 'auto' ? `${Math.floor(Math.random()*360)}deg` : props.rotate
})

/* Public API */
function trigger(variant: 'glow'|'cone'|'sweep' = props.variant){
  spotStyle.value['--sp-variant'] = `'${variant}'`
  // randomize rotation if 'auto'
  if (props.rotate === 'auto'){
    spotStyle.value['--sp-rot'] = `${Math.floor(Math.random()*360)}deg`
  }
  const el = document.querySelector('.spotlight') as HTMLElement | null
  if (!el) return
  el.classList.remove('is-anim')
  void el.offsetWidth // reflow
  el.classList.add('is-anim')
  try{ navigator.vibrate?.(6) }catch{}
}
function moveTo(x: number|string, y: number|string, center = true){
  wrapStyle.value.left = typeof x === 'number' ? `${x}px` : String(x)
  wrapStyle.value.top  = typeof y === 'number' ? `${y}px` : String(y)
  wrapStyle.value.transform = center ? 'translate(-50%, 0)' : ''
}
function setOptions(opts: Partial<Record<string,string|number>> = {}){
  if (opts.size) spotStyle.value['--sp-size'] = String(opts.size)
  if (opts.color) spotStyle.value['--sp-color'] = String(opts.color)
  if (opts.blur) spotStyle.value['--sp-blur'] = String(opts.blur)
  if (opts.duration) spotStyle.value['--sp-duration'] =
    typeof opts.duration === 'number' ? `${opts.duration}ms` : String(opts.duration)
  if (opts.variant) spotStyle.value['--sp-variant'] = `'${opts.variant}'`
  if (opts.rotate) spotStyle.value['--sp-rot'] = String(opts.rotate)
  trigger((opts.variant as any) ?? props.variant)
}
defineExpose({ trigger, moveTo, setOptions })

onMounted(() => trigger(props.variant))
</script>

<style scoped>
/* Wrapper: mobile-first width via content sizing */
.spotlight-wrapper{
  position: absolute;
  left: 50%;
  top: 10%;
  width: var(--sp-size, clamp(180px, 48vw, 360px));
  height: var(--sp-size, clamp(180px, 48vw, 360px));
  pointer-events: none;
  z-index: 999;
}

/* Node */
.spotlight{
  width: 100%; height: 100%;
  border-radius: 50%;
  filter: blur(var(--sp-blur, 12px));
  /* Default gradient = glow orb */
  background:
    radial-gradient(circle at 50% 50%,
      color-mix(in oklab, var(--sp-color, rgba(255,255,255,.75)) 88%, transparent),
      transparent 70%);
  opacity: 0;
  transform: rotate(var(--sp-rot, 0deg)) scale(.9);
}

/* Animate only when .is-anim iko */
.spotlight.is-anim{
  animation-duration: var(--sp-duration, 1200ms);
  animation-fill-mode: forwards;
  animation-timing-function: ease-out;
  animation-name: sp-glow; /* fallback */
}

/* ========= Variants ========= */
/* 1) glow (orb pulse) */
@keyframes sp-glow{
  0%   { opacity:.2; transform: rotate(var(--sp-rot)) scale(.6) }
  50%  { opacity:.75; transform: rotate(var(--sp-rot)) scale(1.08) }
  100% { opacity:0; transform: rotate(var(--sp-rot)) scale(1) }
}
.spotlight.is-anim[style*="'glow'"]{ animation-name: sp-glow }

/* 2) cone (stage spotlight) */
.spotlight.is-anim[style*="'cone'"]{
  /* elliptical cone from top, with subtle beam */
  background:
    radial-gradient(60% 52% at 50% 40%,
      color-mix(in oklab, var(--sp-color) 80%, transparent), transparent 70%),
    conic-gradient(from 0deg at 50% 20%,
      color-mix(in oklab, var(--sp-color) 22%, transparent) 0 10deg,
      transparent 10deg 350deg,
      color-mix(in oklab, var(--sp-color) 22%, transparent) 350deg 360deg);
  animation-name: sp-cone;
}
@keyframes sp-cone{
  0%   { opacity:.15; transform: rotate(var(--sp-rot)) scale(.7) }
  40%  { opacity:.7;  transform: rotate(var(--sp-rot)) scale(1.05) }
  100% { opacity:0;   transform: rotate(calc(var(--sp-rot) + 15deg)) scale(1) }
}

/* 3) sweep (rotational sweep) */
.spotlight.is-anim[style*="'sweep'"]{
  background:
    radial-gradient(closest-side at 50% 50%,
      color-mix(in oklab, var(--sp-color) 70%, transparent), transparent 72%),
    conic-gradient(from 0deg at 50% 50%,
      color-mix(in oklab, var(--sp-color) 36%, transparent) 0 40deg,
      transparent 40deg 360deg);
  animation-name: sp-sweep;
}
@keyframes sp-sweep{
  0%   { opacity:.2; transform: rotate(var(--sp-rot)) scale(.6) }
  60%  { opacity:.8; transform: rotate(calc(var(--sp-rot) + 180deg)) scale(1.06) }
  100% { opacity:0;  transform: rotate(calc(var(--sp-rot) + 360deg)) scale(1) }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .spotlight.is-anim{ animation-duration: 1ms !important }
}
</style>
