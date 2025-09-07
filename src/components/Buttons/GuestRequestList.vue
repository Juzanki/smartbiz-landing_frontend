<!-- src/components/Buttons/GuestRequestList.vue -->
<template>
  <!-- Modal wrapper -->
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[72] grid place-items-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-requests-title"
      @keydown.esc.prevent="close"
    >
      <!-- Card -->
      <div
        class="pointer-events-auto w-[min(92vw,900px)] max-h-[88vh] rounded-2xl border border-white/10
               bg-gradient-to-b from-slate-900/80 to-black/80 shadow-2xl flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center gap-2 justify-between px-4 py-3 border-b border-white/10">
          <div class="flex items-center gap-3">
            <h2 id="guest-requests-title" class="text-white font-bold text-lg">👥 Guest Requests</h2>

            <!-- Tabs / filters -->
            <div class="hidden md:flex items-center gap-1">
              <button
                v-for="t in tabs"
                :key="t.key"
                class="tab"
                :class="{ active: statusFilter === t.key }"
                @click="statusFilter = t.key"
                type="button"
              >
                {{ t.label }}
                <span class="count">{{ counts[t.key] ?? 0 }}</span>
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Search -->
            <div class="relative">
              <input
                v-model.trim="q"
                type="search"
                class="inp h-9 pl-8 w-[220px]"
                placeholder="Search name or @handle…"
                @keydown.down.prevent="focusFirst()"
              />
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
            </div>

            <!-- Close -->
            <button class="icon-btn" @click="close" aria-label="Close">✖</button>
          </div>
        </div>

        <!-- Bulk bar -->
        <div class="px-4 py-2 border-b border-white/10 flex items-center justify-between text-white/90">
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-2 select-none cursor-pointer">
              <input type="checkbox" class="chk" :checked="allVisibleSelected" @change="toggleSelectAll" />
              <span class="text-sm">Select <b>{{ selectedIds.size }}</b> / {{ filtered.length }}</span>
            </label>

            <div class="hidden sm:flex items-center gap-1">
              <button class="btn-secondary" :disabled="!selectedIds.size" @click="acceptMany">Accept selected</button>
              <button class="btn-secondary" :disabled="!selectedIds.size" @click="declineMany">Decline selected</button>
              <button class="btn-secondary" :disabled="!selectedIds.size" @click="blockMany">Block selected</button>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button class="btn-secondary" @click="refresh" :disabled="busy">Refresh</button>
            <button class="btn-primary"   @click="acceptAllPending" :disabled="!counts.pending">Accept all pending</button>
          </div>
        </div>

        <!-- List -->
        <div
          ref="listRef"
          class="flex-1 overflow-auto px-2 py-2 space-y-2"
          role="listbox"
          aria-label="Guest requests list"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="triggerFocusedPrimary"
        >
          <template v-if="filtered.length">
            <div
              v-for="(r, i) in filtered"
              :key="r.id"
              class="row"
              :class="{ focused: i === focusedIndex }"
              role="option"
              :aria-selected="i === focusedIndex"
              @click="focusedIndex = i"
            >
              <div class="left">
                <input type="checkbox" class="chk" :checked="selectedIds.has(r.id)" @change="toggleSelect(r.id)" />
                <img :src="r.avatar || defaultAvatar" alt="" class="avatar" />
                <div class="who">
                  <div class="name">
                    <span class="text-white font-semibold truncate">{{ r.name }}</span>
                    <span v-if="r.verified" class="ml-1 text-yellow-300">✔</span>
                  </div>
                  <div class="meta">@{{ r.username }} • {{ timeAgo(r.ts) }}</div>
                  <div v-if="r.message" class="msg" :title="r.message">{{ r.message }}</div>
                </div>
              </div>

              <div class="right">
                <span class="badge" :class="badgeClass(r.status)">{{ r.status }}</span>
                <div class="actions">
                  <button class="btn-success"  :disabled="busy" @click="acceptOne(r)">Accept</button>
                  <button class="btn-danger"   :disabled="busy" @click="declineOne(r)">Decline</button>
                  <button class="btn-tertiary" :disabled="busy" @click="blockOne(r)">Block</button>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="empty">
            <div class="text-3xl mb-2">🫶</div>
            <div class="text-white/80">No matching requests</div>
            <div class="text-white/50 text-sm">Try another filter or clear search.</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t border-white/10 flex items-center justify-between text-white/80">
          <div class="text-xs">
            Showing <b>{{ filtered.length }}</b> of <b>{{ items.length }}</b> requests
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-secondary" @click="close">Close</button>
            <button class="btn-primary" :disabled="!selectedIds.size" @click="acceptMany">Accept selected</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'

/** ---------- Types ---------- */
type Status = 'pending' | 'accepted' | 'declined' | 'blocked'
type GuestRequest = {
  id: string | number
  name: string
  username: string
  avatar?: string
  verified?: boolean
  message?: string
  ts: number     // timestamp
  status: Status // default: 'pending'
}

/** ---------- Props / v-model ---------- */
const props = withDefaults(defineProps<{
  modelValue?: boolean
  items?: GuestRequest[]
}>(), {
  modelValue: false,
  items: () => [],
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'close'): void
  (e: 'refresh'): void
  (e: 'accept', item: GuestRequest): void
  (e: 'decline', item: GuestRequest): void
  (e: 'block', item: GuestRequest): void
  (e: 'accept-many', ids: Array<GuestRequest['id']>): void
  (e: 'decline-many', ids: Array<GuestRequest['id']>): void
  (e: 'block-many', ids: Array<GuestRequest['id']>): void
}>()

const modelValue = ref(props.modelValue)
watch(() => props.modelValue, v => modelValue.value = v)
watch(modelValue, v => emit('update:modelValue', v))

/** ---------- Local state ---------- */
const q = ref('')
const statusFilter = ref<'all' | Status>('all')
const selectedIds = reactive(new Set<GuestRequest['id']>())
const focusedIndex = ref(0)
const busy = ref(false)
const listRef = ref<HTMLDivElement | null>(null)
const defaultAvatar = '/avatars/guest.png'

/** ---------- Tabs ---------- */
const tabs = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'blocked',  label: 'Blocked' },
] as const

/** ---------- Derived ---------- */
const items = computed<GuestRequest[]>(() =>
  props.items.length ? props.items : demoItems()
)

const filtered = computed(() => {
  const term = q.value.toLowerCase()
  return items.value.filter(r => {
    if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
    if (!term) return true
    return r.name.toLowerCase().includes(term) || r.username.toLowerCase().includes(term)
  })
})

const counts = computed<Record<'all' | Status, number>>(() => {
  const c = { all: items.value.length, pending: 0, accepted: 0, declined: 0, blocked: 0 }
  for (const r of items.value) (c as any)[r.status]++
  return c
})

const allVisibleSelected = computed(() =>
  filtered.value.length > 0 && filtered.value.every(r => selectedIds.has(r.id))
)

/** ---------- Actions ---------- */
function close(){ modelValue.value = false; emit('close') }
function refresh(){ emit('refresh') }

function toggleSelect(id: GuestRequest['id']){
  selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id)
}
function toggleSelectAll(){
  if (allVisibleSelected.value) {
    for (const r of filtered.value) selectedIds.delete(r.id)
  } else {
    for (const r of filtered.value) selectedIds.add(r.id)
  }
}

function acceptOne(r: GuestRequest){ runAsync(() => { r.status = 'accepted'; emit('accept', r) }) }
function declineOne(r: GuestRequest){ runAsync(() => { r.status = 'declined'; emit('decline', r) }) }
function blockOne(r: GuestRequest){ runAsync(() => { r.status = 'blocked';  emit('block', r) }) }

function acceptMany(){
  const ids = Array.from(selectedIds)
  if (!ids.length) return
  runAsync(() => {
    for (const r of items.value) if (selectedIds.has(r.id)) r.status = 'accepted'
    emit('accept-many', ids)
    selectedIds.clear()
  })
}
function declineMany(){
  const ids = Array.from(selectedIds)
  if (!ids.length) return
  runAsync(() => {
    for (const r of items.value) if (selectedIds.has(r.id)) r.status = 'declined'
    emit('decline-many', ids)
    selectedIds.clear()
  })
}
function blockMany(){
  const ids = Array.from(selectedIds)
  if (!ids.length) return
  runAsync(() => {
    for (const r of items.value) if (selectedIds.has(r.id)) r.status = 'blocked'
    emit('block-many', ids)
    selectedIds.clear()
  })
}

function acceptAllPending(){
  const ids = items.value.filter(r => r.status === 'pending').map(r => r.id)
  if (!ids.length) return
  runAsync(() => {
    for (const r of items.value) if (r.status === 'pending') r.status = 'accepted'
    emit('accept-many', ids)
  })
}

/** ---------- Keyboard helpers ---------- */
function move(delta: 1 | -1){
  if (!filtered.value.length) return
  focusedIndex.value = clamp(focusedIndex.value + delta, 0, filtered.value.length - 1)
  nextTick(() => scrollFocusedIntoView())
}
function focusFirst(){ focusedIndex.value = 0; nextTick(scrollFocusedIntoView) }
function triggerFocusedPrimary(){
  const r = filtered.value[focusedIndex.value]
  if (r) acceptOne(r)
}
function scrollFocusedIntoView(){
  const list = listRef.value
  if (!list) return
  const row = list.querySelectorAll<HTMLElement>('.row')[focusedIndex.value]
  if (!row) return
  const top = row.offsetTop
  const bottom = top + row.offsetHeight
  const viewTop = list.scrollTop
  const viewBottom = viewTop + list.clientHeight
  if (top < viewTop) list.scrollTo({ top, behavior: 'smooth' })
  else if (bottom > viewBottom) list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' })
}

/** ---------- Utils ---------- */
function timeAgo(ts: number){
  const d = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (d < 60) return d + 's'
  const m = Math.floor(d/60); if (m < 60) return m + 'm'
  const h = Math.floor(m/60); if (h < 24) return h + 'h'
  const day = Math.floor(h/24); return day + 'd'
}
function badgeClass(s: Status){
  if (s === 'accepted') return 'bg-emerald-500/20 text-emerald-300'
  if (s === 'declined') return 'bg-rose-500/20 text-rose-300'
  if (s === 'blocked')  return 'bg-gray-500/30 text-gray-200'
  return 'bg-amber-500/20 text-amber-300'
}
function clamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)) }
function runAsync(cb: () => void){
  busy.value = true
  setTimeout(() => { try { cb() } finally { busy.value = false } }, 350) // simulate async
}

/** ---------- Demo data (fallback) ---------- */
function demoItems(): GuestRequest[] {
  const now = Date.now()
  return [
    { id: 1, name: 'Sara Kim', username: 'sarak', verified: true,  ts: now-25_000, message:'Can I join to demo?', status:'pending' },
    { id: 2, name: 'Mo Bali',  username: 'mob',                  ts: now-140_000, message:'I have a tip for you', status:'pending' },
    { id: 3, name: 'Drex On',  username: 'drex',                 ts: now-400_000, status:'accepted' },
    { id: 4, name: 'Ayo',      username: 'ayolive',              ts: now-1_800_000, status:'declined' },
  ]
}

/** ---------- Expose (optional) ---------- */
defineExpose({
  open(){ modelValue.value = true },
  close,
  select(ids: Array<GuestRequest['id']>){ for (const id of ids) selectedIds.add(id) },
})
</script>

<style scoped>
.inp{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: .75rem;
  padding: .35rem .6rem;
  color: #fff;
  outline: none;
}
.inp::placeholder { color: rgba(255,255,255,.5) }
.inp:focus { box-shadow: 0 0 0 2px rgba(59,130,246,.6) }

.icon-btn{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  color: #fff;
  border-radius: .65rem;
  padding: .4rem .6rem;
}

.tab{
  font-size: 12px; color:#fff;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  padding: .35rem .55rem;
  border-radius: .65rem;
  display: inline-flex; align-items: center; gap: .4rem;
}
.tab.active{ background: linear-gradient(135deg,#06b6d4,#a855f7); border-color: rgba(255,255,255,.25) }
.count{ background: rgba(0,0,0,.25); padding: 0 .4rem; border-radius: .5rem; font-weight: 700 }

.chk { width: 16px; height: 16px }

.btn-secondary{
  background: rgba(255,255,255,.08);
  color:#fff; border: 1px solid rgba(255,255,255,.12);
  padding: .45rem .7rem; border-radius: .7rem; font-size: 12px;
}
.btn-primary{
  background: linear-gradient(135deg,#22c55e,#16a34a);
  color:#fff; padding: .48rem .8rem; border-radius: .7rem; font-weight: 700; font-size: 12px;
}
.btn-success{ background: rgba(16,185,129,.15); color:#86efac; padding:.38rem .6rem; border-radius:.6rem; font-size:12px }
.btn-danger { background: rgba(244,63,94,.15);  color:#fda4af; padding:.38rem .6rem; border-radius:.6rem; font-size:12px }
.btn-tertiary{ background: rgba(148,163,184,.18); color:#e5e7eb; padding:.38rem .6rem; border-radius:.6rem; font-size:12px }

.row{
  display: flex; align-items: center; justify-content: space-between;
  gap: .75rem; padding: .5rem .6rem;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: .9rem; color: #fff;
}
.row.focused{ outline: 2px solid rgba(59,130,246,.6) }

.left{ display: flex; align-items: center; gap: .6rem; min-width: 0 }
.right{ display: flex; align-items: center; gap: .75rem; }

.avatar{ width: 36px; height: 36px; border-radius: 999px; object-fit: cover; border: 2px solid rgba(255,255,255,.4) }
.who{ min-width: 0 }
.name{ display: flex; align-items: center; gap: .25rem }
.meta{ font-size: 11px; color: rgba(255,255,255,.6) }
.msg{ font-size: 12px; color: rgba(255,255,255,.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50vw }

.badge{
  border-radius: .6rem; padding: .2rem .45rem; font-size: 11px; text-transform: capitalize;
}

.empty{ text-align: center; padding: 4rem 1rem; color: #fff }
.actions{ display: flex; align-items: center; gap: .4rem; }
</style>
