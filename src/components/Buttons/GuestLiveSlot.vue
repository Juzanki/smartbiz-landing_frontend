<!-- src/components/Buttons/GuestLiveSlot.vue -->
<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[74] grid place-items-center bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="live-slots-title"
      @keydown.esc.prevent="close"
    >
      <!-- Card -->
      <div class="card">
        <!-- Header -->
        <div class="hdr">
          <div class="l">
            <h2 id="live-slots-title" class="ttl">🎛️ Live Slots</h2>
            <div class="sub">
              <span>Active: <b>{{ activeCount }}</b> / {{ maxSlots }}</span>
              <span class="dot">•</span>
              <span>Grid: {{ cols }}×{{ rows }}</span>
            </div>
          </div>
          <div class="r">
            <button class="btn-secondary h-9" @click="emit('refresh')" :disabled="busy">Refresh</button>
            <button class="btn-secondary h-9" @click="addSlot" :disabled="busy || slots.length >= maxSlots">+ Add slot</button>
            <button class="icon-btn h-9" @click="close" aria-label="Close">✖</button>
          </div>
        </div>

        <!-- Body -->
        <div
          ref="gridRef"
          class="grid"
          :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }"
          role="listbox" aria-label="Live guest slots"
          @keydown.left.prevent="move(-1)" @keydown.right.prevent="move(1)"
          @keydown.up.prevent="move(-cols)" @keydown.down.prevent="move(cols)"
          @keydown.enter.prevent="keyPrimary"
        >
          <div
            v-for="(s, i) in slots"
            :key="s.id ?? i"
            class="slot" :class="{ focused: i === focusedIndex }"
            role="option" :aria-selected="i === focusedIndex"
            @click="focusedIndex = i"
          >
            <!-- Header row -->
            <div class="slot-h">
              <div class="id">#{{ i+1 }}</div>
              <div class="badges">
                <span class="pill" :class="s.connected ? 'ok' : 'warn'">{{ s.connected ? 'online' : 'offline' }}</span>
                <span class="pill" v-if="s.bitrateKbps">🔊 {{ s.bitrateKbps }} kbps</span>
                <span class="pill" v-if="s.pingMs">📶 {{ s.pingMs }} ms</span>
              </div>
              <button class="icon-btn" @click="removeSlot(s)" :disabled="busy">🗑</button>
            </div>

            <!-- Occupant -->
            <div class="who" v-if="s.occupant">
              <img :src="s.occupant.avatar || defaultAvatar" class="avatar" alt="" />
              <div class="col">
                <div class="nm">
                  <span class="n">{{ s.occupant.name }}</span>
                  <span v-if="s.occupant.verified" class="v">✔</span>
                </div>
                <div class="meta">@{{ s.occupant.username }}</div>
              </div>
            </div>
            <div v-else class="empty">
              <div class="emoji">🧑‍💻</div>
              <div class="txt">Empty slot</div>
            </div>

            <!-- Controls -->
            <div class="ctrl">
              <button class="btn-success"  @click="assign(s)"   :disabled="busy">Assign</button>
              <button class="btn-tertiary" @click="unassign(s)" :disabled="busy || !s.occupant">Unassign</button>
              <button class="btn-secondary" @click="toggleMute(s)" :disabled="busy || !s.occupant">{{ s.muted ? 'Unmute' : 'Mute' }}</button>
              <button class="btn-secondary" @click="toggleCam(s)"  :disabled="busy || !s.occupant">{{ s.camOff ? 'Cam On' : 'Cam Off' }}</button>
            </div>

            <!-- Swap mode -->
            <div class="swap" v-if="swapFrom && swapFrom !== s.id">
              <button class="btn-primary" @click="performSwap(s)" :disabled="busy">Swap here</button>
            </div>
            <div class="swap" v-else>
              <button class="btn-secondary" @click="toggleSwap(s)" :disabled="busy || !s.occupant">
                {{ swapFrom === s.id ? 'Cancel swap' : 'Swap…' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="ftr">
          <div class="left">
            <span v-if="swapFrom" class="hint">Swap mode: choose a destination slot…</span>
            <span v-else class="hint">Tip: Use arrow keys to move, Enter to Assign.</span>
          </div>
          <div class="right">
            <button class="btn-secondary" @click="close">Close</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

/** ---------- Types ---------- */
type Person = {
  id: string | number
  name: string
  username: string
  avatar?: string
  verified?: boolean
}
type LiveSlot = {
  id?: string | number
  occupant?: Person | null
  connected?: boolean
  muted?: boolean
  camOff?: boolean
  bitrateKbps?: number
  pingMs?: number
}

/** ---------- Props / v-model ---------- */
const props = withDefaults(defineProps<{
  modelValue?: boolean
  slots?: LiveSlot[]
  maxSlots?: number
}>(), {
  modelValue: false,
  slots: () => ([]),
  maxSlots: 4,
})
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'close'): void
  (e: 'refresh'): void
  (e: 'add-slot'): void
  (e: 'remove-slot', slot: LiveSlot): void
  (e: 'assign', slot: LiveSlot): void
  (e: 'unassign', slot: LiveSlot): void
  (e: 'mute', slot: LiveSlot, value: boolean): void
  (e: 'cam', slot: LiveSlot, value: boolean): void
  (e: 'swap', a: LiveSlot, b: LiveSlot): void
}>()

const modelValue = ref(props.modelValue)
watch(() => props.modelValue, v => (modelValue.value = v))
watch(modelValue, v => emit('update:modelValue', v))

/** ---------- Local ---------- */
const defaultAvatar = '/avatars/guest.png'
const busy = ref(false)
const gridRef = ref<HTMLDivElement | null>(null)
const focusedIndex = ref(0)
const swapFrom = ref<LiveSlot['id'] | null>(null)

/** ---------- Data ---------- */
const slots = computed<LiveSlot[]>(() => props.slots.length ? props.slots : demoSlots())
const maxSlots = computed(() => props.maxSlots)
const activeCount = computed(() => slots.value.filter(s => !!s.occupant).length)

/** ---------- Layout ---------- */
const cols = computed(() => Math.min(2, Math.max(1, Math.ceil(Math.sqrt(slots.value.length || 1)))))
const rows = computed(() => Math.ceil((slots.value.length || 1) / cols.value))

/** ---------- Actions ---------- */
function close(){ modelValue.value = false; emit('close') }

function addSlot(){
  if (slots.value.length >= maxSlots.value) return
  emit('add-slot')
}
function removeSlot(s: LiveSlot){ emit('remove-slot', s) }

function assign(s: LiveSlot){ emit('assign', s) }
function unassign(s: LiveSlot){ emit('unassign', s) }

function toggleMute(s: LiveSlot){
  const v = !s.muted
  s.muted = v
  emit('mute', s, v)
}
function toggleCam(s: LiveSlot){
  const v = !s.camOff
  s.camOff = v
  emit('cam', s, v)
}

function toggleSwap(s: LiveSlot){
  swapFrom.value = swapFrom.value === s.id ? null : (s.id ?? null)
}
function performSwap(dest: LiveSlot){
  const a = slots.value.find(x => x.id === swapFrom.value)
  if (!a) return
  swapFrom.value = null
  emit('swap', a, dest)
}

/** ---------- Keyboard ---------- */
function keyPrimary(){
  const s = slots.value[focusedIndex.value]
  if (!s) return
  assign(s)
}
function move(delta: number){
  const max = slots.value.length - 1
  focusedIndex.value = Math.max(0, Math.min(max, focusedIndex.value + delta))
  nextTick(() => {
    const grid = gridRef.value
    if (!grid) return
    const el = grid.querySelectorAll<HTMLElement>('.slot')[focusedIndex.value]
    if (!el) return
    const top = el.offsetTop, bottom = top + el.offsetHeight
    const vt = grid.scrollTop, vb = vt + grid.clientHeight
    if (top < vt) grid.scrollTo({ top, behavior: 'smooth' })
    else if (bottom > vb) grid.scrollTo({ top: bottom - grid.clientHeight, behavior: 'smooth' })
  })
}

/** ---------- Demo fallback ---------- */
function demoSlots(): LiveSlot[] {
  return [
    { id: 1, occupant: null, connected:false, muted:false, camOff:false },
    { id: 2, occupant: null, connected:false, muted:false, camOff:false },
  ]
}
</script>

<style scoped>
.card{
  width: min(92vw, 900px);
  max-height: 88vh;
  display:flex; flex-direction:column;
  color:#fff;
  background: linear-gradient(180deg, rgba(2,6,23,.92), rgba(0,0,0,.9));
  border:1px solid rgba(255,255,255,.1);
  border-radius:1rem;
  box-shadow:0 20px 80px rgba(0,0,0,.5);
}

/* Header */
.hdr{ display:flex; align-items:center; justify-content:space-between; padding:.75rem 1rem; border-bottom:1px solid rgba(255,255,255,.1) }
.ttl{ font-weight:800; font-size:1.05rem }
.sub{ font-size:.8rem; color:rgba(255,255,255,.75); display:flex; gap:.4rem; align-items:center }
.dot{ opacity:.6 }

/* Grid */
.grid{
  padding: .75rem;
  display:grid; gap:.75rem;
  overflow:auto; max-height: 60vh;
}
.slot{
  background: rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  border-radius:.9rem; padding:.6rem; display:flex; flex-direction:column; gap:.5rem;
}
.slot.focused{ outline:2px solid rgba(59,130,246,.6) }
.slot-h{ display:flex; align-items:center; justify-content:space-between; gap:.6rem }
.id{ font-weight:700; color:#e5e7eb }
.badges{ display:flex; gap:.35rem; align-items:center; flex-wrap:wrap }
.pill{ font-size:11px; padding:.15rem .45rem; border-radius:.55rem; background:rgba(148,163,184,.2); color:#e5e7eb }
.pill.ok{ background: rgba(16,185,129,.18); color:#86efac }
.pill.warn{ background: rgba(244,63,94,.18); color:#fda4af }

.who{ display:flex; gap:.6rem; align-items:center; min-width:0 }
.avatar{ width:40px; height:40px; border-radius:999px; object-fit:cover; border:2px solid rgba(255,255,255,.4) }
.col{ min-width:0 }
.nm{ display:flex; gap:.25rem; align-items:center }
.n{ font-weight:700 }
.v{ color:#fde68a }
.meta{ font-size:12px; color:rgba(255,255,255,.7) }

.empty{ text-align:center; padding:.5rem 0; color:#fff }
.emoji{ font-size:28px }
.txt{ color:rgba(255,255,255,.75) }

.ctrl{ display:flex; flex-wrap:wrap; gap:.35rem; }
.swap{ display:flex; justify-content:flex-end; }

/* Footer */
.ftr{
  padding:.65rem 1rem; border-top:1px solid rgba(255,255,255,.1);
  display:flex; align-items:center; justify-content:space-between;
}
.hint{ font-size:12px; color:rgba(255,255,255,.75) }

/* Buttons */
.icon-btn{
  background: rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
  color:#fff; border-radius:.65rem; padding:.28rem .55rem;
}
.btn-secondary{
  background: rgba(255,255,255,.08);
  color:#fff; border:1px solid rgba(255,255,255,.12);
  padding:.45rem .7rem; border-radius:.7rem; font-size:12px;
}
.btn-tertiary{
  background: rgba(148,163,184,.18); color:#e5e7eb;
  padding:.38rem .6rem; border-radius:.6rem; font-size:12px
}
.btn-success{
  background: rgba(16,185,129,.15); color:#86efac;
  padding:.38rem .6rem; border-radius:.6rem; font-size:12px
}
.btn-primary{
  background: linear-gradient(135deg,#22c55e,#16a34a);
  color:#fff; padding:.48rem .9rem; border-radius:.75rem;
  font-weight:700; font-size:12px;
}
</style>
