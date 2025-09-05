<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    fill="currentColor"
  >
    <path
      d="M15 4a1 1 0 1 0 0 2V4zm0 11v-1a1 1 0 0 0-1 1h1zm0 4l-.707.707A1 1 0 0 0 16 19h-1zm-4-4l.707-.707A1 1 0 0 0 11 14v1zm-4.707-1.293a1 1 0 0 0-1.414 1.414l1.414-1.414zm-.707.707l-.707-.707.707.707zM9 11v-1a1 1 0 0 0-.707.293L9 11zm-4 0h1a1 1 0 0 0-1-1v1zm0 4H4a1 1 0 0 0 1.707.707L5 15zm10-9h2V4h-2v2zm2 0a1 1 0 0 1 1 1h2a3 3 0 0 0-3-3v2zm1 1v6h2V7h-2zm0 6a1 1 0 0 1-1 1v2a3 3 0 0 0 3-3h-2zm-1 1h-2v2h2v-2zm-3 1v4h2v-4h-2zm1.707 3.293l-4-4-1.414 1.414 4 4 1.414-1.414zM11 14H7v2h4v-2zm-4 0c-.276 0-.525-.111-.707-.293l-1.414 1.414C5.42 15.663 6.172 16 7 16v-2zm-.707 1.121l3.414-3.414-1.414-1.414-3.414 3.414 1.414 1.414zM9 12h4v-2H9v2zm4 0a3 3 0 0 0 3-3h-2a1 1 0 0 1-1 1v2zm3-3V3h-2v6h2zm0-6a3 3 0 0 0-3-3v2a1 1 0 0 1 1 1h2zm-3-3H3v2h10V0zM3 0a3 3 0 0 0-3 3h2a1 1 0 0 1 1-1V0zM0 3v6h2V3H0zm0 6a3 3 0 0 0 3 3v-2a1 1 0 0 1-1-1H0zm3 3h2v-2H3v2zm1-1v4h2v-4H4zm1.707 4.707l.586-.586-1.414-1.414-.586.586 1.414 1.414z"
    />
  </svg>
</template>

<script setup>
import { onMounted, defineExpose } from 'vue'

/**
 * Tunachomeka <defs> (gradients + filters) ndani ya SVG kwa runtime
 * bila kubadilisha template. Pia tunabadilisha path iwe stroke-drawn
 * kwa hisia ya “ulimwengu wa roho”.
 */
let $svg, $path

function injectDefs() {
  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs')

  // Linear gradient ya “spirit trail”
  const grad = document.createElementNS(defs.namespaceURI,'linearGradient')
  grad.setAttribute('id','spiritGrad')
  grad.setAttribute('x1','0%'); grad.setAttribute('y1','0%')
  grad.setAttribute('x2','100%'); grad.setAttribute('y2','100%')
  const stop1 = document.createElementNS(defs.namespaceURI,'stop')
  stop1.setAttribute('offset','0%'); stop1.setAttribute('stop-color','rgba(168,85,247,1)') // purple-500
  const stop2 = document.createElementNS(defs.namespaceURI,'stop')
  stop2.setAttribute('offset','50%'); stop2.setAttribute('stop-color','rgba(236,72,153,1)') // pink-500
  const stop3 = document.createElementNS(defs.namespaceURI,'stop')
  stop3.setAttribute('offset','100%'); stop3.setAttribute('stop-color','rgba(56,189,248,1)') // cyan-400
  grad.append(stop1, stop2, stop3)

  // Filter ya aura (glow ya ether)
  const filter = document.createElementNS(defs.namespaceURI,'filter')
  filter.setAttribute('id','spiritGlow')
  filter.setAttribute('x','-50%'); filter.setAttribute('y','-50%')
  filter.setAttribute('width','200%'); filter.setAttribute('height','200%')

  const feBlur = document.createElementNS(defs.namespaceURI,'feGaussianBlur')
  feBlur.setAttribute('stdDeviation','2.2'); feBlur.setAttribute('result','blur')

  const feCM = document.createElementNS(defs.namespaceURI,'feColorMatrix')
  feCM.setAttribute('type','matrix')
  feCM.setAttribute('values',`
    1 0 0 0 0
    0 1 0 0 0
    0 0 1 0 0
    0 0 0 18 -8
  `)
  feCM.setAttribute('in','blur'); feCM.setAttribute('result','glow')

  const feMerge = document.createElementNS(defs.namespaceURI,'feMerge')
  const feN1 = document.createElementNS(defs.namespaceURI,'feMergeNode')
  feN1.setAttribute('in','glow')
  const feN2 = document.createElementNS(defs.namespaceURI,'feMergeNode')
  feN2.setAttribute('in','SourceGraphic')
  feMerge.append(feN1, feN2)

  filter.append(feBlur, feCM, feMerge)

  defs.append(grad, filter)
  $svg.prepend(defs)
}

function spiritualize() {
  // Badili view kwa mobile-first
  $svg.removeAttribute('width')
  $svg.removeAttribute('height')
  // Stroke-draw aesthetic
  $path.setAttribute('fill','none')
  $path.setAttribute('stroke','url(#spiritGrad)')
  $path.setAttribute('stroke-width','1.8')
  $path.setAttribute('stroke-linecap','round')
  $path.setAttribute('stroke-linejoin','round')
  $path.setAttribute('filter','url(#spiritGlow)')
  // dasharray/dashoffset kwa effect ya kuchorwa
  const len = 1200 // ndefu kwa kioo kizuri
  $path.setAttribute('stroke-dasharray', String(len))
  $path.setAttribute('stroke-dashoffset', String(len))
  // weka class ya animation kwa CSS
  $svg.classList.add('spirit-svg')
}

function trigger() {
  // restart stroke-draw
  $path.style.animation = 'none'
  void $path.getBoundingClientRect() // reflow
  $path.style.animation = ''
  // restart aura spin
  $svg.classList.remove('is-on')
  void $svg.getBoundingClientRect()
  $svg.classList.add('is-on')
  try{ navigator.vibrate?.(8) }catch{}
}

function setTheme(theme='aurora'){
  // Badilisha rangi za gradient
  const stops = $svg.querySelectorAll('#spiritGrad stop')
  const palettes = {
    aurora: ['#a855f7','#ec4899','#38bdf8'],
    spirit: ['#22d3ee','#a78bfa','#f472b6'],
    tanzania: ['#1EB53A','#FCD116','#00A3DD'],
    solar: ['#fde047','#fb923c','#f43f5e']
  }
  const p = palettes[theme] || palettes.aurora
  stops[0].setAttribute('stop-color', p[0])
  stops[1].setAttribute('stop-color', p[1])
  stops[2].setAttribute('stop-color', p[2])
  trigger()
}

function setSize(px = 64){
  // mobile-first via CSS var; CSS itatumia clamp pia
  $svg.style.setProperty('--spirit-size', typeof px === 'number' ? `${px}px` : px)
}

defineExpose({ trigger, setTheme, setSize })

onMounted(() => {
  $svg = document.querySelector('svg')
  $path = $svg?.querySelector('path')
  if (!$svg || !$path) return
  injectDefs()
  spiritualize()
  // fire once
  setTheme('aurora')
  setSize('clamp(24px, 10vw, 120px)')
  trigger()
})
</script>

<style scoped>
/* MOBILE-FIRST: responsive via clamp + vw */
svg.spirit-svg{
  width: var(--spirit-size, clamp(24px, 10vw, 120px));
  height: var(--spirit-size, clamp(24px, 10vw, 120px));
  display: block;
  pointer-events: none;
  /* ethereal spin container */
  transform-origin: 50% 50%;
  filter: drop-shadow(0 0 10px rgba(255,255,255,.08));
}

/* Aura spin + parallax pulse */
svg.spirit-svg.is-on{
  animation: auraSpin 6.5s linear infinite;
}
@keyframes auraSpin{
  0%   { transform: rotate(0deg) scale(1) }
  50%  { transform: rotate(180deg) scale(1.04) }
  100% { transform: rotate(360deg) scale(1) }
}

/* Stroke-draw “from the unseen” */
svg.spirit-svg path{
  animation: spiritDraw 1.8s cubic-bezier(.19,1,.22,1) forwards, spiritBreathe 3.8s ease-in-out 1.8s infinite;
}
@keyframes spiritDraw{
  0%   { stroke-dashoffset: 1200; opacity: .2 }
  60%  { stroke-dashoffset: 180;  opacity: .95 }
  100% { stroke-dashoffset: 0;    opacity: 1 }
}
@keyframes spiritBreathe{
  0%,100%{ filter: url(#spiritGlow); stroke-width: 1.8 }
  50%    { stroke-width: 2.2 }
}

/* Halo layer around svg using drop-shadows (cheap, GPU) */
svg.spirit-svg{
  filter:
    drop-shadow(0 0 8px rgba(168,85,247,.35))
    drop-shadow(0 0 16px rgba(236,72,153,.25))
    drop-shadow(0 0 26px rgba(56,189,248,.2));
}

/* Reduced motion: punguza kila kitu */
@media (prefers-reduced-motion: reduce){
  svg.spirit-svg.is-on{ animation-duration: 1ms !important }
  svg.spirit-svg path{ animation: spiritDraw 1ms forwards !important }
}
</style>
