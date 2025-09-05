<template>
  <div class="relative w-full h-full overflow-hidden bg-black/70" @dblclick="toggleGlobalUI">
    <!-- Stage Wrapper (supports zoom/pan + safe area) -->
    <div
      ref="stageRef"
      class="relative w-full h-full touch-none"
      :style="stageStyle"
      role="region"
      aria-label="Interactive live stage"
    >
      <!-- Background -->
      <div
        :style="backgroundStyle"
        class="absolute inset-0 transition-all duration-500 bg-cover bg-center z-0"
        aria-hidden="true"
      ></div>

      <!-- Draggable/Resizable Guests -->
      <VueDraggableResizable
        v-for="g in guests"
        :key="g.id"
        :x="g.x" :y="g.y" :w="g.width" :h="g.height"
        :parent="true" :min-w="96" :min-h="120"
        :draggable="!locks.dragLock" :resizable="!locks.resizeLock"
        :active="activeGuestId===g.id"
        :handles="['tl','tr','br','bl']"
        @activated="activeGuestId=g.id"
        @dragging="onDragging(g, $event)"
        @dragstop="onDragStop(g, $event)"
        @resizestop="onResizeStop(g, $event)"
        class="absolute z-10 cursor-move guest-item select-none"
      >
        <div
          class="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/20"
          :class="[
            g.spotlight ? 'ring-4 ring-amber-400/70' : '',
            g.speaking ? 'animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-emerald-400/50' : ''
          ]"
          @dblclick.stop="toggleSpotlight(g.id)"
          @pointerdown.passive="bringToFront(g.id)"
        >
          <img :src="g.avatar" :alt="`${g.name} video`" class="object-cover w-full h-full" />
          <div
            v-if="g.spotlight"
            class="absolute inset-x-2 top-2 text-xs font-semibold text-white/90 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none"
          >
            🎤 Spotlight — {{ g.name }}
          </div>

          <!-- Name pill + mic/cam -->
          <div class="absolute bottom-2 left-2 flex items-center gap-2">
            <span class="text-[11px] bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
              {{ g.name }}
            </span>
            <span class="text-lg" :title="g.mic ? 'Mic on' : 'Mic off'">
              <i :class="g.mic ? 'i-tabler-microphone text-emerald-400' : 'i-tabler-microphone-off text-rose-400'"/>
            </span>
            <span class="text-lg" :title="g.cam ? 'Cam on' : 'Cam off'">
              <i :class="g.cam ? 'i-tabler-camera text-emerald-400' : 'i-tabler-camera-off text-rose-400'"/>
            </span>
          </div>
        </div>
      </VueDraggableResizable>

      <!-- Effects Layer -->
      <transition name="fade">
        <div v-if="effect==='confetti'" class="absolute inset-0 z-20 pointer-events-none">
          <ConfettiEffect />
        </div>
      </transition>

      <!-- Floating FAB (mobile) -->
      <button
        v-if="showUI"
        class="fixed z-30 bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 w-12 h-12 rounded-full grid place-items-center
               bg-indigo-600 text-white shadow-2xl sm:hidden"
        @click="drawerOpen=true; buzz(12)"
        aria-label="Open controls"
      >⚙️</button>

      <!-- Side Controls (desktop) -->
      <aside
        v-if="showUI"
        class="hidden sm:flex absolute top-4 right-4 z-30 bg-white/80 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100
               backdrop-blur p-4 rounded-xl shadow-2xl w-80 flex-col gap-4 border border-white/20"
      >
        <StageControls />
      </aside>

      <!-- Bottom Drawer Controls (mobile-first) -->
      <transition name="slide-up">
        <div
          v-if="drawerOpen"
          class="fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100
                 rounded-t-3xl shadow-2xl border-t border-black/10 dark:border-white/10"
          role="dialog" aria-modal="true" aria-label="Stage controls"
        >
          <!-- Handle -->
          <div class="pt-2 grid place-items-center">
            <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
          </div>

          <div class="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <StageControls />
          </div>

          <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import VueDraggableResizable from 'vue3-draggable-resizable'
import 'vue3-draggable-resizable/dist/Vue3DraggableResizable.css'
import ConfettiEffect from '@/components/effects/ConfettiEffect.vue'

/** ------------------------------
 *  STATE
 *  ------------------------------ */
const showUI = ref(true)
const drawerOpen = ref(false)
const activeGuestId = ref(null)
const stageRef = ref(null)

const locks = ref({ dragLock: false, resizeLock: false, snap: true })
const stageZoom = ref(1) // 0.75–1.5
const effect = ref('')
const selectedBackground = ref('/backgrounds/studio.jpg')
const customBg = ref('#0f172a')
const useColorBg = ref(false)

const guests = ref([
  { id: 1, name: 'Diana',    avatar: '/avatars/guest1.png', x: 40,  y: 80,  width: 150, height: 200, mic: true,  cam: true,  spotlight: false, speaking: false, z: 1 },
  { id: 2, name: 'Jay',      avatar: '/avatars/guest2.png', x: 260, y: 180, width: 150, height: 200, mic: false, cam: true,  spotlight: false, speaking: false, z: 2 },
])

/** ------------------------------
 *  BACKGROUNDS
 *  ------------------------------ */
const backgrounds = [
  { label: '🎬 Studio',  url: '/backgrounds/studio.jpg' },
  { label: '🪐 Galaxy',  url: '/backgrounds/galaxy.jpg' },
  { label: '🌆 City',    url: '/backgrounds/city.jpg' },
  { label: '🎨 Custom',  url: '' }
]
const backgroundStyle = computed(() => {
  if (useColorBg.value || !selectedBackground.value) {
    return { background: customBg.value }
  }
  return { backgroundImage: `url(${selectedBackground.value})` }
})

/** ------------------------------
 *  STAGE STYLE (zoom)
 *  ------------------------------ */
const stageStyle = computed(() => ({
  transform: `scale(${stageZoom.value})`,
  transformOrigin: 'center center',
  transition: 'transform .25s ease',
}))

/** ------------------------------
 *  HELPERS
 *  ------------------------------ */
function buzz(ms=12){ try{ navigator?.vibrate?.(ms) }catch{} }

function snap(val, grid = 8) {
  return locks.value.snap ? Math.round(val / grid) * grid : val
}

function onDragging(g, ev){
  // show subtle guide snapping while dragging
  g.x = ev.left; g.y = ev.top
}

function onDragStop(g, ev){
  g.x = snap(ev.left); g.y = snap(ev.top)
  persist()
}

function onResizeStop(g, ev){
  g.width  = Math.max(96, snap(ev.width))
  g.height = Math.max(120, snap(ev.height))
  g.x = snap(ev.left); g.y = snap(ev.top)
  persist()
}

function toggleSpotlight(id){
  const t = guests.value.find(x=>x.id===id)
  if (!t) return
  t.spotlight = !t.spotlight
  buzz(14)
  persist()
}

function bringToFront(id){
  const maxZ = Math.max(...guests.value.map(g=>g.z||1), 1)
  const t = guests.value.find(x=>x.id===id); if(!t) return
  t.z = maxZ + 1
}

/** Auto-arrange in a neat grid */
function autoLayout(){
  const cols = 2
  const gap = 12
  const w = 160, h = 210
  guests.value.forEach((g, i) => {
    const r = Math.floor(i/cols), c = i%cols
    g.x = snap(16 + c*(w+gap))
    g.y = snap(24 + r*(h+gap))
    g.width = w; g.height = h
  })
  persist()
}

/** Reset stage to defaults */
function resetStage(){
  selectedBackground.value = '/backgrounds/studio.jpg'
  useColorBg.value = false
  stageZoom.value = 1
  effect.value = ''
  autoLayout()
}

/** Toggle global UI with dblclick on stage background */
function toggleGlobalUI(){ showUI.value = !showUI.value }

/** Persist/Restore */
const LS_KEY = 'immersive_stage_v1'
function persist(){
  try{
    const data = {
      guests: guests.value,
      bg: selectedBackground.value,
      useColorBg: useColorBg.value,
      customBg: customBg.value,
      zoom: stageZoom.value,
      effect: effect.value,
      locks: locks.value
    }
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  }catch{}
}
function restore(){
  try{
    const data = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if(!data) return
    guests.value = data.guests || guests.value
    selectedBackground.value = data.bg ?? selectedBackground.value
    useColorBg.value = !!data.useColorBg
    customBg.value = data.customBg || customBg.value
    stageZoom.value = data.zoom ?? 1
    effect.value = data.effect || ''
    locks.value = data.locks || locks.value
  }catch{}
}

watch([guests, selectedBackground, useColorBg, customBg, stageZoom, effect, locks], persist, { deep: true })

onMounted(()=>{
  restore()
  // first-time layout if only defaults
  if (!localStorage.getItem(LS_KEY)) autoLayout()
})

/** ------------------------------
 *  SUB-COMPONENT: Controls panel
 *  ------------------------------ */
const StageControls = {
  name: 'StageControls',
  setup(){
    return {
      // expose outer refs
      backgrounds, selectedBackground, useColorBg, customBg,
      effect, stageZoom, locks, guests, drawerOpen,
      autoLayout, resetStage, toggleSpotlight, bringToFront, buzz
    }
  },
  template: `
  <div class="space-y-4">
    <h2 class="text-lg font-semibold flex items-center gap-2">🎛 Stage Controls</h2>

    <!-- Background -->
    <div>
      <label class="block mb-1 text-sm font-medium">🎨 Background</label>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="bg in backgrounds" :key="bg.label"
          class="rounded-xl overflow-hidden border border-black/10 dark:border-white/10"
          :class="(selectedBackground===bg.url && !useColorBg) ? 'ring-2 ring-indigo-500' : ''"
          @click="useColorBg=false; selectedBackground=bg.url"
        >
          <div class="h-14 w-full bg-center bg-cover"
               :style="bg.url ? 'background-image:url(' + bg.url + ')' : 'background:#111'"></div>
          <div class="text-[11px] px-2 py-1 text-center">{{ bg.label }}</div>
        </button>
      </div>

      <!-- Custom Color -->
      <div class="mt-2 flex items-center gap-2">
        <label class="text-sm"><input type="checkbox" v-model="useColorBg" class="mr-1"/> Use Color</label>
        <input type="color" v-model="customBg" class="h-8 w-8 rounded border p-0"/>
      </div>
    </div>

    <!-- Effects -->
    <div>
      <label class="block mb-1 text-sm font-medium">✨ Effects</label>
      <select v-model="effect" class="w-full p-2 rounded-lg border bg-white dark:bg-zinc-900">
        <option value="">None</option>
        <option value="confetti">🎉 Confetti</option>
      </select>
      <p class="text-[11px] opacity-70 mt-1">Turn on Confetti to celebrate moments.</p>
    </div>

    <!-- Zoom & Locks -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block mb-1 text-sm font-medium">🔍 Zoom</label>
        <input type="range" min="0.75" max="1.5" step="0.05" v-model.number="stageZoom" class="w-full"/>
        <div class="text-[11px] opacity-70 mt-0.5">{{ (stageZoom*100).toFixed(0) }}%</div>
      </div>
      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="locks.snap"/> Snap to grid</label>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="locks.dragLock"/> Lock drag</label>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="locks.resizeLock"/> Lock resize</label>
      </div>
    </div>

    <!-- Spotlight Quick Toggles -->
    <div>
      <label class="block mb-1 text-sm font-medium">🔦 Spotlight</label>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="g in guests" :key="g.id"
                @click="$emit('noop'); toggleSpotlight(g.id)"
                class="px-2 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700">
          {{ g.spotlight ? 'Unspot ' + g.name : g.name }}
        </button>
      </div>
    </div>

    <!-- Arrange & Utils -->
    <div class="grid grid-cols-2 gap-2">
      <button @click="autoLayout" class="px-3 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-sm">↘ Auto Layout</button>
      <button @click="resetStage" class="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm">Reset</button>
    </div>

    <!-- Close drawer (mobile) -->
    <button class="sm:hidden w-full mt-1 px-3 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-sm"
            @click="drawerOpen=false">Close</button>
  </div>
  `
}
</script>

<style scoped>
/* Fade + Slide animations */
.fade-enter-active, .fade-leave-active { transition: opacity .5s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }

.slide-up-enter-active, .slide-up-leave-active { transition: transform .28s cubic-bezier(.22,1,.36,1), opacity .2s ease }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(18px); opacity: 0 }

/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm { backdrop-filter: none !important }
}

/* Speaking pulse keyframe (used on tile ring) */
@keyframes pulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(16,185,129,0) } 50%{ box-shadow: 0 0 0 .5rem rgba(16,185,129,.18) } }

/* Draggable handle cursor fix on mobile is default tap; desktop shows move */
.guest-item { touch-action: none }
</style>
