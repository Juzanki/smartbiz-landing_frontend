<!-- EndStreamSheet.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="end-title"
    @click.self="onCancel('backdrop')"
    @keydown.esc.prevent="onCancel('esc')"
  >
    <!-- Bottom sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-md max-h-[86vh]
             rounded-t-2xl sm:rounded-2xl overflow-hidden
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- drag handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- header -->
      <header class="px-4 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2">
        <h2 id="end-title" class="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          🛑 End Stream?
        </h2>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close"
          @click="onCancel('x')"
        >✕</button>
      </header>

      <!-- body -->
      <div class="px-4 sm:px-5 pb-4 space-y-4">
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Are you sure you want to end your live stream?
        </p>

        <!-- optional safety countdown -->
        <div v-if="countdownOn" class="flex items-center justify-between text-[12px]">
          <span class="text-zinc-500 dark:text-zinc-400">Safety countdown</span>
          <button
            class="relative grid place-items-center h-9 w-9 rounded-full text-[11px] font-semibold"
            :style="ringStyle"
            :aria-label="`Seconds left ${timeLeft}`"
          >
            <span class="absolute inset-[3px] rounded-full bg-white dark:bg-zinc-900"></span>
            <span class="relative z-10">{{ timeLeft }}</span>
          </button>
        </div>

        <!-- save VOD toggle -->
        <label class="flex items-center justify-between text-[13px]">
          <span>Save a replay (VOD)</span>
          <input type="checkbox" v-model="saveReplay" class="accent-rose-600">
        </label>

        <!-- extra safety mode -->
        <div v-if="extraSafety==='type'" class="space-y-2">
          <label class="text-[12px] text-zinc-500 dark:text-zinc-400">Type <b>END</b> to confirm</label>
          <input
            v-model.trim="confirmText"
            placeholder="Type END"
            class="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none
                   focus:ring-2 ring-rose-400 dark:ring-rose-500"
            autocomplete="off"
          />
        </div>

        <div v-else-if="extraSafety==='hold'" class="text-[12px] text-zinc-500 dark:text-zinc-400">
          Press and hold <b>End Stream</b> to confirm.
        </div>
      </div>

      <!-- actions -->
      <div class="px-4 sm:px-5 pb-4 grid grid-cols-2 gap-3">
        <button
          class="col-span-2 sm:col-span-1 rounded-full px-4 py-3 text-sm font-semibold
                 bg-zinc-200 dark:bg-zinc-800"
          @click="onCancel('button')"
        >Cancel</button>

        <button
          class="col-span-2 sm:col-span-1 rounded-full px-4 py-3 text-sm font-semibold text-white
                 disabled:opacity-60 disabled:cursor-not-allowed
                 bg-rose-600 hover:bg-rose-700 active:bg-rose-800
                 focus:outline-none focus:ring-2 focus:ring-rose-400"
          :disabled="!canConfirm"
          @click="confirmNow"
          @touchstart.passive="startHold"
          @touchend.passive="endHold"
        >
          End Stream
        </button>
      </div>

      <!-- safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/**
 * Props
 * - open: show/hide sheet
 * - seconds: safety countdown seconds (0 to disable)
 * - extraSafety: 'none' | 'hold' | 'type'  (default 'hold')
 * - defaultSave: boolean (default true)
 */
const props = defineProps({
  open: { type: Boolean, default: true },
  seconds: { type: Number, default: 5 },
  extraSafety: { type: String, default: 'hold' },
  defaultSave: { type: Boolean, default: true },
})

const emit = defineEmits(['confirm','cancel','close','save-change'])

/* ------- state ------- */
const saveReplay = ref(props.defaultSave)
watch(saveReplay, v => emit('save-change', v))

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

// countdown
const countdownOn = computed(() => props.seconds > 0)
const timeLeft = ref(props.seconds)
let timer = null

function startTimer(){
  if (!countdownOn.value) return
  stopTimer()
  timeLeft.value = props.seconds
  timer = setInterval(()=>{
    timeLeft.value -= 1
    if (timeLeft.value <= 0) stopTimer()
    else if (timeLeft.value <= 2 && !reducedMotion) buzz(8)
  }, 1000)
}
function stopTimer(){ if (timer) { clearInterval(timer); timer = null } }

// ring style
const ringStyle = computed(()=>{
  if (!countdownOn.value) return {}
  const pct = Math.max(0, Math.min(1, timeLeft.value/props.seconds))
  const deg = pct * 360
  return { background: `conic-gradient(#f43f5e ${deg}deg, rgba(244,63,94,.2) 0deg)` }
})

/* ------- confirm logic ------- */
const confirmText = ref('')
let holdTimer = null

const canConfirm = computed(()=>{
  if (countdownOn.value && timeLeft.value > 0) return false
  if (props.extraSafety === 'type') return confirmText.value === 'END'
  return true // none or hold (hold handled in UI but click still allowed after hold finished)
})

function confirmNow(){
  if (!canConfirm.value) return
  if (!reducedMotion) buzz(18)
  emit('confirm', { saveReplay: saveReplay.value })
  emit('close', { reason: 'confirm' })
}

function onCancel(reason){
  if (!reducedMotion) buzz(10)
  emit('cancel', { reason })
  emit('close', { reason })
}

/* long-press safety */
function startHold(){
  if (props.extraSafety !== 'hold' || !canConfirm.value) return
  holdTimer = setTimeout(()=> confirmNow(), 650)
}
function endHold(){ clearTimeout(holdTimer); holdTimer = null }

/* haptics */
function buzz(ms=14){ try{ navigator?.vibrate?.(ms) }catch{} }

/* visibility pause */
function onVisibility(){ if (document.hidden) stopTimer(); else startTimer() }

/* sheet swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1-y/240,.5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY-startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) onCancel('swipe'); dY.value=0 }

/* lifecycle */
onMounted(()=>{ startTimer(); document.addEventListener('visibilitychange', onVisibility) })
onBeforeUnmount(()=>{ stopTimer(); document.removeEventListener('visibilitychange', onVisibility) })
</script>

<style scoped>
/* Smooth scrollbars if content grows later */
section ::-webkit-scrollbar{ width:6px }
section ::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.25); border-radius:10px }

/* Reduced motion tweaks */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
