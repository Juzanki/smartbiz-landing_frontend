<!-- src/components/modals/GoalModalMobile.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="goal-title"
    @click.self="close('backdrop')"
    @keydown.esc.prevent="close('esc')"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-md max-h-[86vh]
             rounded-t-2xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-4 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2">
        <div>
          <h2 id="goal-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            🎯 Lengo la Muda Halisi
          </h2>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Weka lengo kwa live yako sasa.</p>
        </div>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close"
          @click="close('x')"
        >✕</button>
      </header>

      <!-- Body -->
      <div class="px-4 sm:px-5 pb-4 space-y-4">
        <!-- Presets -->
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar text-[12px]">
          <span class="opacity-60">Presets:</span>
          <button v-for="p in presets" :key="p.label"
                  class="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  @click="applyPreset(p)">
            {{ p.label }}
          </button>
        </div>

        <!-- Text -->
        <div>
          <label class="text-sm font-medium block mb-1">Lengo</label>
          <input
            v-model.trim="goalText"
            type="text"
            maxlength="80"
            placeholder="Mfano: Fikia watazamaji 1,000"
            class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
            :class="{'shake ring-rose-400 dark:ring-rose-500': errors.text}"
            aria-invalid="true"
            aria-describedby="goal-text-hint"
          />
          <div id="goal-text-hint" class="mt-1 flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>{{ goalText.length }}/80</span>
            <span v-if="errors.text" class="text-rose-500">Weka angalau herufi 4</span>
          </div>
        </div>

        <!-- Type + Value -->
        <div class="grid grid-cols-3 gap-2 items-end">
          <div class="col-span-1">
            <label class="text-sm font-medium block mb-1">Aina</label>
            <select v-model="goalType"
                    class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm">
              <option value="views">Views 👀</option>
              <option value="coins">Coins 🪙</option>
              <option value="gifts">Gifts 🎁</option>
            </select>
          </div>

          <div class="col-span-2">
            <label class="text-sm font-medium block mb-1">Thamani</label>
            <div class="flex items-center gap-2">
              <button class="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" @click="step(-stepSize)">−</button>
              <input
                v-model.number="goalValue"
                :inputmode="goalType==='coins' ? 'numeric' : 'decimal'"
                type="number"
                min="1"
                class="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-center text-base outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
                :class="{'shake ring-rose-400 dark:ring-rose-500': errors.value}"
                placeholder="Mfano: 1000"
              />
              <button class="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" @click="step(stepSize)">＋</button>
            </div>
            <p class="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {{ helperText }}
              <span v-if="errors.value" class="text-rose-500 ml-1">Weka namba ≥ 1</span>
            </p>
          </div>
        </div>

        <!-- Timeframe -->
        <div>
          <label class="text-sm font-medium block mb-1">Muda</label>
          <div class="grid grid-cols-4 gap-2 text-[12px]">
            <button
              v-for="t in timeframes"
              :key="t.value"
              @click="timeframe=t.value"
              class="px-3 py-2 rounded-xl border"
              :class="timeframe===t.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'"
            >{{ t.label }}</button>
          </div>
        </div>

        <!-- Preview -->
        <div class="flex items-center justify-between gap-3">
          <div class="relative grid place-items-center h-16 w-16 rounded-full"
               :style="ringStyle"
               aria-label="Goal preview ring">
            <span class="absolute inset-[4px] rounded-full bg-white dark:bg-zinc-900"></span>
            <span class="relative z-10 text-xs font-semibold">{{ previewCenter }}</span>
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ goalText || '—' }}</p>
            <p class="text-[12px] text-zinc-500 dark:text-zinc-400">
              {{ badgeText }}
            </p>
          </div>

          <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800"
                  @click="resetForm">Reset</button>
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-4 sm:px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between gap-2">
        <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800"
                @click="close('cancel')">✖️ Funga</button>
        <button
          class="rounded-full px-4 py-2 text-xs font-semibold text-white
                 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canSave"
          @click="saveGoal"
        >✅ Hifadhi</button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

/** Props */
const props = defineProps({
  open: { type: Boolean, default: true },
  initial: {
    type: Object,
    default: () => ({ text:'', value:null, type:'views', timeframe:'session' })
  }
})

/** Emits */
const emit = defineEmits(['close','save'])

/** State */
const goalText = ref(props.initial.text || '')
const goalValue = ref(props.initial.value ?? 0)
const goalType  = ref(props.initial.type || 'views') // views | coins | gifts
const timeframe = ref(props.initial.timeframe || 'session') // session | 30m | 1h | custom
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

const errors = ref({ text:false, value:false })

/** Presets */
const presets = [
  { label: '👀 1,000 Views', text:'Fikia watazamaji 1,000', value:1000, type:'views' },
  { label: '🪙 5,000 Coins', text:'Kusanya 5,000 coins', value:5000, type:'coins' },
  { label: '🎁 50 Gifts',    text:'Pokea zawadi 50',      value:50,   type:'gifts' },
]

/** Timeframes */
const timeframes = [
  { value:'session', label:'Session' },
  { value:'30m',     label:'30 min' },
  { value:'1h',      label:'1 hr' },
  { value:'custom',  label:'Custom' },
]

/** Helpers */
const stepSize = computed(()=> goalType.value==='coins' ? 100 : 10)
function step(n){
  const next = Math.max(0, Number(goalValue.value || 0) + n)
  goalValue.value = next
}

/** Preview texts */
const icon = computed(()=>{
  return goalType.value==='coins' ? '🪙'
       : goalType.value==='gifts' ? '🎁'
       : '👀'
})
const badgeText = computed(()=>{
  const tf = { session:'Wakati wa live', '30m':'Ndani ya 30 min', '1h':'Ndani ya 1 saa', custom:'Muda maalum' }[timeframe.value]
  return `${icon.value} Target: ${formatNum(goalValue.value)} • ${tf}`
})
const previewCenter = computed(()=>{
  const v = Number(goalValue.value || 0)
  return v>9999 ? shortNum(v) : v || 0
})

/** Conic ring (decorative) */
const ringStyle = computed(()=>{
  const deg = 60 // preview only
  return { background: `conic-gradient(#6366f1 ${deg}deg, rgba(99,102,241,.18) 0deg)` }
})

/** Validation */
const canSave = computed(()=>{
  const okText = (goalText.value || '').trim().length >= 4
  const okVal  = Number(goalValue.value) >= 1
  return okText && okVal
})
function validate(){
  errors.value.text  = (goalText.value || '').trim().length < 4
  errors.value.value = !(Number(goalValue.value) >= 1)
  if (errors.value.text || errors.value.value) buzz(10)
}

/** Actions */
function applyPreset(p){
  goalText.value = p.text
  goalValue.value = p.value
  goalType.value  = p.type
  buzz(14)
}
function resetForm(){
  goalText.value=''; goalValue.value=0; goalType.value='views'; timeframe.value='session'
}
function saveGoal(){
  validate()
  if (!canSave.value) return
  if (!reducedMotion) buzz(18)
  const payload = {
    text: goalText.value.trim(),
    value: Number(goalValue.value),
    type: goalType.value,
    timeframe: timeframe.value,
    createdAt: Date.now()
  }
  // persist last goal for convenience
  try{ localStorage.setItem('rt_goal_last', JSON.stringify(payload)) }catch{}
  emit('save', payload)
  close('save')
}
function close(reason){ emit('close', { reason }) }

/** Haptics */
function buzz(ms=14){ try{ navigator?.vibrate?.(ms) }catch{} }

/** Load last goal (optional QoL) */
onMounted(()=>{
  try{
    const last = JSON.parse(localStorage.getItem('rt_goal_last')||'null')
    if (last && !props.initial?.text) {
      goalText.value = last.text
      goalValue.value = last.value
      goalType.value  = last.type
      timeframe.value = last.timeframe
    }
  }catch{}
})

/** Swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY-startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }
</script>

<style scoped>
/* Entrance */
@keyframes in { from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Shake for validation */
@keyframes shake {
  10%, 90% { transform: translateX(-1px) }
  20%, 80% { transform: translateX(2px) }
  30%, 50%, 70% { transform: translateX(-4px) }
  40%, 60% { transform: translateX(4px) }
}
.shake{ animation: shake .35s ease both }

/* Scrollbar */
.no-scrollbar::-webkit-scrollbar{ display:none }
</style>
