<template>
  <div class="sparkle-container" :style="containerStyle">
    <div v-for="n in 12" :key="n" class="sparkle" :style="getStyle(n)"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineExpose } from 'vue'

/**
 * Mobile-first options via CSS vars (unaweza kubadilisha runtime):
 * --sp-radius: umbali wa miale (default clamp(36px, 18vw, 160px))
 * --sp-size:   ukubwa wa chembe (default clamp(6px, 1.8vw, 10px))
 * --sp-color:  rangi ya mng’ao (default rgba(255,255,255,0.95))
 * --sp-blur:   ukali wa blur (default 4px)
 * --sp-duration: muda wa animation (default 900ms)
 * --sp-twinkle: 0/1 kuwasha twinkle
 * --sp-spin: 0/1 kuzungusha kontena lote (subtle)
 */
const containerStyle = ref<Record<string, string>>({
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  '--sp-radius': 'clamp(36px, 18vw, 160px)',
  '--sp-size': 'clamp(6px, 1.8vw, 10px)',
  '--sp-color': 'rgba(255,255,255,0.95)',
  '--sp-blur': '4px',
  '--sp-duration': '900ms',
  '--sp-twinkle': '1',
  '--sp-spin': '0'
})

/** Haptics kidogo kwa simu */
function haptic(ms = 6) { try { navigator.vibrate?.(ms) } catch {} }

/** Restart animation kwa macho ya “burst” */
function trigger() {
  const el = document.querySelector('.sparkle-container')
  if (!el) return
  el.classList.remove('is-on')
  // force reflow
  void (el as HTMLElement).offsetWidth
  el.classList.add('is-on')
  haptic(6)
}

/** Hamisha burst katikati mpya (x,y: px au %) */
function moveTo(x: number | string, y: number | string, center = true) {
  containerStyle.value.left = typeof x === 'number' ? `${x}px` : String(x)
  containerStyle.value.top = typeof y === 'number' ? `${y}px` : String(y)
  containerStyle.value.transform = center ? 'translate(-50%, -50%)' : ''
}

/** Badilisha chaguo papo hapo (color, radius, size, duration, spin, twinkle) */
function setOptions(opts: Partial<Record<string, string | number>> = {}) {
  if (opts.radius) containerStyle.value['--sp-radius'] = String(opts.radius)
  if (opts.size) containerStyle.value['--sp-size'] = String(opts.size)
  if (opts.color) containerStyle.value['--sp-color'] = String(opts.color)
  if (opts.blur) containerStyle.value['--sp-blur'] = String(opts.blur)
  if (opts.duration) containerStyle.value['--sp-duration'] = typeof opts.duration === 'number' ? `${opts.duration}ms` : String(opts.duration)
  if (opts.twinkle != null) containerStyle.value['--sp-twinkle'] = String(opts.twinkle)
  if (opts.spin != null) containerStyle.value['--sp-spin'] = String(opts.spin)
  trigger()
}

defineExpose({ trigger, moveTo, setOptions })

/** STYLE ya kila sparkle: pembe + kuchelewesha kidogo */
const getStyle = (index: number) => {
  const angle = (360 / 12) * index
  const delay = (Math.random() * 0.25).toFixed(3) + 's'
  return {
    '--ang': angle + 'deg',
    '--delay': delay
  } as Record<string, string>
}

onMounted(() => {
  trigger()
})
</script>

<style scoped>
/* KONTENA — mobile-first, finger-safe na optional spin */
.sparkle-container{
  position: absolute;
  width: 0; height: 0;
  pointer-events: none;
  z-index: 1001;
  transform: translate(-50%, -50%);
  /* Spin ya hiari (subtle) */
  animation: sc-spin var(--sp-duration, 900ms) ease-out;
  animation-play-state: paused;
}
.sparkle-container.is-on{
  animation-play-state: running;
}
@keyframes sc-spin{
  0%   { transform: translate(-50%, -50%) rotate(0deg) }
  100% { transform: translate(-50%, -50%) rotate(calc(var(--sp-spin, 0) * 18deg)) }
}

/* CHEMBE — hutegemea CSS vars (radius/size/duration) */
.sparkle{
  position: absolute;
  left: 0; top: 0;
  width: var(--sp-size, 8px);
  height: var(--sp-size, 8px);
  border-radius: 9999px;
  opacity: 0;
  filter: blur(var(--sp-blur, 4px));
  background:
    radial-gradient(circle at 50% 50%, var(--sp-color, rgba(255,255,255,.95)) 0%, transparent 70%),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,.45), transparent 65%);
  /* Panga kwa mzunguko: rotate(angle) translateY(-radius) */
  transform: rotate(var(--ang, 0deg)) translate(0, calc(var(--sp-radius, 140px) * -1));
  transform-origin: 0 0;
  animation: burst var(--sp-duration, 900ms) ease-out forwards;
  animation-delay: var(--delay, 0s);
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
}

/* BURST (mobile-first, GPU transforms only) */
@keyframes burst{
  0%   { opacity: 0; transform: rotate(var(--ang)) translate(0, calc(var(--sp-radius) * -0.35)) scale(.3) }
  40%  { opacity: 1; transform: rotate(var(--ang)) translate(0, calc(var(--sp-radius) * -1)) scale(1.1) }
  100% { opacity: 0; transform: rotate(var(--ang)) translate(0, calc(var(--sp-radius) * -1.35)) scale(.2) }
}

/* TWINKLE overlay (optional, cheap) */
.sparkle::after{
  content:'';
  position:absolute; inset:0;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(255,255,255,.9), transparent 60%);
  opacity: 0;
  animation: twinkle calc(var(--sp-duration, 900ms) * .9) ease-in-out forwards;
  animation-delay: var(--delay, 0s);
}
@keyframes twinkle{
  0%{ opacity: 0 }
  60%{ opacity: calc(var(--sp-twinkle, 1) * .85) }
  100%{ opacity: 0 }
}

/* Reduced motion: punguza mwendo */
@media (prefers-reduced-motion: reduce){
  .sparkle,
  .sparkle::after,
  .sparkle-container{ animation-duration: 1ms !important }
}
</style>
