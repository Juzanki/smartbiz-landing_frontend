<!-- JoinRequestModal.vue -->
<template>
  <transition name="jr-fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jr-title"
      @keydown.esc.prevent="handleDecline('esc')"
      @click.self="handleDecline('backdrop')"
    >
      <!-- Sheet/Card -->
      <section
        ref="cardRef"
        class="w-full sm:w-[92%] max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl
               bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
               px-4 pt-3 pb-4 sm:p-5 select-none"
        :style="dragStyle"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <!-- Drag handle (mobile) -->
        <div class="sm:hidden mx-auto mb-2 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />

        <!-- Header -->
        <div class="flex items-center justify-between gap-2">
          <h3 id="jr-title" class="text-base sm:text-lg font-semibold">🙋‍♂️ Join Request</h3>

          <!-- LIVE / Trend -->
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                         bg-rose-600/10 text-rose-600 ring-1 ring-rose-600/30">
              <span class="relative flex h-2 w-2">
                <span class="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60"></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
              </span>
              LIVE
            </span>
            <span
              v-if="trending"
              class="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full
                     bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30"
              aria-label="Trending session"
            >🔥 Trending</span>
          </div>
        </div>

        <!-- Request summary -->
        <div class="mt-3 flex items-center gap-3">
          <img
            v-if="request?.avatar"
            :src="request.avatar"
            alt=""
            class="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-500/50"
          />
          <div v-else class="h-11 w-11 rounded-full grid place-items-center bg-indigo-100 text-indigo-600 font-bold ring-2 ring-indigo-500/50">
            {{ initials }}
          </div>

          <div class="min-w-0">
            <p class="text-sm">
              <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ request?.name }}</span>
              <span class="ml-1">wants to join your stream.</span>
            </p>
            <p
              v-if="trending"
              class="mt-0.5 text-[11px] text-pink-600 dark:text-pink-400 italic"
              :class="{'motion-safe:animate-pulse': !reducedMotion}"
            >💡 We suggest you accept — this session is 🔥 trending!</p>
          </div>
        </div>

        <!-- Countdown + conic ring -->
        <div class="mt-4 flex items-center justify-between">
          <p class="text-[12px] text-zinc-600 dark:text-zinc-400">
            Respond in <span class="font-semibold text-zinc-800 dark:text-zinc-100">{{ countdown }}</span>s
          </p>

          <button
            class="relative grid place-items-center h-10 w-10 rounded-full text-[11px] font-semibold bg-transparent"
            :aria-label="`Seconds left ${countdown}`"
            :style="ringStyle"
            @click="handleDecline('tap-ring')"
          >
            <span class="absolute inset-[3px] rounded-full bg-white dark:bg-zinc-900"></span>
            <span class="relative z-10">{{ countdown }}</span>
          </button>
        </div>

        <!-- Actions -->
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button
            ref="acceptBtnRef"
            @click="handleAccept()"
            class="col-span-2 sm:col-span-1 inline-flex items-center justify-center
                   rounded-full px-4 py-3 text-sm font-semibold
                   text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                   focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2
                   focus:ring-offset-white dark:focus:ring-offset-zinc-900"
            @touchstart.passive="startHoldAccept"
            @touchend.passive="endHoldAccept"
          >✅ Accept</button>

          <button
            @click="handleDecline('button')"
            class="col-span-2 sm:col-span-1 inline-flex items-center justify-center
                   rounded-full px-4 py-3 text-sm font-semibold
                   text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800
                   focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2
                   focus:ring-offset-white dark:focus:ring-offset-zinc-900"
          >❌ Decline</button>
        </div>

        <!-- Linear progress -->
        <div class="mt-4 h-1 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div class="h-full bg-indigo-500" :style="{ width: progressBarWidth }"></div>
        </div>

        <!-- SR-only -->
        <p class="sr-only" aria-live="polite">{{ srText }}</p>
      </section>

      <!-- Safe-area spacer (mobile bottom) -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  request: { type: Object, required: true }, // { name, avatar? }
  trending: { type: Boolean, default: false },
  seconds: { type: Number, default: 10 },    // countdown seconds
})

const emit = defineEmits(['respond', 'dismiss'])

/* State */
const visible = ref(true)
const countdown = ref(props.seconds)
let timer = null
let holdTimer = null

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

/* Haptics */
function buzz(ms=16){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Focus refs */
const acceptBtnRef = ref(null)
const cardRef = ref(null)

/* Text + initials */
const initials = computed(()=>{
  const n = props.request?.name?.trim() || ''
  return n ? n.split(/\s+/).map(p=>p[0]).join('').slice(0,2).toUpperCase() : 'G'
})

/* Progress (linear + ring) */
const progressBarWidth = computed(()=>{
  const used = Math.max(0, props.seconds - countdown.value)
  return `${Math.min(100, (used/props.seconds)*100)}%`
})
const ringStyle = computed(()=>{
  const pct = Math.min((countdown.value / props.seconds) * 100, 100)
  const deg = (pct/100) * 360
  return { background: `conic-gradient(#6366f1 ${deg}deg, rgba(99,102,241,0.18) 0deg)` }
})

/* Accessibility text */
const srText = computed(()=> `Join request from ${props.request?.name || 'guest'}. ${countdown.value} seconds remaining.`)

/* Actions */
function handleAccept(){
  stopTimer()
  visible.value = false
  if (!reducedMotion) buzz(24)
  emit('respond', { accepted: true, guest: props.request })
}
function handleDecline(reason='manual'){
  stopTimer()
  visible.value = false
  if (!reducedMotion) buzz(10)
  emit('respond', { accepted: false, guest: props.request, reason })
  emit('dismiss', { reason })
}

/* Long-press fast accept */
function startHoldAccept(){ holdTimer = setTimeout(handleAccept, 550) }
function endHoldAccept(){ clearTimeout(holdTimer); holdTimer=null }

/* Countdown */
function startTimer(){
  stopTimer()
  timer = setInterval(()=>{
    countdown.value -= 1
    if (countdown.value <= 0) {
      handleDecline('timeout')
    } else if (countdown.value <= 3 && !reducedMotion) {
      buzz(10)
    }
  }, 1000)
}
function stopTimer(){ if (timer) { clearInterval(timer); timer = null } }

/* Swipe-down to dismiss */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y = Math.max(0, dY.value)
  const op = Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity: op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) handleDecline('swipe'); dY.value=0 }

/* Visibility pause */
function onVisibility(){ if(document.hidden) stopTimer(); else if(visible.value && countdown.value>0) startTimer() }

/* Lifecycle */
onMounted(()=>{
  requestAnimationFrame(()=> acceptBtnRef.value?.focus?.())
  startTimer()
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(()=>{
  stopTimer()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
/* Fade + slight lift */
.jr-fade-enter-active, .jr-fade-leave-active { transition: opacity .22s ease, transform .22s ease; }
.jr-fade-enter-from, .jr-fade-leave-to { opacity: 0; transform: translateY(8px); }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .motion-safe\:animate-ping { animation: none !important; }
  .jr-fade-enter-active, .jr-fade-leave-active { transition-duration: .12s; }
}
</style>
