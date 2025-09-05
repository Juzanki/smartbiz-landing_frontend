<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-white text-base sm:text-lg font-semibold">🧩 Grid Layout</h3>

      <div class="flex items-center gap-2">
        <!-- Desktop chooser -->
        <div class="hidden sm:flex items-center gap-2">
          <select v-model="layoutModel"
                  class="bg-white/10 text-white rounded-lg px-3 py-1 text-sm border border-white/15"
                  aria-label="Select layout">
            <option v-for="l in layouts" :key="l" :value="l">{{ l }} Layout</option>
          </select>
        </div>

        <!-- Reorder toggle -->
        <button
          class="px-3 py-1 text-xs rounded-full border border-white/15 bg-white/10 text-white/90 focus-visible:ring-2 focus-visible:ring-amber-400"
          :class="reorderMode ? 'ring-2 ring-amber-400/50' : ''"
          @click="toggleReorder"
          :aria-pressed="String(reorderMode)"
        >
          {{ reorderMode ? '✅ Done' : '↔ Reorder' }}
        </button>
      </div>
    </div>

    <!-- Mobile layout chips -->
    <div class="flex sm:hidden gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Layouts">
      <button
        v-for="l in layouts" :key="l" role="tab"
        class="px-3 py-1 text-xs rounded-full border border-white/15 focus-visible:ring-2 focus-visible:ring-pink-500"
        :class="layoutModel===l ? 'bg-pink-600 text-white' : 'bg-white/10 text-white/85'"
        @click="layoutModel = l"
        :aria-selected="String(layoutModel===l)"
      >
        {{ l }}
      </button>
    </div>

    <!-- Live grid -->
    <div
      ref="gridRef"
      class="w-full rounded-2xl border border-white/10 bg-white/[.06] p-3 sm:p-4"
      :style="gridStyle"
      role="grid"
      aria-label="Live grid"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <div
        v-for="(slot, idx) in gridSlots"
        :key="slot.key"
        role="gridcell"
        :aria-label="slot.host ? slot.host.name : 'Empty slot'"
        class="tile group relative rounded-xl overflow-hidden border border-white/10 bg-black/25 text-white/85 shadow-sm
               transition-transform duration-200 will-change-transform focus-within:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        :class="[
          slot.host?.speaking ? 'ring-2 ring-emerald-400/60 speak-pulse' : '',
          reorderMode && selectedFrom===idx ? 'outline outline-2 outline-amber-400' : '',
          draggingOverIndex===idx ? 'outline outline-2 outline-pink-400' : ''
        ]"
        :style="tileStyle(idx)"
        tabindex="0"
        draggable="true"
        @dragstart="onDragStart(idx)"
        @dragenter.prevent="onDragEnter(idx)"
        @dragleave="onDragLeave(idx)"
        @click="onTileTap(idx, slot)"
        @keydown="onTileKeydown($event, idx)"
        @touchstart.passive="onLongPressStart(idx)"
        @touchend.passive="onLongPressEnd"
      >
        <!-- Empty -->
        <template v-if="!slot.host">
          <div class="absolute inset-0 grid place-items-center text-3xl opacity-35">👑</div>
          <button
            class="absolute bottom-2 right-2 text-[11px] text-white bg-white/10 px-2 py-1 rounded-full hover:bg-white/20 border border-white/15"
            @click.stop="$emit('assign', slot.id)"
          >+ Assign</button>
        </template>

        <!-- Occupied -->
        <template v-else>
          <!-- (Optional) video layer slot -->
          <slot name="video" :host="slot.host" :index="idx">
            <div class="absolute inset-0 grid place-items-center pointer-events-none">
              <img
                :src="slot.host.avatar"
                alt=""
                class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/40 shadow object-cover"
              />
            </div>
          </slot>

          <!-- Name pill -->
          <div class="absolute bottom-2 left-2 text-[11px] sm:text-xs bg-white/12 px-2 py-1 rounded-full backdrop-blur-sm border border-white/15">
            {{ slot.host.name }}
          </div>

          <!-- Mic/Cam -->
          <div class="absolute top-2 right-2 flex gap-2 text-[19px] drop-shadow">
            <i :class="slot.host.mic ? 'i-tabler-microphone text-emerald-400' : 'i-tabler-microphone-off text-rose-400'"/>
            <i :class="slot.host.cam ? 'i-tabler-camera text-emerald-400' : 'i-tabler-camera-off text-rose-400'"/>
          </div>

          <!-- Quick actions -->
          <div
            v-if="actionBarFor===idx"
            class="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 bg-black/35 rounded-lg px-2 py-1 backdrop-blur-sm border border-white/10"
          >
            <button class="px-2 py-1 text-[11px] rounded-full bg-white/10 hover:bg-white/20 border border-white/15"
                    @click.stop="$emit('expand', slot.host)">⤢ Expand</button>
            <button class="px-2 py-1 text-[11px] rounded-full bg-white/10 hover:bg-white/20 border border-white/15"
                    @click.stop="pin(idx)">📌 Pin</button>
            <button v-if="reorderMode && selectedFrom===null"
                    class="px-2 py-1 text-[11px] rounded-full bg-amber-500/20 ring-1 ring-amber-400/40"
                    @click.stop="selectedFrom=idx">Pick</button>
            <button v-else-if="reorderMode && selectedFrom!==null && selectedFrom!==idx"
                    class="px-2 py-1 text-[11px] rounded-full bg-amber-500/20 ring-1 ring-amber-400/40"
                    @click.stop="swapSlots(selectedFrom, idx)">Swap</button>
          </div>
        </template>
      </div>
    </div>

    <!-- SR-only live region for reordering instructions -->
    <span class="sr-only" aria-live="polite">{{ liveMsg }}</span>

    <!-- Safe-area spacer -->
    <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/* Props & Emits */
const props = defineProps({
  hosts: { type: Array, default: () => [] },          // [{id,name,avatar,mic,cam,speaking}]
  layout: { type: String, default: '2x2' },           // v-model:layout
  minTilePx: { type: Number, default: 160 },          // Dynamic min size
  aspect: { type: String, default: '16/9' },          // '16/9' or '1/1' etc
  spotlightCols: { type: Number, default: 2 },
  spotlightRows: { type: Number, default: 2 }
})
const emit = defineEmits(['assign','expand','pin','reorder','update:layout'])

/* Layout model (two-way) */
const layoutModel = computed({
  get: () => props.layout,
  set: (v) => emit('update:layout', v)
})

/* Layout options */
const layouts = ['1x1','2x2','3x3','4x4','6x6','Dynamic','Spotlight']

/* Grid container size */
const gridRef = ref(null)
const containerWidth = ref(0)
let ro
onMounted(()=>{
  ro = new ResizeObserver(entries=>{
    for(const e of entries){ containerWidth.value = e.contentRect.width }
  })
  if(gridRef.value) ro.observe(gridRef.value)
})
onBeforeUnmount(()=>{ try{ ro?.disconnect() }catch{} })

/* Columns & grid style */
const minCard = computed(()=> containerWidth.value < 420 ? Math.min(130, props.minTilePx) : props.minTilePx)
const cols = computed(()=>{
  const l = layoutModel.value
  if (l==='1x1') return 1
  if (l==='2x2') return 2
  if (l==='3x3') return 3
  if (l==='4x4') return 4
  if (l==='6x6') return 6
  if (l==='Dynamic' || l==='Spotlight'){
    const c = Math.max(1, Math.floor(containerWidth.value / minCard.value))
    return Math.min(c, 6)
  }
  return 3
})
const gridStyle = computed(()=>{
  if (['Dynamic','Spotlight'].includes(layoutModel.value)) {
    return {
      display:'grid',
      gap: '0.75rem',
      gridTemplateColumns: `repeat(auto-fit, minmax(${minCard.value}px, 1fr))`
    }
  }
  return {
    display:'grid',
    gap: '0.75rem',
    gridTemplateColumns: `repeat(${cols.value}, minmax(0,1fr))`
  }
})

/* Slots (internal order) */
const gridSlots = ref([])
const makeSlots = () => {
  const total = totalSlotsFor(layoutModel.value)
  const arr = Array.from({ length: total }, (_, i) => ({
    id: i,
    key: `${i}-${hostKey(props.hosts[i])}`,
    host: props.hosts[i] ?? null
  }))
  gridSlots.value = arr
}
function hostKey(h){ return h ? (h.id ?? h.name ?? Math.random()) : 'empty' }
function totalSlotsFor(layout){
  return layout==='1x1'?1 :
         layout==='2x2'?4 :
         layout==='3x3'?9 :
         layout==='4x4'?16 :
         layout==='6x6'?36 :
         layout==='Spotlight'? (cols.value <= 2 ? 7 : 10) :
         12 // Dynamic default
}
watch([()=>props.hosts, layoutModel, cols], makeSlots, { immediate:true })

/* Tile sizing (Spotlight: first spans) */
function tileStyle(index){
  if (layoutModel.value!=='Spotlight') return { aspectRatio: props.aspect }
  const spanC = Math.min(props.spotlightCols, cols.value)
  const spanR = props.spotlightRows
  if (index===0){
    return {
      aspectRatio: props.aspect,
      gridColumn: `span ${spanC} / span ${spanC}`,
      gridRow: `span ${spanR} / span ${spanR}`
    }
  }
  return { aspectRatio: props.aspect }
}

/* Quick actions: long-press / hover */
const actionBarFor = ref(null)
let lpTimer=null
function onLongPressStart(idx){
  clearTimeout(lpTimer)
  lpTimer = setTimeout(()=> actionBarFor.value = idx, 420)
}
function onLongPressEnd(){
  clearTimeout(lpTimer); lpTimer=null
  setTimeout(()=> actionBarFor.value=null, 2200)
}

/* Reorder state */
const reorderMode = ref(false)
const selectedFrom = ref(null)
const liveMsg = ref('')

function toggleReorder(){
  reorderMode.value = !reorderMode.value
  selectedFrom.value = null
  actionBarFor.value = null
  liveSay(reorderMode.value
    ? 'Reorder mode on. Press Space to pick a tile, then use Arrow keys. Press Enter to drop.'
    : 'Reorder mode off.')
}
function swapSlots(a,b){
  if(a==null || b==null || a===b) return
  const arr = gridSlots.value
  ;[arr[a], arr[b]] = [arr[b], arr[a]]
  // Re-key to force tile transitions
  arr[a].key = `${a}-${hostKey(arr[a].host)}`
  arr[b].key = `${b}-${hostKey(arr[b].host)}`
  gridSlots.value = [...arr]
  emit('reorder', { from:a, to:b })
  liveSay(`Moved tile ${a+1} to position ${b+1}.`)
  selectedFrom.value = null
}

/* Tap handler */
function onTileTap(idx, slot){
  if (!slot.host) return
  if (reorderMode.value && selectedFrom.value!==null && selectedFrom.value!==idx) {
    swapSlots(selectedFrom.value, idx)
  } else if (reorderMode.value && selectedFrom.value===null) {
    selectedFrom.value = idx
    liveSay(`Picked tile ${idx+1}. Choose destination.`)
  } else {
    actionBarFor.value = idx
    setTimeout(()=> actionBarFor.value=null, 1500)
  }
}

/* Pin (to first index) */
function pin(idx){
  if (idx===0) return
  const arr = gridSlots.value
  const [x] = arr.splice(idx,1)
  arr.unshift(x)
  gridSlots.value = [...arr]
  emit('pin', { from: idx })
  liveSay(`Pinned ${x.host?.name ?? 'tile'} to spotlight.`)
}

/* Keyboard reordering (accessible) */
function onTileKeydown(e, idx){
  if (!reorderMode.value) return
  const total = gridSlots.value.length
  const c = cols.value || 1
  const move = (delta)=>{
    const target = Math.max(0, Math.min(total-1, idx + delta))
    if (selectedFrom.value===null){ selectedFrom.value = idx; liveSay(`Picked tile ${idx+1}.`) }
    if (target!==idx){ swapSlots(idx, target) }
  }
  switch(e.key){
    case ' ': case 'Enter':
      e.preventDefault()
      if (selectedFrom.value===null){ selectedFrom.value = idx; liveSay(`Picked tile ${idx+1}.`) }
      else if (selectedFrom.value!==idx){ swapSlots(selectedFrom.value, idx) }
      else { selectedFrom.value = null; liveSay('Cancelled pick.') }
      break
    case 'ArrowLeft':  e.preventDefault(); move(-1); break
    case 'ArrowRight': e.preventDefault(); move(+1); break
    case 'ArrowUp':    e.preventDefault(); move(-c); break
    case 'ArrowDown':  e.preventDefault(); move(+c); break
  }
}

/* Drag & drop (mouse / touch) */
const draggingIndex = ref(null)
const draggingOverIndex = ref(null)
function onDragStart(idx){
  if (!reorderMode.value){ return false }
  draggingIndex.value = idx
}
function onDragEnter(idx){
  if (!reorderMode.value) return
  draggingOverIndex.value = idx
}
function onDragLeave(_idx){
  draggingOverIndex.value = null
}
function onDrop(){
  if (!reorderMode.value) return
  if (draggingIndex.value!=null && draggingOverIndex.value!=null && draggingIndex.value!==draggingOverIndex.value){
    swapSlots(draggingIndex.value, draggingOverIndex.value)
  }
  draggingIndex.value = draggingOverIndex.value = null
}

/* SR live helper */
function liveSay(s){ liveMsg.value = s }

/* Utils */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }
</script>

<style scoped>
/* Tile visuals */
.tile {
  background-image: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  box-shadow: inset 0 0 5px rgba(255,255,255,0.05);
}
.tile:hover { transform: translateY(-2px) }

/* Speaking pulse ring */
@keyframes pulseRing { 0%,100%{ box-shadow: 0 0 0 .0rem rgba(16,185,129,.0) } 50%{ box-shadow: 0 0 0 .45rem rgba(16,185,129,.18) } }
.speak-pulse { animation: pulseRing 2s ease-in-out infinite }

/* Mobile scrollbar hiding */
.no-scrollbar::-webkit-scrollbar{ display:none }

/* Visually-hidden but accessible (sr-only) */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
</style>
