<!-- LiveGridMobile.vue -->
<template>
  <div class="live-grid-wrapper relative w-full">
    <!-- Grid -->
    <div
      ref="grid"
      class="grid gap-2 sm:gap-3 p-2 sm:p-3"
      :style="gridStyle"
      role="list"
      aria-label="Live guests grid"
    >
      <!-- Tile -->
      <button
        v-for="g in visibleGuests"
        :key="g.id"
        class="guest-tile group relative w-full aspect-video rounded-2xl overflow-hidden
               bg-zinc-900/90 border border-white/10 shadow-md text-left
               focus:outline-none focus:ring-2 ring-indigo-400"
        :class="[ speakingClass(g), activeId===g.id ? 'ring-2 ring-amber-400' : '' ]"
        role="listitem"
        :aria-label="`${g.name} tile`"
        @click="onTileTap(g)"
        @dblclick.prevent="expand(g)"
        @pointerdown="onPressStart(g, $event)"
        @pointerup="onPressEnd"
        @pointercancel="onPressEnd"
        @mouseleave="onPressEnd"
      >
        <!-- Video/preview area -->
        <div class="absolute inset-0 grid place-items-center">
          <!-- Replace with <video> hookup if you pass a MediaStream -->
          <img
            v-if="g.avatar"
            :src="g.avatar"
            :alt="g.name"
            class="h-full w-full object-cover opacity-40"
            loading="lazy"
            decoding="async"
          />
          <div v-else class="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-700"></div>
          <div class="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>

        <!-- Name + role chip -->
        <div class="absolute left-2 top-2 z-10 flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/90 backdrop-blur">
            {{ g.name }}
          </span>
          <span v-if="g.role" class="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/90 text-white">{{ g.role }}</span>
        </div>

        <!-- Status icons -->
        <div class="absolute right-2 top-2 z-10 flex items-center gap-1 text-white/90">
          <span :title="g.mic ? 'Mic on' : 'Mic off'">
            <i :class="g.mic ? 'i-tabler-microphone text-emerald-400' : 'i-tabler-microphone-off text-rose-400'"></i>
          </span>
          <span :title="g.cam ? 'Camera on' : 'Camera off'">
            <i :class="g.cam ? 'i-tabler-camera text-emerald-400' : 'i-tabler-camera-off text-rose-400'"></i>
          </span>
        </div>

        <!-- Speaking pulse ring -->
        <div
          v-if="g.speaking"
          class="pointer-events-none absolute inset-0 ring-2 ring-emerald-400 rounded-2xl animate-[talk_1.8s_ease-in-out_infinite]"
        />

        <!-- Bottom controls (mobile-first) -->
        <div
          class="absolute bottom-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
          v-if="showControls"
        >
          <button
            class="px-2 py-1 rounded-full text-[11px] bg-white/10 text-white/90 backdrop-blur hover:bg-white/20"
            @click.stop="expand(g)"
            title="Expand"
          >⛶</button>
          <button
            class="px-2 py-1 rounded-full text-[11px] bg-white/10 text-white/90 backdrop-blur hover:bg-white/20"
            @click.stop="emit('remove', g.id)"
            title="Remove"
          >✖</button>
        </div>
      </button>

      <!-- Skeletons to fill grid (keep layout tidy) -->
      <div
        v-for="n in skeletonCount"
        :key="'sk-'+n"
        class="rounded-2xl aspect-video bg-zinc-800/70 border border-white/10 overflow-hidden relative"
        aria-hidden="true"
      >
        <div class="absolute inset-0 animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </div>
    </div>

    <!-- Long-press quick actions sheet -->
    <div
      v-if="sheetOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      @click.self="closeSheet('backdrop')"
    >
      <section
        class="w-full sm:w-[92%] max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden
               bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in"
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
          <button class="qa" @click="emit('toggle-mic', activeGuest.id)">{{ activeGuest?.mic ? '🔇 Mute Mic' : '🎙️ Unmute Mic' }}</button>
          <button class="qa" @click="emit('toggle-cam', activeGuest.id)">{{ activeGuest?.cam ? '📷 Turn Cam Off' : '📷 Turn Cam On' }}</button>
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

/* Props */
const props = defineProps({
  guests: { type: Array, default: () => [] },        // [{ id,name,avatar,role,mic,cam,speaking }]
  layout: { type: String, default: '2x2' },          // '1x1'|'2x2'|'3x3'|'dynamic'
  showControls: { type: Boolean, default: true },
  keepGridTidy: { type: Boolean, default: true }     // render skeletons to complete rows
})

/* Emits */
const emit = defineEmits(['remove','expand','toggle-mic','toggle-cam','tile-tap','longpress'])

/* Layout map + visible slice */
const layoutMap = { '1x1': 1, '2x2': 4, '3x3': 9, dynamic: 6 }
const visibleGuests = computed(() => {
  const limit = layoutMap[props.layout] ?? 6
  return (props.guests || []).slice(0, limit)
})

/* Responsive columns (mobile-first) */
const grid = ref(null)
const cols = ref(2) // default for mobile
function recomputeCols(){
  const desired = Math.ceil(Math.sqrt(layoutMap[props.layout] || 4))
  const w = grid.value?.clientWidth || window.innerWidth
  // Heuristic: at <380px -> 1 col, <640 -> 2, else desired
  cols.value = w < 380 ? 1 : (w < 640 ? Math.min(2, desired) : desired)
}
const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${cols.value}, minmax(0, 1fr))` }))
let ro
onMounted(async ()=>{
  await nextTick()
  recomputeCols()
  // Resize observer
  if ('ResizeObserver' in window){
    ro = new ResizeObserver(() => recomputeCols())
    grid.value && ro.observe(grid.value)
  } else {
    window.addEventListener('resize', recomputeCols)
  }
})
onBeforeUnmount(()=>{
  ro?.disconnect?.()
  window.removeEventListener?.('resize', recomputeCols)
})

/* Fillers to keep grid tidy */
const skeletonCount = computed(()=>{
  if (!props.keepGridTidy) return 0
  const remainder = visibleGuests.value.length % cols.value
  return remainder === 0 ? 0 : (cols.value - remainder)
})

/* Speaking class */
function speakingClass(g){
  return g?.speaking ? 'shadow-[0_0_0_3px_rgba(16,185,129,.55)]' : ''
}

/* Tap/long-press */
const activeId = ref(null)
function onTileTap(g){
  activeId.value = g.id
  emit('tile-tap', g.id)
}
function expand(g){ emit('expand', g.id) }

/* Long-press -> open sheet */
let pressTimer = null
const sheetOpen = ref(false)
const activeGuest = ref(null)
function onPressStart(g, e){
  clearTimeout(pressTimer)
  pressTimer = setTimeout(()=>{
    activeGuest.value = g
    sheetOpen.value = true
    emit('longpress', g.id)
    buzz(16)
  }, 480) // long-press ms
}
function onPressEnd(){ clearTimeout(pressTimer) }
function closeSheet(){ sheetOpen.value = false }

/* Haptics */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }
</script>

<style scoped>
/* Animations */
@keyframes shimmer{ 0%{ transform: translateX(-100%) } 100%{ transform: translateX(100%) } }
@keyframes talk{
  0%,100%{ box-shadow: 0 0 0 0 rgba(16,185,129,.0), inset 0 0 0 0 rgba(16,185,129,.0) }
  50%{ box-shadow: 0 0 0 8px rgba(16,185,129,.25), inset 0 0 0 2px rgba(16,185,129,.35) }
}
.qa{
  @apply w-full text-left px-3 py-2 rounded-xl border text-sm
         bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700
         hover:bg-zinc-50 dark:hover:bg-zinc-800 transition;
}
.qa.danger{
  @apply bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300;
}
/* Bottom-sheet entrance */
@keyframes in{ from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Better taps */
:host, .guest-tile{ -webkit-tap-highlight-color: transparent; }
</style>
