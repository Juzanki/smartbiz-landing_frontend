<!-- UnifiedGridPanel.vue -->
<template>
  <div class="relative w-full h-full overflow-hidden rounded-2xl border border-white/10 bg-black">
    <!-- Top controls (mobile-first) -->
    <div
      class="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 flex items-center justify-between gap-2
             bg-gradient-to-b from-black/70 to-transparent"
    >
      <div class="min-w-0">
        <h3 class="text-white font-semibold text-base sm:text-lg truncate">🎥 Unified Guest View</h3>
        <p class="text-white/60 text-[11px] sm:text-xs">Tap a tile to focus • Long-press for actions</p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Compact layout picker -->
        <select
          v-model="selectedLayout"
          class="rounded-xl bg-white/10 text-white text-xs sm:text-sm px-3 py-2 backdrop-blur
                 border border-white/15 focus:outline-none focus:ring-2 ring-indigo-400"
          aria-label="Change grid layout"
        >
          <option v-for="l in layouts" :key="l" :value="l">{{ l }}</option>
        </select>

        <!-- Options pop -->
        <button
          class="h-9 w-9 grid place-items-center rounded-xl bg-white/10 text-white/90 border border-white/15
                 focus:outline-none focus:ring-2 ring-indigo-400"
          aria-label="More options"
          @click="showOptions = !showOptions"
        >
          ⋮
        </button>
      </div>
    </div>

    <!-- Quick options popover -->
    <transition name="fade-pop">
      <div
        v-if="showOptions"
        class="absolute right-3 top-14 z-20 w-56 rounded-2xl bg-zinc-900/95 text-white ring-1 ring-white/10 p-2 backdrop-blur"
        role="menu"
      >
        <button class="pop-row" @click="toggleNames">
          <span>{{ showNames ? 'Hide' : 'Show' }} names</span>
          <span>{{ showNames ? '🙈' : '👀' }}</span>
        </button>
        <button class="pop-row" @click="toggleStatus">
          <span>{{ showStatus ? 'Hide' : 'Show' }} mic/cam</span>
          <span>🎚️</span>
        </button>
        <button class="pop-row" @click="dense = !dense">
          <span>{{ dense ? 'Cozy spacing' : 'Dense spacing' }}</span>
          <span>{{ dense ? '🛋️' : '📐' }}</span>
        </button>
      </div>
    </transition>

    <!-- Grid area -->
    <div
      ref="grid"
      class="absolute inset-0 z-0 grid"
      :style="gridStyle"
      role="list"
      aria-label="Guest tiles"
    >
      <!-- Guest tile -->
      <button
        v-for="g in visibleGuests"
        :key="g.id"
        class="relative w-full overflow-hidden rounded-2xl border border-white/10
               bg-zinc-900/90 text-left focus:outline-none focus:ring-2 ring-amber-400
               transition will-change-transform"
        :class="[ dense ? 'm-1' : 'm-2', activeId===g.id ? 'ring-2' : '', g.speaking ? 'speaking' : '' ]"
        role="listitem"
        :aria-label="`${g.name} tile`"
        @click="focusTile(g)"
        @dblclick.prevent="emit('expand', g.id)"
        @pointerdown="onPressStart(g)"
        @pointerup="onPressEnd"
        @pointercancel="onPressEnd"
        @mouseleave="onPressEnd"
      >
        <!-- Replace SmartCam preview with your video hookup if needed -->
        <SmartCam :user="g" />

        <!-- Top-left: name & role -->
        <div v-if="showNames" class="abs-tl">
          <span class="chip">{{ g.name }}</span>
          <span v-if="g.role" class="chip chip--indigo">{{ g.role }}</span>
        </div>

        <!-- Top-right: status -->
        <div v-if="showStatus" class="abs-tr gap-1 text-white/90">
          <span :title="g.mic ? 'Mic on' : 'Mic off'">
            <i :class="g.mic ? 'i-tabler-microphone text-emerald-400' : 'i-tabler-microphone-off text-rose-400'"></i>
          </span>
          <span :title="g.cam ? 'Camera on' : 'Camera off'">
            <i :class="g.cam ? 'i-tabler-camera text-emerald-400' : 'i-tabler-camera-off text-rose-400'"></i>
          </span>
          <span v-if="g.speaking" class="text-emerald-400">🔊</span>
        </div>

        <!-- Bottom-right: quick hover/tap actions (desktop hover, mobile long-press opens sheet) -->
        <div class="abs-br opacity-0 md:opacity-100 md:group-hover:opacity-100 transition">
          <button class="btn-ghost" @click.stop="emit('expand', g.id)" title="Expand">⛶</button>
          <button class="btn-ghost" @click.stop="emit('remove', g.id)" title="Remove">✖</button>
        </div>
      </button>

      <!-- Fillers to keep rows balanced -->
      <div
        v-for="n in fillerCount"
        :key="'f-'+n"
        class="rounded-2xl border border-white/5 bg-zinc-900/60 overflow-hidden"
        aria-hidden="true"
      />
    </div>

    <!-- Long-press sheet -->
    <div
      v-if="sheetOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      @click.self="closeSheet('backdrop')"
    >
      <section
        class="w-full sm:w-[92%] max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden
               bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in"
        role="dialog" aria-modal="true" aria-label="Guest quick actions"
      >
        <div class="sm:hidden pt-2 grid place-items-center">
          <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
        </div>
        <header class="px-5 pt-2 pb-3 sm:p-5">
          <h2 class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">
            Quick actions — {{ activeGuest?.name }}
          </h2>
        </header>
        <div class="px-5 pb-4 grid gap-2">
          <button class="qa" @click="emit('expand', activeGuest.id)">⛶ Expand</button>
          <button class="qa" @click="emit('toggle-mic', activeGuest.id)">
            {{ activeGuest?.mic ? '🔇 Mute mic' : '🎙️ Unmute mic' }}
          </button>
          <button class="qa" @click="emit('toggle-cam', activeGuest.id)">
            {{ activeGuest?.cam ? '📷 Turn cam off' : '📷 Turn cam on' }}
          </button>
          <button class="qa" @click="pin(activeGuest.id)">
            {{ isPinned(activeGuest.id) ? '📌 Unpin' : '📌 Pin to first row' }}
          </button>
          <button class="qa danger" @click="emit('remove', activeGuest.id)">🗑 Remove</button>
        </div>
        <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70">
          <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" @click="closeSheet('close')">Close</button>
        </footer>
        <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import SmartCam from '@/components/Common/SmartCam.vue'

/* Props & Emits */
const props = defineProps({
  guests: { type: Array, default: () => [] },            // [{id,name,avatar,role,mic,cam,speaking}]
  initialLayout: { type: String, default: 'Auto' },      // 'Auto'|'1x1'|'2x2'|'3x3'|'4x4'|'Full'
  minTileHeight: { type: Number, default: 140 },
  tidyRows: { type: Boolean, default: true }
})
const emit = defineEmits(['expand','remove','toggle-mic','toggle-cam','focus'])

/* UI state */
const layouts = ['Auto', '1x1', '2x2', '3x3', '4x4', 'Full']
const selectedLayout = ref(props.initialLayout)
const showOptions = ref(false)
const showNames = ref(true)
const showStatus = ref(true)
const dense = ref(false)

/* Pinning (keep important guests on top) */
const pinned = ref(new Set())
function isPinned(id){ return pinned.value.has(id) }
function pin(id){
  if (isPinned(id)) pinned.value.delete(id)
  else pinned.value.add(id)
  closeSheet('pin')
}

/* Visible guests (sorted with pinned first) */
const sortedGuests = computed(()=>{
  const arr = [...props.guests]
  arr.sort((a,b)=>{
    const pa = pinned.value.has(a.id) ? 0 : 1
    const pb = pinned.value.has(b.id) ? 0 : 1
    return pa - pb
  })
  return arr
})

/* Layout capacity */
const capacityMap = { '1x1': 1, '2x2': 4, '3x3': 9, '4x4': 16, 'Full': Infinity, 'Auto': -1 }
const limit = computed(()=>{
  const cap = capacityMap[selectedLayout.value] ?? -1
  if (cap === -1) return Infinity // auto: show all, grid will adapt columns
  return cap
})
const visibleGuests = computed(()=> sortedGuests.value.slice(0, limit.value))

/* Responsive columns (true mobile-first) */
const grid = ref(null)
const cols = ref(2)
function desiredColsByLayout(){
  const l = selectedLayout.value
  if (l === '1x1') return 1
  if (l === '2x2') return 2
  if (l === '3x3') return 3
  if (l === '4x4') return 4
  // Auto / Full -> compute by width
  return Math.min(4, Math.ceil(Math.sqrt(Math.max(visibleGuests.value.length, 1))))
}
function recomputeCols(){
  const w = grid.value?.clientWidth || window.innerWidth
  const d = desiredColsByLayout()
  // narrow phones -> gracefully collapse
  cols.value = w < 360 ? 1 : (w < 640 ? Math.min(2, d) : d)
}
const rowGap = computed(()=> dense.value ? 6 : 10)
const colGap = rowGap
const gridStyle = computed(()=>{
  return {
    display: 'grid',
    padding: dense.value ? '6px' : '8px',
    gap: `${rowGap.value}px ${colGap.value}px`,
    gridTemplateColumns: `repeat(${cols.value}, minmax(0, 1fr))`,
    alignItems: 'stretch',
    justifyItems: 'stretch'
  }
})
let ro
onMounted(async ()=>{
  await nextTick()
  recomputeCols()
  if ('ResizeObserver' in window){
    ro = new ResizeObserver(recomputeCols)
    grid.value && ro.observe(grid.value)
  } else {
    window.addEventListener('resize', recomputeCols)
  }
})
onBeforeUnmount(()=>{
  ro?.disconnect?.()
  window.removeEventListener?.('resize', recomputeCols)
})
watch([() => selectedLayout.value, () => visibleGuests.value.length], recomputeCols)

/* Keep rows balanced with fillers */
const fillerCount = computed(()=>{
  if (!props.tidyRows) return 0
  const rem = visibleGuests.value.length % cols.value
  return rem === 0 ? 0 : (cols.value - rem)
})

/* Focus / long-press */
const activeId = ref(null)
function focusTile(g){
  activeId.value = g.id
  emit('focus', g.id)
}
const sheetOpen = ref(false)
const activeGuest = ref(null)
let pressTimer = null
function onPressStart(g){
  clearTimeout(pressTimer)
  pressTimer = setTimeout(()=>{
    activeGuest.value = g
    sheetOpen.value = true
    try{ navigator?.vibrate?.(16) }catch{}
  }, 480)
}
function onPressEnd(){ clearTimeout(pressTimer) }
function closeSheet(){ sheetOpen.value = false }

/* Options toggles */
function toggleNames(){ showNames.value = !showNames.value; showOptions.value = false }
function toggleStatus(){ showStatus.value = !showStatus.value; showOptions.value = false }
</script>

<style scoped>
/* Utility placements */
.abs-tl{ position:absolute; left:.5rem; top:.5rem; display:flex; gap:.4rem; z-index:5 }
.abs-tr{ position:absolute; right:.5rem; top:.5rem; display:flex; z-index:5 }
.abs-br{ position:absolute; right:.5rem; bottom:.5rem; display:flex; gap:.4rem; z-index:5 }

/* Chips & buttons */
.chip{
  @apply px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/90 backdrop-blur;
}
.chip--indigo{ @apply bg-indigo-600/90 text-white }
.btn-ghost{
  @apply px-2 py-1 rounded-full text-[11px] bg-white/10 text-white/90 backdrop-blur hover:bg-white/20 transition;
}

/* Speaking pulse */
.speaking{
  box-shadow: 0 0 0 2px rgba(16,185,129,.55);
  animation: talk 1.8s ease-in-out infinite;
}
@keyframes talk{
  0%,100%{ box-shadow: 0 0 0 2px rgba(16,185,129,.55) }
  50%    { box-shadow: 0 0 0 8px rgba(16,185,129,.25) }
}

/* Popover rows */
.pop-row{
  @apply w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl
         text-sm bg-zinc-900/60 hover:bg-zinc-800 transition;
}

/* Sheet styles */
.qa{
  @apply w-full text-left px-3 py-2 rounded-xl border text-sm
         bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700
         hover:bg-zinc-50 dark:hover:bg-zinc-800 transition;
}
.qa.danger{
  @apply bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300;
}

/* Animations */
@keyframes in{ from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }
.fade-pop-enter-active,.fade-pop-leave-active{ transition: opacity .16s ease, transform .16s ease }
.fade-pop-enter-from,.fade-pop-leave-to{ opacity: 0; transform: translateY(6px) }

/* Better touch */
:host, button{ -webkit-tap-highlight-color: transparent; }
</style>
