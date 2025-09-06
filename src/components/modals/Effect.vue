<!-- src/components/modals/Effect.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="effects-title"
    @click.self="close('backdrop')"
    @keydown.esc.prevent="close('esc')"
  >
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-2xl max-h-[86vh]
             rounded-t-2xl sm:rounded-3xl overflow-hidden
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-4 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h2 id="effects-title" class="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            ✨ Live Effects
            <span v-if="activeEffect" class="text-[11px] px-2 py-0.5 rounded-full bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600/20">
              Active: {{ activeLabel }}
            </span>
          </h2>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Tap to apply • Long-press to ★ favorite</p>
        </div>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close"
          @click="close('x')"
        >✕</button>
      </header>

      <!-- Toolbar -->
      <div class="px-4 pb-3 sm:px-5 sm:pb-0 space-y-2">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="query"
              type="search"
              inputmode="search"
              placeholder="Search effects…"
              class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
              aria-label="Search effects"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">⌕</span>
          </div>

          <select
            v-model="category"
            class="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-2 py-2 text-xs"
            aria-label="Category"
            title="Filter by category"
          >
            <option value="all">All</option>
            <option value="spark">Spark</option>
            <option value="love">Love</option>
            <option value="party">Party</option>
            <option value="cosmos">Cosmos</option>
            <option value="soft">Soft</option>
            <option value="custom">Custom</option>
            <option value="favorites">★ Favorites</option>
            <option value="recent">Recent</option>
          </select>
        </div>

        <!-- Intensity + Sound -->
        <div class="flex items-center justify-between gap-3">
          <label class="text-[12px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            Intensity
            <input type="range" min="1" max="5" v-model.number="intensity" class="accent-indigo-600 w-36"/>
          </label>
          <label class="text-[12px] flex items-center gap-2">
            <input type="checkbox" v-model="soundOn" class="accent-indigo-600">
            Sound
          </label>
        </div>
      </div>

      <!-- Preview -->
      <div class="px-4 sm:px-5 pb-3">
        <div class="relative h-28 sm:h-32 rounded-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10
                    bg-gradient-to-tr from-indigo-50 to-fuchsia-50 dark:from-zinc-800 dark:to-zinc-700">
          <img
            v-if="previewIcon"
            :src="previewIcon"
            alt=""
            class="absolute inset-0 m-auto h-16 w-16 object-contain opacity-90"
          />
          <!-- sparkle pulse: tuna-render tu kama reducedMotion=false -->
          <div class="absolute inset-0 pointer-events-none">
            <div
              v-if="!reducedMotion"
              class="absolute -inset-6 animate-[pulse_2.4s_ease-in-out_infinite] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,.18),transparent_60%)]">
            </div>
          </div>
          <div class="absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded-full bg-black/50 text-white">
            Preview • Level {{ intensity }}
          </div>
        </div>
      </div>

      <!-- Grid -->
      <div class="px-4 sm:px-5 pb-5">
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <button
            v-for="ef in visibleEffects" :key="ef.id"
            class="group relative bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 pt-2 text-center shadow hover:shadow-md
                   ring-1 ring-black/10 dark:ring-white/10 transition active:scale-[.98]"
            :class="{ 'ring-2 ring-indigo-500': activeEffect === ef.id }"
            @click="apply(ef)"
            @touchstart.passive="startHold(ef)"
            @touchend.passive="endHold"
          >
            <img :src="ef.icon" class="w-14 h-14 mx-auto rounded-md object-cover" alt="" />
            <div class="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate">{{ ef.name }}</div>

            <span class="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-white">
              {{ ef.cat }}
            </span>

            <span v-if="isFav(ef.id)" class="absolute top-2 right-2">★</span>
          </button>
        </div>

        <!-- Actions -->
        <div class="mt-4 flex items-center justify-between gap-2">
          <button class="rounded-full px-4 py-2 text-sm font-semibold bg-zinc-200 dark:bg-zinc-800" @click="clearEffect">Clear</button>
          <div class="flex items-center gap-2">
            <button class="rounded-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700" @click="applyRandom">🎲 Random</button>
            <button class="rounded-full px-4 py-2 text-sm font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" @click="close('done')">Done</button>
          </div>
        </div>
      </div>

      <!-- Safe area -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

/* Emits */
const emit = defineEmits(['close','set-effect','preview'])

/* Props */
const props = defineProps({
  open: { type: Boolean, default: true },
  effects: {
    type: Array,
    default: () => ([
      { id:'sparkle',   name:'Sparkle Glow',    icon:'/effects/sparkle.png',   cat:'spark'  },
      { id:'hearts',    name:'Flying Hearts',   icon:'/effects/hearts.png',    cat:'love'   },
      { id:'fireworks', name:'Fireworks',       icon:'/effects/fireworks.png', cat:'party'  },
      { id:'bubbles',   name:'Floating Bubbles',icon:'/effects/bubbles.png',   cat:'soft'   },
      { id:'neon',      name:'Neon Glow',       icon:'/effects/neon.png',      cat:'party'  },
      { id:'stars',     name:'Falling Stars',   icon:'/effects/stars.png',     cat:'cosmos' },
      { id:'emojiRain', name:'Emoji Rain',      icon:'/effects/emoji.png',     cat:'party'  },
    ])
  }
})

/* State */
const open = computed(()=> props.open)
const activeEffect = ref(null)
const intensity = ref(3)
const soundOn = ref(false)
const query = ref('')
const category = ref('all')

/* LS helpers */
function getLS(k, fallback){ try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fallback }catch{ return fallback } }
function setLS(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch{} }

const favorites = ref(new Set(getLS('fx_favs', [])))
const recents   = ref(getLS('fx_recent', []))
const reducedMotion = (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) || false

/* Derived */
const list = computed(()=> props.effects || [])
const activeLabel = computed(()=> list.value.find(e=>e.id===activeEffect.value)?.name || 'None')
const previewIcon = computed(()=> list.value.find(e=>e.id===activeEffect.value)?.icon || null)

/* Filters */
const filteredByQuery = computed(()=>{
  const q = query.value.trim().toLowerCase()
  return q ? list.value.filter(e => e.name.toLowerCase().includes(q)) : list.value
})
const filteredByCat = computed(()=>{
  if (category.value==='favorites') return filteredByQuery.value.filter(e=>favorites.value.has(e.id))
  if (category.value==='recent')    return filteredByQuery.value.filter(e=>recents.value.includes(e.id))
  if (category.value==='all')       return filteredByQuery.value
  return filteredByQuery.value.filter(e=>e.cat===category.value)
})
const visibleEffects = computed(()=> filteredByCat.value)

/* Haptics */
function buzz(ms=14){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Actions */
function apply(ef){
  activeEffect.value = ef.id
  rememberRecent(ef.id)
  if (!reducedMotion) buzz(18)
  emit('set-effect', { id: ef.id, intensity: intensity.value, sound: soundOn.value })
  emit('preview', ef.id)
}
function clearEffect(){ activeEffect.value = null; emit('set-effect', null); if (!reducedMotion) buzz(10) }
function applyRandom(){
  const pool = visibleEffects.value.length ? visibleEffects.value : list.value
  const pick = pool[Math.floor(Math.random()*pool.length)]
  if (pick) apply(pick)
}

/* Favorites (long-press) */
let holdTimer = null
function startHold(ef){ holdTimer = setTimeout(()=>toggleFav(ef.id), 550) }
function endHold(){ if (holdTimer){ clearTimeout(holdTimer); holdTimer=null } }
function toggleFav(id){
  if (favorites.value.has(id)) favorites.value.delete(id); else favorites.value.add(id)
  setLS('fx_favs', [...favorites.value])
  if (!reducedMotion) buzz(16)
}
function isFav(id){ return favorites.value.has(id) }

/* Recents */
function rememberRecent(id){
  const arr = recents.value.filter(x=>x!==id)
  arr.unshift(id)
  recents.value = arr.slice(0,12)
  setLS('fx_recent', recents.value)
}

/* Close */
function close(reason){ emit('close', { reason }) }

/* Sheet drag to close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y = Math.max(0, dY.value)
  return { transform:`translateY(${y}px)`, opacity: Math.max(1 - y/240, .5) }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }
</script>

<style scoped>
/* Smooth scrollbar for the sheet */
section ::-webkit-scrollbar{ width:6px }
section ::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.25); border-radius:10px }
/* Hakuna selector yenye [] kwenye CSS. Animation inazimwa kwa v-if kwenye template. */
</style>
