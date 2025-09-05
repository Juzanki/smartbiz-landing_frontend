<script setup>
import { onMounted, defineExpose } from 'vue'

let $svg, $path

function injectDefs() {
  const ns = 'http://www.w3.org/2000/svg'
  const defs = document.createElementNS(ns, 'defs')

  // Gradient ya kifahari (brandable)
  const grad = document.createElementNS(ns, 'linearGradient')
  grad.setAttribute('id', 'bagGrad')
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%')
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%')
  const mkStop = (o, c) => {
    const s = document.createElementNS(ns, 'stop')
    s.setAttribute('offset', o); s.setAttribute('stop-color', c); return s
  }
  grad.append(
    mkStop('0%',  '#a78bfa'), // violet-400
    mkStop('55%', '#ec4899'), // pink-500
    mkStop('100%','#22d3ee')  // cyan-400
  )

  // Glow filter (aura laini + intensify)
  const filter = document.createElementNS(ns, 'filter')
  filter.setAttribute('id', 'bagGlow')
  filter.setAttribute('x', '-50%'); filter.setAttribute('y', '-50%')
  filter.setAttribute('width', '200%'); filter.setAttribute('height', '200%')

  const blur = document.createElementNS(ns, 'feGaussianBlur')
  blur.setAttribute('stdDeviation', '1.4')
  blur.setAttribute('in', 'SourceGraphic')
  blur.setAttribute('result', 'b')

  const cm = document.createElementNS(ns, 'feColorMatrix')
  cm.setAttribute('in', 'b')
  cm.setAttribute('type', 'matrix')
  cm.setAttribute('values', `
    1 0 0 0 0
    0 1 0 0 0
    0 0 1 0 0
    0 0 0 18 -8
  `)
  cm.setAttribute('result', 'g')

  const merge = document.createElementNS(ns, 'feMerge')
  const n1 = document.createElementNS(ns, 'feMergeNode'); n1.setAttribute('in','g')
  const n2 = document.createElementNS(ns, 'feMergeNode'); n2.setAttribute('in','SourceGraphic')
  merge.append(n1, n2)

  filter.append(blur, cm, merge)
  defs.append(grad, filter)
  $svg.prepend(defs)
}

function stylize() {
  // Mobile-first sizing via CSS var
  $svg.removeAttribute('width')
  $svg.removeAttribute('height')
  $svg.classList.add('bag-svg')

  // Paka gradient + stroke nyororo + glow
  $path.setAttribute('fill', 'url(#bagGrad)')
  $path.setAttribute('stroke', 'rgba(255,255,255,.35)')
  $path.setAttribute('stroke-width', '0.6')
  $path.setAttribute('filter', 'url(#bagGlow)')

  // Andaa stroke-draw token (kwa “trigger”)
  const len = 1200
  $path.setAttribute('stroke-dasharray', String(len))
  $path.setAttribute('stroke-dashoffset', String(len))
}

function trigger() {
  // Restart stroke-draw + aura breath
  $path.style.animation = 'none'
  void $path.getBoundingClientRect()
  $path.style.animation = ''
  $svg.classList.remove('is-on')
  void $svg.getBoundingClientRect()
  $svg.classList.add('is-on')
  try { navigator.vibrate?.(6) } catch {}
}

function setTheme(name = 'aurora') {
  const stops = $svg.querySelectorAll('#bagGrad stop')
  const palettes = {
    aurora:   ['#a78bfa','#ec4899','#22d3ee'],
    neon:     ['#22c55e','#06b6d4','#a78bfa'],
    solar:    ['#fde047','#fb923c','#f43f5e'],
    tanzania: ['#1EB53A','#FCD116','#00A3DD'],
    midnight: ['#60a5fa','#a78bfa','#f472b6']
  }
  const p = palettes[name] || palettes.aurora
  stops[0].setAttribute('stop-color', p[0])
  stops[1].setAttribute('stop-color', p[1])
  stops[2].setAttribute('stop-color', p[2])
  trigger()
}

function setSize(size = 'clamp(24px, 9.5vw, 128px)') {
  $svg.style.setProperty('--bag-size', typeof size === 'number' ? `${size}px` : size)
}

defineExpose({ trigger, setTheme, setSize })

onMounted(() => {
  $svg  = document.querySelector('svg.iconify--mdi, svg') // heshimu class yako
  $path = $svg?.querySelector('path')
  if (!$svg || !$path) return
  injectDefs()
  stylize()
  setSize('clamp(24px, 9.5vw, 128px)')
  setTheme('aurora')
  trigger()
})
</script>

<style scoped>
/* MOBILE-FIRST sizing + halo */
svg.bag-svg{
  width: var(--bag-size, clamp(24px, 9.5vw, 128px));
  height: var(--bag-size, clamp(24px, 9.5vw, 128px));
  display: block;
  pointer-events: none;
  transform-origin: 50% 50%;
  filter:
    drop-shadow(0 0 8px rgba(167,139,250,.25))
    drop-shadow(0 0 16px rgba(236,72,153,.20))
    drop-shadow(0 0 24px rgba(34,211,238,.18));
}

/* Container aura “breath” */
svg.bag-svg.is-on{
  animation: bagBreath 3.4s ease-in-out infinite;
}
@keyframes bagBreath{
  0%,100% { transform: scale(1) }
  50%     { transform: scale(1.05) }
}

/* Stroke-draw + shimmer ya ndani */
svg.bag-svg path{
  animation:
    bagDraw 1.5s cubic-bezier(.19,1,.22,1) forwards,
    bagInner 3.2s ease-in-out 1.5s infinite;
}
@keyframes bagDraw{
  0%   { stroke-dashoffset: 1200; opacity:.2 }
  60%  { stroke-dashoffset: 180;  opacity:.95 }
  100% { stroke-dashoffset: 0;    opacity:1 }
}
@keyframes bagInner{
  0%,100% { filter: url(#bagGlow); stroke-width: .6 }
  50%     { stroke-width: 1.1 }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  svg.bag-svg.is-on{ animation-duration: 1ms !important }
  svg.bag-svg path{ animation: bagDraw 1ms forwards !important }
}
</style>
