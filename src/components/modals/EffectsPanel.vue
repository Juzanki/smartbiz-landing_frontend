<!-- src/components/modals/EffectsStudioMobile.vue -->
<template>
  <!-- Overlay (imetengenezwa mobile-first). Ukitumia ndani ya overlay ya nje, weka :inline="true" -->
  <div
    v-if="isOpen"
    ref="overlay"
    class="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="fx-title" tabindex="-1"
    @click.self="inline ? undefined : close('backdrop')" @keydown="onKeydown"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-2xl max-h-[88vh]
             rounded-t-2xl sm:rounded-3xl overflow-hidden select-none
             text-white ring-1 ring-white/12 shadow-2xl animate-in will-change-transform
             bg-gradient-to-br from-[#0b1020]/95 via-[#111827]/95 to-[#1f2937]/90"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-white/20"></div>
      </div>

      <!-- Header -->
      <header class="px-4 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-white/10 bg-white/10">
        <div class="min-w-0">
          <h2 id="fx-title" class="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            ✨ Visual Effects
            <span v-if="activeIds.length" class="px-2 py-[2px] text-[11px] rounded-full bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30">
              {{ activeIds.length }} active
            </span>
          </h2>
          <p class="text-[11px] text-white/75">Tap = toggle • Long-press = ★ favorite</p>
        </div>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-pink-500"
          aria-label="Close" @click="close('x')">✕</button>
      </header>

      <!-- Toolbar -->
      <div class="px-4 sm:px-5 pb-3 grid grid-cols-2 gap-2 items-center">
        <div class="relative col-span-2">
          <input
            v-model="q"
            type="search" inputmode="search" placeholder="Search effects…"
            class="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 placeholder-white/70"
            aria-label="Search effects"
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/70">⌕</span>
        </div>

        <select v-model="category" class="rounded-xl bg-white/10 border border-white/20 px-2 py-2 text-xs">
          <option value="all">All</option>
          <option value="spark">Spark</option>
          <option value="love">Love</option>
          <option value="party">Party</option>
          <option value="cosmos">Cosmos</option>
          <option value="soft">Soft</option>
          <option value="grid">Grid</option>
          <option value="favorites">★ Favorites</option>
          <option value="recent">Recent</option>
        </select>

        <select v-model="blend" class="rounded-xl bg-white/10 border border-white/20 px-2 py-2 text-xs">
          <option value="normal">Blend: Normal</option>
          <option value="screen">Blend: Screen</option>
          <option value="lighten">Blend: Lighten</option>
          <option value="overlay">Blend: Overlay</option>
        </select>

        <label class="col-span-2 text-[12px] flex items-center justify-between gap-2">
          <span class="opacity-80">Intensity</span>
          <input type="range" min="1" max="5" v-model.number="intensity" class="accent-indigo-500 w-44"/>
        </label>

        <!-- Presets -->
        <div class="col-span-2 -mb-1 flex gap-2 overflow-x-auto no-scrollbar text-[11px]">
          <button v-for="p in presets" :key="p.key" class="chip" @click="applyPreset(p)">
            {{ p.label }}
          </button>
          <button class="chip" @click="savePreset()">Save preset</button>
        </div>
      </div>

      <!-- Preview -->
      <div class="px-4 sm:px-5 pb-3">
        <div class="relative h-28 sm:h-32 rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gradient-to-tr from-indigo-900/40 to-fuchsia-900/30">
          <div class="absolute inset-0 pointer-events-none">
            <div
              v-if="!reducedMotion"
              class="absolute -inset-10 animate-[pulse_2.2s_ease-in-out_infinite]
                     bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,.22),transparent_60%)]" />
          </div>
          <div class="absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded-full bg-black/50">
            Preview • Lv {{ intensity }} • {{ blend }}
          </div>
        </div>
      </div>

      <!-- Effects Grid -->
      <div class="px-4 sm:px-5 pb-5">
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <button
            v-for="ef in visibleEffects"
            :key="ef.id"
            class="group relative effect-btn active:scale-[.98] transition"
            :class="{ 'active-effect': activeIds.includes(ef.id) }"
            @click="toggle(ef.id)"
            @touchstart.passive="startHold(ef.id)"
            @touchend.passive="endHold"
          >
            <span class="text-2xl">{{ ef.icon }}</span>
            <span class="text-[12px] font-medium truncate">{{ ef.name }}</span>

            <span class="chip-left">{{ ef.cat }}</span>
            <span v-if="isFav(ef.id)" class="chip-right">★</span>
            <span v-else-if="isRecent(ef.id)" class="chip-right subtle">New</span>
          </button>
        </div>

        <!-- Actions -->
        <div class="mt-4 flex items-center justify-between gap-2">
          <button class="rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/20" @click="clearAll">Clear All</button>
          <div class="flex items-center gap-2">
            <button class="rounded-full px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700" @click="applyRandom">🎲 Random</button>
            <button class="rounded-full px-4 py-2 text-sm font-semibold bg-white/10 border border-white/20" @click="close('done')">Done</button>
          </div>
        </div>
      </div>

      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>

    <!-- Live CSS layers -->
    <div class="pointer-events-none absolute inset-0 z-40">
      <div
        v-for="id in activeIds"
        :key="id"
        class="effect-layer"
        :class="layerClass(id)"
        :style="layerStyle(id)"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/**
 * 🔧 Compatibility goals
 * - `v-model="selectedFilter"` (string)  ✅
 * - `v-model:effects="[]"` (multi)       ✅
 * - `:open` or outer v-if overlay        ✅
 * - `:inline="true"` to disable backdrop close (for parent overlay) ✅
 * - No runtime prop type mismatch warnings ✅ (typed via TS only)
 */

/* Emits */
const emit = defineEmits<{
  (e:'update:modelValue', v:string): void
  (e:'update:effects', v:string[]): void
  (e:'update:open', v:boolean): void
  (e:'close', payload:{reason:string}): void
}>()

/* Props (TS-only -> hakuna onyo la type failed) */
const props = withDefaults(defineProps<{
  /** Selected effect when using single-mode (e.g. 'sparkles' | 'none') */
  modelValue?: string | boolean
  /** Open/close control when using internal overlay */
  open?: boolean
  /** Multi-selection model */
  effects?: string[]
  /** Initial list (fallback) */
  initialEffects?: string[]
  /** Multi-select mode (default false -> single) */
  multi?: boolean
  /** If true, used inside parent overlay; backdrop click won't close */
  inline?: boolean
}>(), {
  modelValue: undefined,
  open: undefined,
  effects: undefined,
  initialEffects: () => [],
  multi: false,
  inline: false
})

/* Open state: if inline -> always true; else use :open or fallback true */
const inline = computed(() => !!props.inline)
const isOpen = computed({
  get(){
    if (inline.value) return true
    // if someone passed boolean modelValue historically, respect it
    if (typeof props.modelValue === 'boolean') return props.modelValue
    return props.open ?? true
  },
  set(v:boolean){
    if (inline.value) return
    emit('update:open', v)
    if (!v) emit('close', { reason:'program' })
  }
})

/* Build initial activeIds from either multi-model or single modelValue ('none' -> []) */
function normList(arr?: string[]){ return Array.from(new Set((arr ?? []).filter(Boolean))) }
function singleToList(v: unknown){
  return (typeof v === 'string' && v !== 'none') ? [v] : []
}
const activeIds = ref<string[]>(
  props.effects !== undefined ? normList(props.effects)
  : singleToList(props.modelValue)
)
watch(() => props.effects, v => { if (Array.isArray(v)) activeIds.value = normList(v) })
watch(() => props.modelValue, v => {
  if (typeof v === 'string' && !props.multi) activeIds.value = singleToList(v)
})

/* Sync back out */
function pushModels(){
  emit('update:effects', [...activeIds.value])
  if (!props.multi){
    const selected = activeIds.value[0] ?? 'none'
    emit('update:modelValue', selected)
  }
}

/* UI state */
const q = ref(''); const category = ref<'all'|'spark'|'love'|'party'|'cosmos'|'soft'|'grid'|'favorites'|'recent'>('all')
const intensity = ref(3); const blend = ref<'normal'|'screen'|'lighten'|'overlay'>('screen')
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

/* Favorites + recents + preset */
const favorites = ref(new Set<string>(JSON.parse(localStorage.getItem('fx_favs')||'[]')))
const recents   = ref<string[]>(JSON.parse(localStorage.getItem('fx_recent')||'[]'))
const customPreset = ref<{fx:string[],opts:{blend:string,intensity:number}}|null>(JSON.parse(localStorage.getItem('fx_preset')||'null'))

const presets = [
  { key:'calm',   label:'Calm',   fx:['glow','bokeh'],                   opts:{ blend:'screen',  intensity:2 } },
  { key:'party',  label:'Party',  fx:['neon','sparkles','stars'],        opts:{ blend:'overlay', intensity:4 } },
  { key:'love',   label:'Love',   fx:['hearts','glow','sparkles'],       opts:{ blend:'lighten', intensity:3 } },
  { key:'cosmic', label:'Cosmic', fx:['stars','glow'],                   opts:{ blend:'screen',  intensity:3 } },
  { key:'custom', label:'My Preset', fx:customPreset.value?.fx||[],      opts:customPreset.value?.opts||{ blend:'screen', intensity:3 } }
]
function savePreset(){
  customPreset.value = { fx:[...activeIds.value], opts:{ blend:blend.value, intensity:intensity.value } }
  localStorage.setItem('fx_preset', JSON.stringify(customPreset.value))
}
function applyPreset(p:any){
  if (p.key==='custom' && !customPreset.value) return
  activeIds.value = normList(p.fx)
  blend.value = p.opts.blend
  intensity.value = p.opts.intensity
  rememberMany(activeIds.value)
  buzz(16); pushModels()
}

/* Catalog */
const catalog = [
  { id:'sparkles', name:'Sparkles',   icon:'✨', cat:'spark'  },
  { id:'glow',     name:'Glow Aura',  icon:'💫', cat:'soft'   },
  { id:'hearts',   name:'Hearts',     icon:'❤️', cat:'love'   },
  { id:'stars',    name:'Starfall',   icon:'🌟', cat:'cosmos' },
  { id:'bokeh',    name:'Bokeh Blur', icon:'🔮', cat:'soft'   },
  { id:'neon',     name:'Neon Grid',  icon:'⚡', cat:'grid'   },
  { id:'confetti', name:'Confetti',   icon:'🎉', cat:'party'  },
]

/* Filters */
const filtered = computed(()=>{
  const s = q.value.trim().toLowerCase()
  let list = !s ? catalog : catalog.filter(e => e.name.toLowerCase().includes(s))
  if (category.value === 'favorites') list = list.filter(e=>favorites.value.has(e.id))
  else if (category.value === 'recent') list = list.filter(e=>recents.value.includes(e.id))
  else if (category.value !== 'all') list = list.filter(e=>e.cat === category.value)
  return list
})
const visibleEffects = computed(() => filtered.value)

/* Actions */
function toggle(id:string){
  if (props.multi){
    const i = activeIds.value.indexOf(id)
    if (i>-1) activeIds.value.splice(i,1)
    else { activeIds.value.push(id); rememberRecent(id) }
  } else {
    // single select
    activeIds.value = activeIds.value[0] === id ? [] : [id]
    if (activeIds.value.length) rememberRecent(id)
  }
  if (!reducedMotion) buzz(14)
  pushModels()
}
function clearAll(){ activeIds.value = []; pushModels(); buzz(10) }
function applyRandom(){
  const pool = visibleEffects.value.length ? visibleEffects.value : catalog
  const pick = pool[Math.floor(Math.random()*pool.length)]
  if (!pick) return
  if (props.multi){
    if (!activeIds.value.includes(pick.id)) toggle(pick.id)
  } else {
    activeIds.value = [pick.id]; pushModels(); buzz(14); rememberRecent(pick.id)
  }
}

/* Favorites (long-press) */
let holdTimer:number|undefined
function startHold(id:string){ clearTimeout(holdTimer); holdTimer=window.setTimeout(()=>toggleFav(id), 520) }
function endHold(){ clearTimeout(holdTimer) }
function toggleFav(id:string){
  if (favorites.value.has(id)) favorites.value.delete(id)
  else favorites.value.add(id)
  localStorage.setItem('fx_favs', JSON.stringify([...favorites.value]))
  if (!reducedMotion) buzz(12)
}
function isFav(id:string){ return favorites.value.has(id) }
function rememberRecent(id:string){
  const arr = recents.value.filter(x=>x!==id); arr.unshift(id)
  recents.value = arr.slice(0, 16)
  localStorage.setItem('fx_recent', JSON.stringify(recents.value))
}
function rememberMany(ids:string[]){ ids.forEach(rememberRecent) }
function isRecent(id:string){ return recents.value.includes(id) }

/* Layer styles */
function layerClass(id:string){
  return {
    sparkles:'sparkle-layer',
    glow:'glow-layer',
    hearts:'heart-layer',
    stars:'star-layer',
    bokeh:'bokeh-layer',
    neon:'neon-layer',
    confetti:'confetti-layer'
  }[id] || ''
}
function layerStyle(id:string){
  const lv = intensity.value
  const base:any = { mixBlendMode: blend.value as any }
  switch(id){
    case 'sparkles': return { ...base, opacity: 0.12 + lv*0.06 }
    case 'glow':     return { ...base, opacity: 0.08 + lv*0.05 }
    case 'hearts':   return { ...base, opacity: 0.12 + lv*0.06, animationDuration: `${3.6 - lv*0.4}s` }
    case 'stars':    return { ...base, opacity: 0.10 + lv*0.05 }
    case 'bokeh':    return { ...base, opacity: 0.10 + lv*0.05, animationDuration: `${7 - lv*0.6}s` }
    case 'neon':     return { ...base, opacity: 0.10 + lv*0.05, animationDuration: `${3.4 - lv*0.3}s` }
    case 'confetti': return { ...base, opacity: 0.10 + lv*0.05, animationDuration: `${3.2 - lv*0.25}s` }
    default:         return base
  }
}

/* Haptics */
function buzz(ms=12){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Close helpers */
function close(reason:string){ if (inline.value) { emit('close',{reason}); return } isOpen.value = false; emit('close',{reason}) }

/* Swipe-to-close + focus trap + body scroll lock */
const overlay = ref<HTMLElement|null>(null), sheet = ref<HTMLElement|null>(null)
const scrollTopOK = () => (sheet.value?.scrollTop ?? 0) < 2
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=> dragging.value ? ({
  transform:`translateY(${Math.max(0,dY.value)}px)`,
  opacity: Math.max(1 - Math.max(0,dY.value)/240, .5)
}) : ({}))

function onTouchStart(e:TouchEvent){ if(inline.value) return; if(e.touches?.length!==1 || !scrollTopOK()) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e:TouchEvent){ if(!dragging.value) return; dY.value = e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

function onKeydown(e:KeyboardEvent){
  if (e.key === 'Escape'){ e.preventDefault(); close('esc'); return }
  if (e.key !== 'Tab') return
  const nodes = overlay.value?.querySelectorAll?.('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
  if (!nodes?.length) return
  const list = Array.from(nodes).filter(el => (el as HTMLElement).offsetParent !== null) as HTMLElement[]
  const first = list[0], last = list[list.length-1]
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus() }
}

/* Scroll lock */
let lastActive:Element|null=null
watch(isOpen, async v => {
  if (inline.value) return
  if (v){
    await nextTick()
    lastActive = document.activeElement
    overlay.value?.focus?.()
    document.body.style.overflow='hidden'
  } else {
    document.body.style.overflow=''
    try{ (lastActive as HTMLElement|undefined)?.focus?.() }catch{}
  }
})
onMounted(()=>{ if(isOpen.value && !inline.value){ overlay.value?.focus?.(); document.body.style.overflow='hidden' } })
onBeforeUnmount(()=>{ if(!inline.value) document.body.style.overflow='' })
</script>

<style scoped>
/* Entrance */
@keyframes in { from{ opacity:0; transform: translateY(60px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .36s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Chips */
.chip{
  padding:.32rem .65rem; border-radius:9999px; white-space:nowrap;
  border:1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color:#fff;
}

/* Buttons */
.effect-btn{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:.35rem; padding:.75rem; border-radius:14px;
  background: linear-gradient(145deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.12); box-shadow:0 6px 16px rgba(0,0,0,.18); color:#c7d2fe;
}
.active-effect{
  background: linear-gradient(180deg, rgba(79,70,229,.9), rgba(99,102,241,.85));
  color:#fff; box-shadow:0 10px 24px rgba(79,70,229,.35);
}
.chip-left{
  position:absolute; top:.35rem; left:.35rem; font-size:10px; padding:.1rem .4rem; border-radius:9999px;
  background: rgba(0,0,0,.36);
}
.chip-right{ position:absolute; top:.35rem; right:.45rem; font-size:11px }
.chip-right.subtle{ font-size:10px; opacity:.8 }

/* Layers */
.effect-layer{ position:absolute; inset:0; pointer-events:none; z-index:1 }

/* Sparkles */
.sparkle-layer{
  background-image:
    radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,.8) 50%, transparent 52%),
    radial-gradient(2px 2px at 70% 60%, rgba(255,255,255,.7) 50%, transparent 52%),
    radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,.6) 50%, transparent 52%);
  background-repeat: no-repeat;
  animation: sparkleMove 2.6s linear infinite;
}
@keyframes sparkleMove{
  0%{ background-position: 0% 0%, 100% 0%, 50% 100% }
  100%{ background-position: 100% 100%, 0% 100%, 60% 0% }
}

/* Glow */
.glow-layer{
  background: radial-gradient(60% 45% at 50% 55%, rgba(255,255,255,.14), transparent 60%);
  animation: pulse 2.2s ease-in-out infinite;
}

/* Hearts */
.heart-layer::before{
  content:'💖'; position:absolute; left:50%; bottom:-24px; transform: translateX(-50%);
  font-size:3.8rem; filter: drop-shadow(0 0 6px rgba(255,255,255,.45));
  animation: floatUp 3.2s ease-in-out infinite;
}

/* Stars */
.star-layer{
  background-image:
    radial-gradient(1.2px 1.2px at 30% 20%, rgba(255,255,255,.84) 50%, transparent 52%),
    radial-gradient(1.2px 1.2px at 80% 70%, rgba(255,255,255,.84) 50%, transparent 52%),
    radial-gradient(1px 1px at 60% 40%, rgba(255,255,255,.7) 50%, transparent 52%);
  background-repeat:no-repeat; opacity:.28;
}

/* Bokeh */
.bokeh-layer{
  background:
    radial-gradient(60px 40px at 20% 70%, rgba(255,255,255,.12), transparent 60%),
    radial-gradient(70px 50px at 70% 30%, rgba(255,255,255,.10), transparent 60%);
  animation: bokehFade 6s infinite alternate;
}

/* Neon */
.neon-layer{
  background:
    repeating-linear-gradient(45deg, rgba(0,255,255,.18) 0 10px, rgba(255,0,255,.18) 10px 20px, transparent 20px 30px);
  mix-blend-mode: lighten;
  animation: glowPulse 3s ease-in-out infinite;
}

/* Confetti */
.confetti-layer{
  background:
    radial-gradient(3px 3px at 10% 90%, rgba(244,63,94,.8), transparent 60%),
    radial-gradient(3px 3px at 40% 20%, rgba(34,197,94,.8), transparent 60%),
    radial-gradient(3px 3px at 80% 60%, rgba(59,130,246,.8), transparent 60%);
  animation: confettiDrift 3.2s linear infinite;
}
@keyframes confettiDrift{
  0%{ transform: translateY(0) }
  100%{ transform: translateY(-12px) }
}

/* Misc animations */
@keyframes pulse{ 0%,100%{opacity:.22} 50%{opacity:.44} }
@keyframes glowPulse{ 0%,100%{ filter:brightness(1.08) } 50%{ filter:brightness(1.4) } }
@keyframes floatUp{ 0%{ transform: translate(-50%,0) scale(1); opacity:1 } 100%{ transform: translate(-50%,-100px) scale(1.08); opacity:0 } }
@keyframes bokehFade{ 0%{ opacity:.12 } 100%{ opacity:.42 } }

/* Scrollbar (sheet only) */
section::-webkit-scrollbar{ width:6px }
section::-webkit-scrollbar-thumb{ background: rgba(255,255,255,.18); border-radius:10px }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .sparkle-layer, .glow-layer, .heart-layer::before, .bokeh-layer, .neon-layer, .confetti-layer{ animation: none !important }
}
</style>
