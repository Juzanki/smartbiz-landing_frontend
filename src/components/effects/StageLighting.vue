<template>
  <div class="absolute inset-0 z-0 pointer-events-none">
    <div class="absolute w-full h-full bg-gradient-to-br from-purple-800/30 via-transparent to-pink-700/30 animate-pulse"></div>
    <div class="absolute w-1/2 h-1/2 bg-indigo-600/20 rounded-full blur-2xl top-1/4 left-1/4 animate-fade"></div>
    <div class="absolute w-1/3 h-1/3 bg-pink-500/20 rounded-full blur-2xl top-1/2 left-2/3 animate-fade delay-1000"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Parallax nyepesi: tunahesabu tilt na kuiweka kwenye CSS vars
 * --tilt-x / --tilt-y (px). Tunazi-apply kwa blobs via CSS.
 */
let moveHandler, tiltHandler
onMounted(async () => {
  const root = document.querySelector('.absolute.inset-0.z-0.pointer-events-none')
  if (!root) return

  // helper: set vars
  const setVars = (x = 0, y = 0) => {
    // limit kidogo kwa simu
    const max = 18
    const clampedX = Math.max(-max, Math.min(max, x))
    const clampedY = Math.max(-max, Math.min(max, y))
    root.style.setProperty('--tilt-x', `${clampedX}px`)
    root.style.setProperty('--tilt-y', `${clampedY}px`)
  }

  // Mouse parallax (desktop)
  moveHandler = (e) => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const dx = (e.clientX - cx) / cx // -1..1
    const dy = (e.clientY - cy) / cy // -1..1
    setVars(dx * 18, dy * 12)
  }
  window.addEventListener('mousemove', moveHandler, { passive: true })

  // DeviceOrientation (mobile) — iOS permission if needed
  if (typeof DeviceOrientationEvent !== 'undefined') {
    try {
      // @ts-ignore
      if (DeviceOrientationEvent.requestPermission) {
        const p = await DeviceOrientationEvent.requestPermission()
        if (p !== 'granted') throw new Error('denied')
      }
      tiltHandler = (ev) => {
        const gx = (ev.gamma ?? 0) / 45 // -1..1
        const gy = (ev.beta ?? 0) / 45
        setVars(gx * 16, gy * 10)
      }
      window.addEventListener('deviceorientation', tiltHandler, { passive: true })
    } catch { /* ignore permission errors */ }
  }
})

onBeforeUnmount(() => {
  if (moveHandler) window.removeEventListener('mousemove', moveHandler)
  if (tiltHandler) window.removeEventListener('deviceorientation', tiltHandler)
})
</script>

<style scoped>
/* ============ Mobile-first variables (brandable) ============ */
:host,
.absolute.inset-0.z-0.pointer-events-none{
  /* safe-area padding so edges look balanced on phones */
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);

  /* Customizable theme knobs */
  --bg-opacity: 1;
  --blob1-scale: clamp(0.9, 2vw, 1.05);
  --blob2-scale: clamp(0.9, 2.5vw, 1.08);
  --tilt-x: 0px;
  --tilt-y: 0px;
  --fade-dur: 4s;
}

/* Layer 1: background gradient — add subtle vignette via ::after */
.absolute.inset-0.z-0.pointer-events-none > div:nth-child(1){
  opacity: var(--bg-opacity);
  will-change: opacity;
}
.absolute.inset-0.z-0.pointer-events-none > div:nth-child(1)::after{
  content:'';
  position:absolute; inset:0;
  background: radial-gradient(120% 120% at 50% 100%,
    rgba(0,0,0,.18), transparent 60%);
  pointer-events:none;
}

/* Layer 2 blob (indigo) — parallax + responsive scale */
.absolute.inset-0.z-0.pointer-events-none > div:nth-child(2){
  transform:
    translate3d(calc(var(--tilt-x) * .35), calc(var(--tilt-y) * .25), 0)
    scale(var(--blob1-scale));
  transition: transform .18s ease-out;
  will-change: transform, opacity;
}

/* Layer 3 blob (pink) — slightly different parallax */
.absolute.inset-0.z-0.pointer-events-none > div:nth-child(3){
  transform:
    translate3d(calc(var(--tilt-x) * -.25), calc(var(--tilt-y) * .35), 0)
    scale(var(--blob2-scale));
  transition: transform .2s ease-out;
  will-change: transform, opacity;
}

/* ====== Animations ====== */
@keyframes fade {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}
.animate-fade {
  animation: fade var(--fade-dur, 4s) ease-in-out infinite;
}

/* Tailwind fallback for animate-pulse if not loaded */
@keyframes pulse-fallback {
  0%, 100% { opacity:.6 }
  50% { opacity:1 }
}
:global(.animate-pulse) {
  animation: pulse-fallback 2s cubic-bezier(0.4,0,0.6,1) infinite;
}

/* Prefer reduced motion: freeze parallax & slow fades */
@media (prefers-reduced-motion: reduce){
  .absolute.inset-0.z-0.pointer-events-none > div:nth-child(2),
  .absolute.inset-0.z-0.pointer-events-none > div:nth-child(3){
    transform: none !important;
    transition: none !important;
  }
  .animate-fade{ animation-duration: 1ms !important; }
}
</style>
