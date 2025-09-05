<script setup>
import { onMounted, defineExpose } from 'vue'

let $svg, $path

function injectDefs() {
  const ns = 'http://www.w3.org/2000/svg'
  const defs = document.createElementNS(ns, 'defs')

  // --- Gradient ya “celestial” ---
  const grad = document.createElementNS(ns, 'linearGradient')
  grad.setAttribute('id', 'celestialGrad')
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%')
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%')
  const mkStop = (o, c) => {
    const s = document.createElementNS(ns, 'stop')
    s.setAttribute('offset', o); s.setAttribute('stop-color', c); return s
  }
  grad.append(
    mkStop('0%',  '#a78bfa'),   // violet-400
    mkStop('50%', '#ec4899'),   // pink-500
    mkStop('100%','#22d3ee')    // cyan-400
  )

  // --- Shimmer filter (aura + displacement) ---
  const filter = document.createElementNS(ns, 'filter')
  filter.setAttribute('id', 'auraShimmer')
  filter.setAttribute('x', '-50%'); filter.setAttribute('y', '-50%')
  filter.setAttribute('width', '200%'); filter.setAttribute('height', '200%')

  const turb = document.createElementNS(ns, 'feTurbulence')
  turb.setAttribute('type', 'fractalNoise')
  turb.setAttribute('baseFrequency', '0.9')
  turb.setAttribute('numOctaves', '1')
  turb.setAttribute('seed', '7')
  turb.setAttribute('result', 'noise')

  const disp = document.createElementNS(ns, 'feDisplacementMap')
  disp.setAttribute('in', 'SourceGraphic')
  disp.setAttribute('in2', 'noise')
  disp.setAttribute('scale', '1.2') // subtle shimmer
  disp.setAttribute('xChannelSelector', 'R')
  disp.setAttribute('yChannelSelector', 'G')
  disp.setAttribute('result', 'dsp')

  const blur = document.createElementNS(ns, 'feGaussianBlur')
  blur.setAttribute('stdDeviation', '0.8')
  blur.setAttribute('in', 'dsp')
  blur.setAttribute('result', 'soft')

  const cm = document.createElementNS(ns, 'feColorMatrix')
  cm.setAttribute('type', 'matrix')
  cm.setAttribute('values', `
    1 0 0 0 0
    0 1 0 0 0
    0 0 1 0 0
    0 0 0 18 -8
  `)
  cm.setAttribute('in', 'soft')
  cm.setAttribute('result', 'glow')

  const merge = document.createElementNS(ns, 'feMerge')
  const n1 = document.createElementNS(ns, 'feMergeNode'); n1.setAttribute('in','glow')
  const n2 = document.createElementNS(ns, 'feMergeNode'); n2.setAttribute('in','SourceGraphic')
  merge.append(n1, n2)

  filter.append(turb, disp, blur, cm, merge)
  defs.append(grad, filter)
  $svg.prepend(defs)
}

function spiritualize() {
  // Mobile-first sizing via CSS var
  $svg.removeAttribute('width')
  $svg.removeAttribute('height')
  $svg.classList.add('celestial-svg')

  // Path → stroke-draw ya rohoni
  $path.setAttribute('fill', 'none')
  $path.setAttribute('stroke', 'url(#celestialGrad)')
  $path.setAttribute('stroke-width', '1.8')
  $path.setAttribute('stroke-linecap', 'round')
  $path.setAttribute('stroke-linejoin', 'round')
  $path.setAttribute('filter', 'url(#auraShimmer)')

  const len = 1400
  $path.setAttribute('stroke-dasharray', String(len))
  $path.setAttribute('stroke-dashoffset', String(len))
}

function trigger() {
  // Restart path draw
  $path.style.animation = 'none'
  void $path.getBoundingClientRect()
  $path.style.animation = ''
  // Restart container aura
  $svg.classList.remove('is-on')
  void $svg.getBoundingClientRect()
  $svg.classList.add('is-on')
  try { navigator.vibrate?.(6) } catch {}
}

function setTheme(theme = 'aurora') {
  // Badilisha palette ya gradient
  const stops = $svg.querySelectorAll('#celestialGrad stop')
  const palettes = {
    aurora:   ['#a78bfa', '#ec4899', '#22d3ee'],
    spirit:   ['#22d3ee', '#94a3b8', '#a78bfa'],
    tanzania: ['#1EB53A', '#FCD116', '#00A3DD'],
    solar:    ['#fde047', '#fb923c', '#f43f5e'],
    neon:     ['#22c55e', '#a855f7', '#06b6d4']
  }
  const p = palettes[theme] || palettes.aurora
  stops[0].setAttribute('stop-color', p[0])
  stops[1].setAttribute('stop-color', p[1])
  stops[2].setAttribute('stop-color', p[2])
  trigger()
}

function setSize(px = 'clamp(22px, 9vw, 120px)') {
  $svg.style.setProperty('--celestial-size', typeof px === 'number' ? `${px}px` : px)
}

defineExpose({ trigger, setTheme, setSize })

onMounted(() => {
  $svg  = document.querySelector('svg')
  $path = $svg?.querySelector('path')
  if (!$svg || !$path) return
  injectDefs()
  spiritualize()
  setSize('clamp(22px, 9vw, 120px)')
  setTheme('aurora')
  trigger()
})
</script>

<style scoped>
/* Mobile-first: responsive via clamp + vw */
svg.celestial-svg{
  width: var(--celestial-size, clamp(22px, 9vw, 120px));
  height: var(--celestial-size, clamp(22px, 9vw, 120px));
  display:block;
  pointer-events:none;
  transform-origin: 50% 50%;
  /* Multi-drop halo (cheap & GPU) */
  filter:
    drop-shadow(0 0 8px rgba(167,139,250,.28))
    drop-shadow(0 0 16px rgba(236,72,153,.22))
    drop-shadow(0 0 26px rgba(34,211,238,.20));
}

/* Container aura spin + soft scale */
svg.celestial-svg.is-on{
  animation: celestialSpin 7s linear infinite;
}
@keyframes celestialSpin{
  0%   { transform: rotate(0deg)   scale(1) }
  50%  { transform: rotate(180deg) scale(1.035) }
  100% { transform: rotate(360deg) scale(1) }
}

/* Stroke-draw + “breath” */
svg.celestial-svg path{
  animation:
    celestialDraw 1.65s cubic-bezier(.19,1,.22,1) forwards,
    celestialBreathe 3.6s ease-in-out 1.65s infinite;
}
@keyframes celestialDraw{
  0%   { stroke-dashoffset: 1400; opacity:.2 }
  60%  { stroke-dashoffset: 180;  opacity:.95 }
  100% { stroke-dashoffset: 0;    opacity:1 }
}
@keyframes celestialBreathe{
  0%,100% { stroke-width: 1.8 }
  50%     { stroke-width: 2.2 }
}

/* Optional scanline shimmer (conic overlay) */
svg.celestial-svg::after{
  content:'';
  position:absolute; inset:-10%;
  background:
    conic-gradient(from 0deg,
      rgba(255,255,255,.12), transparent 30%, transparent 70%, rgba(255,255,255,.12));
  mix-blend-mode: screen;
  opacity:.0;
  pointer-events:none;
}
svg.celestial-svg.is-on::after{
  animation: scan 2.8s ease-in-out infinite;
}
@keyframes scan{
  0%,100%{ opacity:.0; transform: rotate(0deg) }
  50%    { opacity:.18; transform: rotate(20deg) }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  svg.celestial-svg.is-on{ animation-duration: 1ms !important }
  svg.celestial-svg path{ animation: celestialDraw 1ms forwards !important }
}
</style>
