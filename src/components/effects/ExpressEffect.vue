<template>
  <transition name="express-fade">
    <div
      v-if="modelValue"
      class="express-wrap fixed inset-x-0 z-[9998] pointer-events-none"
      :class="posClass"
      :style="wrapStyle"
      role="status"
      aria-live="polite"
      @keydown.esc.prevent="hide()"
    >
      <!-- island + label container -->
      <div
        ref="card"
        class="pointer-events-auto mx-auto flex flex-col items-center select-none"
        :style="{ transform: `translateZ(0) ${tiltTransform}` }"
        @click="onTap"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <!-- Wings glow -->
        <span class="wings -z-10" :style="wingStyle"></span>

        <!-- Effect media -->
        <img
          :src="effectImage"
          alt=""
          class="island"
          :class="enterClass"
          :style="islandStyle"
          draggable="false"
        />

        <!-- Label pill -->
        <div class="label">
          🚄 {{ labelText }}
        </div>

        <!-- Progress bar -->
        <div class="bar-wrap" :aria-label="`Hiding in ${remainSec}s`">
          <div class="bar" :style="{ width: progress + '%'}"></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, defineProps, defineEmits, defineExpose } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: boolean
  effectImage?: string
  labelText?: string
  /** ms */
  duration?: number
  /** bottom|center|top */
  position?: 'bottom'|'center'|'top'
  /** y offset in px (e.g. to float over bottom bar) */
  offsetY?: number
  /** animation: fly|zoom|slide */
  enterAnim?: 'fly'|'zoom'|'slide'
  /** optional sound url */
  sound?: string
  /** base width (auto scales on small screens) */
  baseWidth?: number
}>(), {
  modelValue: true,
  effectImage: '/effects/express-island.png',
  labelText: 'SMARTBIZ EXPRESS ARRIVAL',
  duration: 5000,
  position: 'bottom',
  offsetY: 8,
  enterAnim: 'fly',
  sound: '',
  baseWidth: 360
})

const emit = defineEmits<{
  (e:'update:modelValue', v:boolean): void
  (e:'dismiss'): void
  (e:'shown'): void
}>()

/* visibility */
const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v; if (v) start() })
watch(visible, v => emit('update:modelValue', v))

/* sizing & layout */
const scale = computed(() => {
  const target = Math.min(window.innerWidth, 420)
  const w = props.baseWidth
  return Math.min(1, Math.max(0.75, target / (w + 40)))
})
const wrapStyle = computed(() => ({
  paddingBottom: props.position === 'bottom' ? 'max(8px, env(safe-area-inset-bottom))' : '0'
}))
const posClass = computed(() => ({
  'bottom-pos': props.position === 'bottom',
  'center-pos': props.position === 'center',
  'top-pos': props.position === 'top'
}))
const enterClass = computed(() => ({
  'animate-fly-in-up': props.enterAnim === 'fly',
  'animate-zoom-pop': props.enterAnim === 'zoom',
  'animate-slide-up': props.enterAnim === 'slide'
}))
const islandStyle = computed(() => ({
  width: `${Math.round(props.baseWidth * scale.value)}px`
}))
const wingStyle = computed(() => ({
  width: `min(96vw, ${Math.round(props.baseWidth * 1.6)}px)`,
  height: `min(42vw, 260px)`,
  background: 'radial-gradient(60% 60% at 50% 50%, rgba(59,130,246,.28), rgba(236,72,153,.18) 60%, rgba(255,255,255,.08))'
}))

/* progress timing */
const progress = ref(0)
const endAt = ref(0)
const remainSec = computed(() => Math.max(0, Math.ceil((endAt.value - performance.now())/1000)))
let raf = 0
function tick() {
  const now = performance.now()
  const total = props.duration
  progress.value = Math.min(100, Math.max(0, 100 - ((endAt.value - now)/total)*100))
  if (now < endAt.value) {
    raf = requestAnimationFrame(tick)
  } else {
    hide()
  }
}

/* gestures: swipe-to-dismiss */
let startY = 0, deltaY = 0, swiping = false
const card = ref<HTMLElement|null>(null)
function onTouchStart(e: TouchEvent){
  swiping = true
  startY = e.touches[0].clientY
  deltaY = 0
}
function onTouchMove(e: TouchEvent){
  if (!swiping || !card.value) return
  deltaY = e.touches[0].clientY - startY
  // allow only downward swipe for bottom/center; upward for top
  const dir = props.position === 'top' ? -1 : 1
  const applied = Math.max(0, dir * deltaY)
  card.value.style.transform = `translateZ(0) translateY(${applied}px) ${tiltTransform}`
  card.value.style.opacity = String(Math.max(.5, 1 - applied/220))
}
function onTouchEnd(){
  if (!card.value) return
  const threshold = 120
  const dir = props.position === 'top' ? -1 : 1
  const applied = Math.max(0, dir * deltaY)
  if (applied > threshold) {
    hide()
  } else {
    // reset
    card.value.style.transform = `translateZ(0) ${tiltTransform}`
    card.value.style.opacity = '1'
  }
  swiping = false
}

/* parallax tilt on move (subtle, mobile-safe) */
const tiltTransform = ref('')
function onMove(e: MouseEvent){
  if (!card.value) return
  const rect = card.value.getBoundingClientRect()
  const x = (e.clientX - (rect.left + rect.width/2)) / rect.width
  const y = (e.clientY - (rect.top + rect.height/2)) / rect.height
  const rx = (-y * 4).toFixed(2)
  const ry = (x * 6).toFixed(2)
  tiltTransform.value = `rotateX(${rx}deg) rotateY(${ry}deg)`
}
function onTap(){
  vibrate(10)
  if (props.sound) playSound(props.sound, 0.75)
  // tapping again dismisses quickly
  quickDismiss()
}

/* lifecycle helpers */
function start(){
  // reset transforms
  if (card.value){
    card.value.style.transform = `translateZ(0) ${tiltTransform.value}`
    card.value.style.opacity = '1'
  }
  endAt.value = performance.now() + props.duration
  progress.value = 0
  cancelAnimationFrame(raf); raf = requestAnimationFrame(tick)
  if (props.sound) playSound(props.sound, 0.9)
  emit('shown')
}
function hide(){
  if (!visible.value) return
  visible.value = false
  emit('dismiss')
  cancelAnimationFrame(raf)
}
function quickDismiss(){
  // fast-forward progress & end time
  endAt.value = performance.now() + 300
}

/* public API to trigger */
function show(){
  visible.value = true
  start()
}
defineExpose({ show, hide })

/* sync v-model and events */
watch(visible, v => emit('update:modelValue', v))

/* boot */
onMounted(() => {
  if (visible.value) start()
  window.addEventListener('mousemove', onMove, { passive: true })
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('mousemove', onMove)
})

/* utils */
function vibrate(ms=10){ try{ navigator.vibrate?.(ms) } catch {} }
function playSound(src: string, vol=1){
  try{ const a = new Audio(src); a.volume = vol; a.play().catch(()=>{}) }catch{}
}
</script>

<style scoped>
/* positions */
.bottom-pos { bottom: v-bind(offsetY + 'px'); }
.center-pos { top: 50%; transform: translateY(-50%); }
.top-pos    { top: v-bind((offsetY + 8) + 'px'); }

/* wrapper */
.express-wrap{ display:flex; align-items:flex-end; }

/* island */
.island{
  will-change: transform, opacity, filter;
  filter: drop-shadow(0 14px 36px rgba(0,0,0,.35));
  user-select: none;
}

/* wings glow */
.wings{
  position:absolute; inset:auto; left:50%; transform: translateX(-50%);
  border-radius: 48px;
  filter: blur(26px);
  pointer-events: none;
}

/* label pill */
.label{
  margin-top: .5rem;
  color: #fff;
  font-weight: 800;
  font-size: .95rem;
  line-height: 1;
  padding: .5rem .9rem;
  border-radius: 9999px;
  background: rgba(0,0,0,.6);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 22px rgba(0,0,0,.35);
}

/* progress */
.bar-wrap{
  width: 76%;
  height: 6px;
  margin-top: .6rem;
  border-radius: 9999px;
  background: rgba(255,255,255,.16);
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.12);
}
.bar{
  height: 100%;
  background: linear-gradient(90deg, #22d3ee, #a78bfa, #f472b6);
  box-shadow: 0 2px 10px rgba(34,211,238,.45);
  transition: width .18s linear;
}

/* Animations */
@keyframes flyInUp {
  0% { opacity: 0; transform: translateY(100px) scale(.9); filter: blur(4px); }
  60%{ opacity: 1; transform: translateY(-10px) scale(1.05); filter: blur(1px); }
  100%{ transform: translateY(0) scale(1); filter: blur(0); }
}
.animate-fly-in-up{ animation: flyInUp 800ms ease-out both; }

@keyframes zoomPop {
  0% { opacity:0; transform: scale(.6); filter: blur(3px) }
  70%{ opacity:1; transform: scale(1.08); filter: none }
  100%{ transform: scale(1) }
}
.animate-zoom-pop{ animation: zoomPop 700ms cubic-bezier(.2,.8,.2,1) both; }

@keyframes slideUp {
  0% { opacity:0; transform: translateY(60px); }
  100%{ opacity:1; transform: translateY(0); }
}
.animate-slide-up{ animation: slideUp 420ms ease-out both; }

/* Transition wrapper */
.express-fade-enter-active,.express-fade-leave-active{ transition: opacity .35s ease; }
.express-fade-enter-from,.express-fade-leave-to{ opacity: 0; }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .animate-fly-in-up,
  .animate-zoom-pop,
  .animate-slide-up { animation-duration: 1ms !important; }
}
</style>
