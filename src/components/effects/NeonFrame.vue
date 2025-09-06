<template>
  <!-- Root: fixed overlay so it can follow any target on the page -->
  <div
    v-show="visible"
    ref="root"
    class="nf-root"
    :style="rootStyle"
    :aria-hidden="!visible"
    @click="interactive && trigger()"
  >
    <!-- Actual neon frame -->
    <div
      ref="frameEl"
      class="neon-frame"
      :class="{ 'is-anim': animOn }"
      :data-variant="currentVariant"
      :style="frameStyle"
    />
    <!-- Optional content inside the frame (icons/hints) -->
    <slot />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/**
 * Props (mobile-first)
 */
const props = defineProps({
  size:       { type: String, default: 'clamp(140px, 38vw, 220px)' },
  color:      { type: String, default: 'rgba(0,217,255,0.9)' },
  thickness:  { type: String, default: '4px' },
  duration:   { type: [Number, String], default: 1400 },     // ms
  variant:    { type: String, default: 'glow' },             // glow | ripple | ring | scan
  radius:     { type: String, default: '16px' },
  rotate:     { type: String, default: '0deg' },
  x:          { type: [Number, String], default: '50%' },
  y:          { type: [Number, String], default: '50%' },
  autoCenter: { type: Boolean, default: true },
  interactive:{ type: Boolean, default: false },             // click/tap to trigger
  visible:    { type: Boolean, default: true },

  /* Follow an element (selector/HTMLElement/Vue ref) */
  target:       { type: [String, Object], default: null },
  fitToTarget:  { type: Boolean, default: true },
  padding:      { type: [Number, String], default: 12 },     // px

  /* Animation repeats: number or "infinite" */
  repeat:       { type: [Number, String], default: 1 },
})

/* State */
const root = ref(null)
const frameEl = ref(null)
const animOn = ref(false)
const currentVariant = ref(props.variant)
const followingEl = ref(null)
const visible = computed(() => props.visible !== false)

/* Root positioning (fixed overlay) */
const rootStyle = reactive({
  position: 'fixed',
  inset: 'auto',
  top: asPx(props.y),
  left: asPx(props.x),
  transform: transformTL(props.autoCenter, props.rotate),
  pointerEvents: props.interactive ? 'auto' : 'none',
  zIndex: 1000,
})

/* Frame CSS variables */
const frameStyle = reactive({
  // CSS vars consumed by stylesheet
  '--nf-size': props.size,
  '--nf-color': props.color,
  '--nf-thickness': props.thickness,
  '--nf-duration': asDuration(props.duration),
  '--nf-radius': props.radius,
  '--nf-iter': String(props.repeat),
})

/* Helpers */
function asPx(v) {
  if (typeof v === 'number') return `${v}px`
  return v
}
function asDuration(v) {
  return typeof v === 'number' ? `${v}ms` : v
}
function transformTL(center, rotate) {
  return `${center ? 'translate(-50%, -50%) ' : ''}rotate(${rotate})`
}

/* Re-apply styles when props change */
watch(
  () => [props.size, props.color, props.thickness, props.duration, props.radius, props.repeat],
  () => {
    frameStyle['--nf-size'] = props.size
    frameStyle['--nf-color'] = props.color
    frameStyle['--nf-thickness'] = props.thickness
    frameStyle['--nf-duration'] = asDuration(props.duration)
    frameStyle['--nf-radius'] = props.radius
    frameStyle['--nf-iter'] = String(props.repeat)
    scheduleTrigger()
  }
)
watch(() => [props.x, props.y, props.rotate, props.autoCenter], () => {
  // only when NOT following a target
  if (!followingEl.value) {
    rootStyle.top = asPx(props.y)
    rootStyle.left = asPx(props.x)
    rootStyle.transform = transformTL(props.autoCenter, props.rotate)
  }
})
watch(() => props.variant, (v) => { currentVariant.value = v; trigger(v) })

/* --- Follow target element (optional) --- */
function resolveElement(src) {
  if (!src) return null
  if (typeof src === 'string') return document.querySelector(src)
  if (src instanceof Element) return src
  if (src && src.$el instanceof Element) return src.$el
  return null
}
function updateFollowPosition() {
  if (!followingEl.value || !root.value) return
  const rect = followingEl.value.getBoundingClientRect()
  const pad = typeof props.padding === 'number' ? props.padding : parseFloat(String(props.padding)) || 0
  // center of target
  rootStyle.top = `${rect.top + rect.height / 2}px`
  rootStyle.left = `${rect.left + rect.width / 2}px`
  rootStyle.transform = transformTL(true, props.rotate)
  if (props.fitToTarget && frameEl.value) {
    const sizePx = Math.max(rect.width, rect.height) + pad * 2
    frameStyle['--nf-size'] = `${Math.round(sizePx)}px`
  }
}
function follow(elOrSelector) {
  followingEl.value = resolveElement(elOrSelector)
  if (followingEl.value) {
    updateFollowPosition()
    startRafFollow()
  }
}
function stopFollowing() {
  followingEl.value = null
  stopRafFollow()
  // fall back to explicit x/y
  rootStyle.top = asPx(props.y)
  rootStyle.left = asPx(props.x)
  rootStyle.transform = transformTL(props.autoCenter, props.rotate)
  frameStyle['--nf-size'] = props.size
}
let rafId = 0
function startRafFollow() {
  stopRafFollow()
  const loop = () => {
    updateFollowPosition()
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}
function stopRafFollow() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

/* --- Public API --- */
async function trigger(variant = currentVariant.value) {
  currentVariant.value = variant
  if (!frameEl.value) return
  animOn.value = false
  // force reflow to restart the animation
  // eslint-disable-next-line no-unused-expressions
  frameEl.value.offsetWidth
  animOn.value = true
}
function scheduleTrigger() {
  // small debounce to avoid rapid thrash on multiple prop changes
  clearTimeout(scheduleTrigger._t)
  scheduleTrigger._t = setTimeout(() => trigger(), 16)
}
function moveTo(x, y, center = true) {
  stopFollowing()
  rootStyle.top = asPx(x === undefined ? props.y : y)
  rootStyle.left = asPx(y === undefined ? props.x : x)
  rootStyle.transform = transformTL(center, props.rotate)
}
function setOptions(opts = {}) {
  if ('size' in opts) frameStyle['--nf-size'] = opts.size
  if ('color' in opts) frameStyle['--nf-color'] = opts.color
  if ('thickness' in opts) frameStyle['--nf-thickness'] = opts.thickness
  if ('duration' in opts) frameStyle['--nf-duration'] = asDuration(opts.duration)
  if ('radius' in opts) frameStyle['--nf-radius'] = opts.radius
  if ('repeat' in opts) frameStyle['--nf-iter'] = String(opts.repeat)
  if ('rotate' in opts) rootStyle.transform = transformTL(props.autoCenter, String(opts.rotate))
  if ('variant' in opts) currentVariant.value = String(opts.variant)
  trigger(currentVariant.value)
}

defineExpose({ trigger, moveTo, setOptions, follow, stopFollowing })

/* Mount */
onMounted(() => {
  if (props.target) follow(props.target)
  // fire once to show feedback
  nextTick(() => trigger(currentVariant.value))
  window.addEventListener('resize', updateFollowPosition, { passive: true })
  window.addEventListener('scroll', updateFollowPosition, { passive: true })
})
onBeforeUnmount(() => {
  stopRafFollow()
  window.removeEventListener('resize', updateFollowPosition)
  window.removeEventListener('scroll', updateFollowPosition)
})
</script>

<style scoped>
/* Root container */
.nf-root {
  /* safe-area friendly if used near edges */
  padding: max(env(safe-area-inset-top,0px), 0px)
           max(env(safe-area-inset-right,0px), 0px)
           max(env(safe-area-inset-bottom,0px), 0px)
           max(env(safe-area-inset-left,0px), 0px);
}

/* Main frame */
.neon-frame{
  position: absolute;
  width: var(--nf-size, clamp(140px, 38vw, 220px));
  height: var(--nf-size, clamp(140px, 38vw, 220px));
  border-radius: var(--nf-radius, 16px);
  border: var(--nf-thickness, 4px) solid color-mix(in oklab, var(--nf-color, rgba(0,217,255,0.9)) 90%, transparent);
  pointer-events: none;
  will-change: transform, filter;
  backdrop-filter: blur(4px);

  /* layered neon glow */
  box-shadow:
    0 0 20px color-mix(in oklab, var(--nf-color, rgba(0,217,255,0.9)) 90%, transparent),
    0 0 60px color-mix(in oklab, var(--nf-color, rgba(0,217,255,0.9)) 65%, transparent),
    0 0 100px color-mix(in oklab, var(--nf-color, rgba(0,217,255,0.9)) 40%, transparent);
}

/* Animation plumbing */
.neon-frame.is-anim{
  animation-duration: var(--nf-duration, 1400ms);
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  animation-iteration-count: var(--nf-iter, 1);
}

/* Default variant = glow (pulse + aura) */
.neon-frame.is-anim[data-variant="glow"],
.neon-frame.is-anim:not([data-variant]) {
  animation-name: nf-pulse;
}
.neon-frame.is-anim[data-variant="glow"]::before,
.neon-frame.is-anim:not([data-variant])::before{
  content:'';
  position:absolute; inset:-6%;
  border-radius: inherit;
  pointer-events:none;
  background: radial-gradient(circle at 50% 50%,
    color-mix(in oklab, var(--nf-color) 28%, transparent),
    transparent 60%);
  filter: blur(10px);
  animation: nf-aura var(--nf-duration, 1400ms) ease-out forwards;
}

/* Variant: ripple (expanding ring) */
.neon-frame.is-anim[data-variant="ripple"]::after{
  content:'';
  position:absolute; inset:-8%;
  border-radius: inherit; pointer-events:none;
  border: 2px solid color-mix(in oklab, var(--nf-color) 75%, transparent);
  transform: translate(-50%, -50%) scale(.8);
  left:50%; top:50%;
  animation: nf-ripple var(--nf-duration, 1400ms) ease-out forwards;
}

/* Variant: ring (quick pop) */
.neon-frame.is-anim[data-variant="ring"]{
  animation-name: nf-ring;
}

/* Variant: scan (conic sweep around border) */
.neon-frame.is-anim[data-variant="scan"]{
  --scan-color: color-mix(in oklab, var(--nf-color) 85%, transparent);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  padding: 2px;
  background:
    conic-gradient(from 0deg, var(--scan-color), transparent 30% 70%, var(--scan-color)) border-box;
  animation-name: nf-scan;
}

/* Keyframes */
@keyframes nf-pulse {
  0%   { transform: scale(.9); opacity: .35; filter: blur(.2px) }
  40%  { transform: scale(1.04); opacity: 1; filter: blur(0) }
  100% { transform: scale(1); opacity: .88; }
}
@keyframes nf-aura {
  0%   { opacity:.15 }
  50%  { opacity:.5 }
  100% { opacity:0 }
}
@keyframes nf-ripple {
  0%   { transform: translate(-50%,-50%) scale(.6); opacity: .12 }
  50%  { transform: translate(-50%,-50%) scale(1.15); opacity: .6 }
  100% { transform: translate(-50%,-50%) scale(1.9); opacity: 0 }
}
@keyframes nf-ring {
  0%   { transform: scale(.86); opacity: .2 }
  35%  { transform: scale(1.06); opacity: 1 }
  100% { transform: scale(1.22); opacity: 0 }
}
@keyframes nf-scan {
  0%   { transform: rotate(0deg) }
  100% { transform: rotate(360deg) }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .neon-frame.is-anim { animation-duration: 1ms !important; }
}
</style>
