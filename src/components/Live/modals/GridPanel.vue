<template>
  <div class="relative w-full min-h-screen bg-gradient-to-br from-black via-indigo-950 to-gray-900 p-6">
    <!-- 🎛️ Grid Mode Selector -->
    <div class="flex items-center justify-between mb-6 text-white">
      <h2 class="text-xl font-bold tracking-wide">🧬 Smart Grid Panel</h2>
      <select
        v-model="gridMode"
        class="bg-black/30 border border-white/20 rounded px-4 py-2 text-white"
        aria-label="Select grid mode"
      >
        <option value="1x1">🔲 1x1</option>
        <option value="2x2">🧩 2x2</option>
        <option value="3x3">🔳 3x3</option>
        <option value="6x6">🧠 6x6</option>
        <option value="dynamic">♾️ Dynamic</option>
      </select>
    </div>

    <!-- 🧱 GRID DISPLAY -->
    <div :class="gridClasses" :style="gridStyle" class="gap-4 transition-all duration-500">
      <div
        v-for="(slot, index) in computedSlots"
        :key="index"
        class="relative border border-white/10 bg-white/5 rounded-xl backdrop-blur-md flex items-center justify-center shadow-lg hover:shadow-pink-500/50 group overflow-hidden"
        :style="slotStyle"
        @click="onCellTap(index)"
      >
        <template v-if="slot.occupied">
          <!-- 🎥 Guest Stream View -->
          <div class="flex flex-col items-center text-white text-sm">
            <img :src="slot.avatar" class="w-12 h-12 rounded-full border border-white shadow" loading="lazy" alt="" />
            <div class="mt-2 font-bold truncate max-w-[8rem]">{{ slot.name }}</div>
            <div class="flex gap-2 mt-1 text-xs">
              <button
                @click.stop="toggleMic(slot)"
                :class="slot.mic ? 'text-green-400' : 'text-red-400'"
                :aria-label="slot.mic ? 'Mute mic' : 'Unmute mic'"
              >🎙</button>
              <button
                @click.stop="toggleCam(slot)"
                :class="slot.cam ? 'text-blue-400' : 'text-gray-400'"
                :aria-label="slot.cam ? 'Turn camera off' : 'Turn camera on'"
              >📷</button>
              <button @click.stop="expandSlot(index)" class="hover:text-yellow-300" aria-label="Expand slot">🔍</button>
              <button @click.stop="removeGuest(index)" class="hover:text-red-500" aria-label="Remove guest">🗑</button>
            </div>
          </div>
        </template>
        <template v-else>
          <!-- 👑 Royal Chair if empty -->
          <div class="text-pink-400 font-bold text-xs animate-pulse select-none">👑 Empty Royal Slot</div>
        </template>

        <!-- 💡 Overlay -->
        <div
          class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
          :class="{'opacity-100': activeCell === index}"  <!-- tap hizi kwenye touch -->
        >
          <button
            @click.stop="assignGuest(index)"
            class="bg-pink-500 hover:bg-pink-600 text-white px-4 py-1 rounded-full text-xs"
            aria-label="Assign random guest to slot"
          >
            + Assign Guest
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

/* ===== State ===== */
const gridMode = ref('2x2')
const activeCell = ref(-1) // kwa touch: onyesha overlay ya seli iliyoguswa

const guestPool = [
  { name: 'Zena', avatar: '/avatars/user1.png', mic: true, cam: true },
  { name: 'Amani', avatar: '/avatars/user2.png', mic: false, cam: true },
  { name: 'Baraka', avatar: '/avatars/user3.png', mic: true, cam: false },
  { name: 'Malaika', avatar: '/avatars/user4.png', mic: true, cam: true },
  { name: 'Juzzy', avatar: '/avatars/user5.png', mic: true, cam: true },
  { name: 'Fahima', avatar: '/avatars/user6.png', mic: false, cam: false }
]

/* Cache layout kwenye localStorage (lightweight) */
const LS_KEY = 'smart_grid_slots_v1'
const loadSlots = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
const saveSlots = (val) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(val)) } catch {}
}

const slots = ref(
  (loadSlots().length ? loadSlots() : Array.from({ length: 9 }, () => ({ occupied: false, name: '', avatar: '', mic: false, cam: false })))
)

/* ===== Responsive Grid ===== */
/* Safest: tumia class 'grid' tu, columns kupitia inline style → Tailwind purge safe */
const gridClasses = computed(() => 'grid')

/* Hesabu columns kulingana na mode + viewport width */
const vw = ref(window.innerWidth)
const onResize = () => { vw.value = window.innerWidth }
window.addEventListener('resize', onResize, { passive: true })

const colsFor = (mode, width) => {
  if (mode === '1x1') return 1
  if (mode === '2x2') return width < 380 ? 1 : 2
  if (mode === '3x3') return width < 420 ? 2 : 3
  if (mode === '6x6') return width < 480 ? 3 : (width < 760 ? 4 : 6)
  // dynamic: kwa simu ndogo jaribu 2—kubwa kadirio la √n
  const n = slots.value.length || 9
  if (width < 380) return 2
  const est = Math.ceil(Math.sqrt(n))
  return Math.min(Math.max(est, 2), 6) // 2..6
}

const gridStyle = computed(() => {
  const c = colsFor(gridMode.value, vw.value)
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))`,
    gap: '1rem'
  }
})

/* Idadi ya seli kwa kila mode (mobile-first) */
const countFor = (mode, width) => {
  if (mode === '1x1') return 1
  if (mode === '2x2') return 4
  if (mode === '3x3') return 9
  if (mode === '6x6') return 36
  // dynamic: mraba wa columns
  const cols = colsFor(mode, width)
  return cols * cols
}

const computedSlots = computed(() => {
  const count = countFor(gridMode.value, vw.value)
  // panua array ikiwa inahitajika
  while (slots.value.length < count) {
    slots.value.push({ occupied: false, name: '', avatar: '', mic: false, cam: false })
  }
  return Array.from({ length: count }, (_, i) => slots.value[i] || { occupied: false })
})

/* Seli min-height (mobile-first) */
const slotStyle = computed(() => ({
  minHeight: 'clamp(110px, 28vw, 190px)',  // simu → desktop
  aspectRatio: vw.value < 420 ? '1 / 1.1' : '1 / 1', // kidogo kirefu kwa simu ndogo
  willChange: 'transform, box-shadow'
}))

/* ===== Actions ===== */
function assignGuest(index) {
  const guest = guestPool[Math.floor(Math.random() * guestPool.length)]
  slots.value[index] = { ...guest, occupied: true }
  persistSoon()
}

function toggleMic(slot) {
  slot.mic = !slot.mic
  persistSoon()
}

function toggleCam(slot) {
  slot.cam = !slot.cam
  persistSoon()
}

function removeGuest(index) {
  slots.value[index] = { occupied: false, name: '', avatar: '', mic: false, cam: false }
  persistSoon()
}

function expandSlot(index) {
  // unaweza kubadilisha kuwa modal kamili au Picture-in-Picture
  alert(`🔍 Expand Guest at Slot #${index + 1}`)
}

/* Touch helper: onyesha overlay kwa tap (badala ya hover) */
let overlayTimer = null
function onCellTap(index) {
  activeCell.value = (activeCell.value === index) ? -1 : index
  clearTimeout(overlayTimer)
  overlayTimer = setTimeout(() => { activeCell.value = -1 }, 2000)
}

/* Debounced persist */
let persistId = null
function persistSoon() {
  if (persistId) cancelAnimationFrame(persistId)
  persistId = requestAnimationFrame(() => saveSlots(slots.value))
}

/* Cleanup */
onMounted(() => {
  // save mara ya kwanza (ensure schema)
  saveSlots(slots.value)
})
watch(slots, () => persistSoon(), { deep: true })
</script>

<style scoped>
/* Global card transition (GPU-friendly) */
.grid > div {
  transition: transform .25s ease, box-shadow .25s ease, background-color .25s ease, border-color .25s ease;
  will-change: transform, box-shadow;
}
.grid > div:active {
  transform: scale(.98);
}

/* Overlay transition already exists; honor reduced motion */
@media (prefers-reduced-motion: reduce){
  .grid > div,
  .transition,
  .transition-all { transition-duration: 1ms !important; }
}

/* Tiny screens polish */
@media (max-width: 360px){
  .grid > div { border-radius: 0.75rem; }
}
</style>
