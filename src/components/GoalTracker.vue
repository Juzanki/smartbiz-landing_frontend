<!-- src/components/GoalTracker.vue -->
<template>
  <div
    class="min-h-[100svh] bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white"
    :style="{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }"
  >
    <!-- Header -->
    <header
      class="sticky top-0 z-20 bg-gradient-to-b from-[#0f172a]/90 to-[#0f172a]/60 backdrop-blur-lg border-b border-cyan-800/40"
      :style="{ paddingTop: 'max(.5rem, env(safe-area-inset-top))' }"
      role="search"
    >
      <div class="max-w-xl mx-auto px-4 pt-2 pb-3">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-cyan-300">🎯 Goals</h1>
          <span class="text-xs text-white/70">{{ prettyCount }} total</span>
        </div>

        <!-- Search -->
        <div class="relative mt-2">
          <input
            v-model="q"
            type="search"
            inputmode="search"
            autocomplete="off"
            placeholder="Search goals…"
            class="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Search goals"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">🔎</span>
        </div>

        <!-- Filters -->
        <div class="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button class="chip" :class="{ 'chip-active': filter==='all' }" @click="setFilter('all')">All</button>
          <button class="chip" :class="{ 'chip-active': filter==='active' }" @click="setFilter('active')">Active</button>
          <button class="chip" :class="{ 'chip-active': filter==='completed' }" @click="setFilter('completed')">Completed</button>
          <button class="chip" :class="{ 'chip-active': filter==='soon' }" @click="setFilter('soon')">Due soon</button>

          <div class="relative ml-auto">
            <button class="chip" @click="sortOpen=!sortOpen" :aria-expanded="String(sortOpen)">{{ sortLabel }}</button>
            <div v-if="sortOpen" class="menu" v-click-outside="() => sortOpen=false">
              <button class="menu-item" @click="setSort('recent')">Recent</button>
              <button class="menu-item" @click="setSort('due')">Due date</button>
              <button class="menu-item" @click="setSort('progress')">Progress</button>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          <div class="stat">
            <p class="text-white/70">Active</p><p class="text-cyan-300 font-semibold">{{ stats.active }}</p>
          </div>
          <div class="stat">
            <p class="text-white/70">Completed</p><p class="text-emerald-300 font-semibold">{{ stats.completed }}</p>
          </div>
          <div class="stat">
            <p class="text-white/70">Avg. Progress</p><p class="text-amber-300 font-semibold">{{ stats.avg }}%</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Body -->
    <main class="max-w-xl mx-auto px-4 py-4">
      <!-- Loading skeletons -->
      <div v-if="loading" class="space-y-3">
        <SkeletonRow v-for="i in 5" :key="i" />
      </div>

      <!-- List -->
      <div v-else class="space-y-3" role="list" aria-label="Goals list">
        <article
          v-for="g in visible"
          :key="g.id"
          role="listitem"
          class="group bg-[#0f172a]/60 p-3 rounded-xl border border-cyan-700/50 shadow-sm hover:shadow-lg transition"
          @touchstart.passive="startPress(g)"
          @touchend.passive="endPress"
        >
          <div class="flex items-center gap-3">
            <!-- Progress ring -->
            <div
              class="w-12 h-12 rounded-full grid place-items-center text-xs font-semibold ring-2 ring-cyan-500/30"
              :style="{ background: ring(g.progress) }"
              aria-label="Progress"
              :aria-valuenow="g.progress" aria-valuemin="0" aria-valuemax="100" role="progressbar"
            >
              <span class="drop-shadow">{{ g.progress }}%</span>
            </div>

            <!-- Title & meta -->
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">
                {{ g.title }}
                <span v-if="g.favorite" class="ml-1">💖</span>
                <span v-if="g.completed" class="ml-1 text-emerald-300">✓</span>
              </p>
              <p class="text-[12px] text-white/70 truncate">
                {{ g.category }} · {{ g.current }}/{{ g.target }} {{ g.unit }}
              </p>
            </div>

            <!-- Quick actions (desktop) -->
            <div class="hidden sm:flex items-center gap-1">
              <button class="icon-btn" :title="g.completed ? 'Mark active' : 'Mark done'" @click="toggleComplete(g)">{{ g.completed ? '↺' : '✓' }}</button>
              <button class="icon-btn" title="Favorite" @click="toggleFav(g)">💖</button>
              <button class="icon-btn" title="More" @click="openSheet(g)">⋯</button>
            </div>

            <!-- Mobile open sheet -->
            <button class="icon-btn sm:hidden" aria-label="More" @click="openSheet(g)">⋯</button>
          </div>

          <!-- Linear progress -->
          <div class="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" :style="{ width: g.progress + '%' }"></div>
          </div>

          <!-- Footer: due + quick +1 -->
          <div class="mt-3 flex items-center gap-2 text-[12px]">
            <span class="text-white/60">
              {{ g.completed ? 'Completed' : (g.due ? ('Due ' + relative(g.due)) : 'No due date') }}
            </span>
            <span v-if="g.priority" class="ml-1 px-2 py-0.5 rounded-full border border-white/10 bg-white/10">{{ g.priority }}</span>
            <button class="ml-auto btn-cyan text-xs px-2 py-1" @click="increment(g)">+1 {{ g.unit }}</button>
          </div>
        </article>

        <p v-if="!visible.length" class="text-center text-white/70 text-sm pt-10">No goals match your filters.</p>

        <!-- Infinite scroll sentinel -->
        <div ref="sentinel" class="h-8 grid place-items-center">
          <span v-if="moreLoading" class="text-white/60 text-sm">Loading…</span>
        </div>
      </div>
    </main>

    <!-- FAB -->
    <button
      class="fixed right-4 bottom-5 bg-pink-500 hover:bg-pink-400 text-white rounded-full w-14 h-14 shadow-2xl grid place-items-center text-2xl"
      :style="{ marginBottom: 'max(0px, env(safe-area-inset-bottom))' }"
      aria-label="Add goal"
      @click="openSheet()"
    >＋</button>

    <!-- Bottom Sheet: Add/Edit -->
    <div v-if="sheet.open" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" @click.self="closeSheet" role="dialog" aria-modal="true">
      <div
        class="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-xl mx-auto bg-[#0f172a] border-t border-cyan-800 rounded-t-2xl p-4"
        :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
      >
        <div class="h-1 w-10 bg-white/20 rounded-full mx-auto mb-3"></div>
        <h3 class="text-lg font-semibold text-cyan-300 mb-2">{{ editing ? 'Edit Goal' : 'New Goal' }}</h3>

        <form @submit.prevent="save" class="space-y-3">
          <input v-model.trim="form.title" type="text" placeholder="Goal title *" class="input" required />
          <div class="grid grid-cols-2 gap-2">
            <input v-model.trim="form.category" type="text" placeholder="Category" class="input" />
            <select v-model="form.priority" class="input">
              <option value="">Priority</option>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <input v-model.number="form.current" type="number" min="0" placeholder="Current" class="input" />
            <input v-model.number="form.target" type="number" min="1" placeholder="Target *" class="input" required />
            <input v-model.trim="form.unit" type="text" placeholder="Unit" class="input" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input v-model="form.due" type="date" class="input" />
            <label class="flex items-center gap-2 text-sm text-white/80">
              <input v-model="form.favorite" type="checkbox" class="accent-pink-500">
              Favorite
            </label>
          </div>

          <div class="flex items-center justify-between gap-2 mt-2">
            <button type="button" class="btn-dark" @click="closeSheet">Cancel</button>
            <div class="flex items-center gap-2">
              <button v-if="editing" type="button" class="btn-danger" @click="remove(form.id)">Delete</button>
              <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : (editing ? 'Update' : 'Create') }}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, defineComponent, h } from 'vue'

/* ----- Local directive: click-outside ----- */
const vClickOutside = {
  mounted(el: HTMLElement, binding: { value: (e: Event)=>void }) {
    const handler = (e: Event) => { if (!el.contains(e.target as Node)) binding.value(e) }
    ;(el as any).__co__ = handler
    document.addEventListener('mousedown', handler, true)
    document.addEventListener('touchstart', handler, true)
  },
  unmounted(el: HTMLElement) {
    const handler = (el as any).__co__
    document.removeEventListener('mousedown', handler, true)
    document.removeEventListener('touchstart', handler, true)
  }
}

/* ----- Skeleton component (inline) ----- */
export const SkeletonRow = defineComponent({
  name: 'SkeletonRow',
  setup(){
    return () => h('div', { class:'skel' }, [
      h('div', { class:'flex items-center gap-3' }, [
        h('div', { class:'w-12 h-12 rounded-full skel-bar' }),
        h('div', { class:'flex-1' }, [
          h('div', { class:'h-3 w-40 rounded skel-bar mb-2' }),
          h('div', { class:'h-3 w-24 rounded skel-bar' })
        ]),
        h('div', { class:'h-8 w-8 rounded-full skel-bar' })
      ]),
      h('div', { class:'h-2 w-full rounded skel-bar mt-3' })
    ])
  }
})

/* ----- State ----- */
const loading = ref(true)
const moreLoading = ref(false)
const saving = ref(false)

const q = ref('')
const filter = ref<'all'|'active'|'completed'|'soon'>('all')
const sortBy = ref<'recent'|'due'|'progress'>('recent')
const sortOpen = ref(false)

type Goal = {
  id: string
  title: string
  category?: string
  priority?: string
  current: number
  target: number
  unit?: string
  due?: string
  favorite?: boolean
  completed?: boolean
  updatedAt?: number
  progress?: number
}
const all = ref<Goal[]>([])
const list = ref<Goal[]>([])
const page = ref(1)
const pageSize = 10
const sentinel = ref<HTMLElement|null>(null)
let io: IntersectionObserver | null = null

/* ----- Sheet & form ----- */
const sheet = reactive({ open:false })
const editing = ref(false)
const form = reactive<Goal>({
  id: '' as any, title: '', category: '', priority: '',
  current: 0, target: 1, unit: '', due: '', favorite: false, completed: false,
})

/* ----- Persistence ----- */
const KEY = 'goals:v1'
function loadPersisted(){
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) all.value = JSON.parse(raw)
    else seed()
  } catch { seed() }
}
function persist(){ try { localStorage.setItem(KEY, JSON.stringify(all.value)) } catch {} }
watch(all, persist, { deep:true })

/* ----- Derived stats ----- */
const stats = computed(()=>{
  const active = all.value.filter(g=> !g.completed).length
  const completed = all.value.filter(g=> g.completed).length
  const avg = all.value.length ? Math.round(all.value.reduce((s,g)=> s + (g.progress||0), 0)/all.value.length) : 0
  return { active, completed, avg }
})
const prettyCount = computed(()=> (all.value.length).toLocaleString?.() ?? String(all.value.length))
const sortLabel = computed(()=> sortBy.value==='recent' ? 'Recent' : sortBy.value==='due' ? 'Due date' : 'Progress')

/* ----- Computed pipeline ----- */
const filteredBase = computed<Goal[]>(()=>{
  const derived = all.value.map(g => ({ ...g, progress: clamp(Math.round((g.current / Math.max(1,g.target))*100), 0, 100) }))
  let v = derived
  if (q.value) {
    const s = q.value.toLowerCase()
    v = v.filter(g => g.title.toLowerCase().includes(s) || (g.category||'').toLowerCase().includes(s))
  }
  if (filter.value==='active') v = v.filter(g => !g.completed)
  if (filter.value==='completed') v = v.filter(g => g.completed)
  if (filter.value==='soon') {
    const in7 = Date.now() + 7*24*3600*1000
    v = v.filter(g => !g.completed && g.due && new Date(g.due).getTime() <= in7)
  }
  if (sortBy.value==='recent') v.sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0))
  else if (sortBy.value==='due') v.sort((a,b)=> (a.due?new Date(a.due).getTime():Infinity) - (b.due?new Date(b.due).getTime():Infinity))
  else if (sortBy.value==='progress') v.sort((a,b)=> (b.progress||0) - (a.progress||0))
  v.sort((a,b)=> Number(b.favorite) - Number(a.favorite))
  return v
})
const visible = computed(()=> list.value)

/* ----- Actions ----- */
function setFilter(f: typeof filter.value){ filter.value = f; vibrate(6); paginate(true) }
function setSort(s: typeof sortBy.value){ sortBy.value = s; sortOpen.value = false; vibrate(6); paginate(true) }

function openSheet(goal: Goal|null = null){
  editing.value = !!goal
  sheet.open = true
  if (goal) Object.assign(form, { ...goal })
  else Object.assign(form, { id: '' as any, title:'', category:'', priority:'', current:0, target:1, unit:'', due:'', favorite:false, completed:false })
  setTimeout(()=> (document.querySelector('.input') as HTMLInputElement | null)?.focus?.(), 30)
}
function closeSheet(){ sheet.open = false }

function save(){
  if (!form.title || !form.target) return
  saving.value = true
  setTimeout(()=> {
    if (editing.value) {
      const idx = all.value.findIndex(g=> g.id===form.id)
      if (idx>=0) all.value[idx] = { ...all.value[idx], ...form, updatedAt: Date.now() }
    } else {
      const id = `g_${Math.random().toString(36).slice(2,8)}`
      all.value.unshift({ ...form, id, updatedAt: Date.now() })
    }
    saving.value = false
    sheet.open = false
    vibrate(10)
    paginate(true)
  }, 380)
}
function remove(id: string){
  const idx = all.value.findIndex(g=> g.id===id)
  if (idx>=0) all.value.splice(idx,1)
  sheet.open = false
  vibrate(12)
  paginate(true)
}

function increment(g: Goal){
  if (g.completed) return
  g.current = (g.current||0) + 1
  g.updatedAt = Date.now()
  if (g.current >= g.target) g.completed = true
  vibrate(8)
}
function toggleFav(g: Goal){ g.favorite = !g.favorite; g.updatedAt = Date.now(); vibrate(6) }
function toggleComplete(g: Goal){ g.completed = !g.completed; g.updatedAt = Date.now(); vibrate(8) }

/* Long-press complete */
let pressTimer: number | null = null
function startPress(g: Goal){ if (pressTimer) clearTimeout(pressTimer); pressTimer = window.setTimeout(()=> { g.completed = true; g.updatedAt = Date.now(); vibrate(12) }, 500) as any }
function endPress(){ if (pressTimer) { clearTimeout(pressTimer); pressTimer = null } }

/* ----- Infinite scroll ----- */
async function paginate(reset=false){
  if (reset){ list.value = []; page.value = 1 }
  const start = (page.value-1)*pageSize
  const next = filteredBase.value.slice(start, start+pageSize)
  list.value.push(...next)
  page.value++
}
function mountIO(){
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if (e.isIntersecting && !moreLoading.value && !loading.value){
        moreLoading.value = true
        setTimeout(()=> { paginate(); moreLoading.value = false }, 300)
      }
    })
  }, { rootMargin: '420px 0px' })
  if (sentinel.value) io.observe(sentinel.value)
}
function unmountIO(){ try{ io?.disconnect() }catch{} }

/* ----- Utils ----- */
function ring(p:number){ return `conic-gradient(#22d3ee ${p*3.6}deg, rgba(255,255,255,.08) 0)` }
function clamp(n:number, a:number, b:number){ return Math.max(a, Math.min(b, n)) }
function relative(d?:string){
  if (!d) return '—'
  const ts = new Date(d).getTime()
  const diff = Math.floor((ts - Date.now())/1000)
  const ad = Math.abs(diff)
  if (ad < 60) return diff >= 0 ? 'soon' : `${ad}s ago`
  const m = Math.floor(ad/60); if (m<60) return diff>=0 ? `in ${m}m` : `${m}m ago`
  const h = Math.floor(m/60); if (h<24) return diff>=0 ? `in ${h}h` : `${h}h ago`
  const dd = Math.floor(h/24); return diff>=0 ? `in ${dd}d` : `${dd}d ago`
}
function vibrate(ms:number){ try{ navigator.vibrate?.(ms) }catch{} }

/* ----- Seed & lifecycle ----- */
function seed(){
  const now = Date.now()
  all.value = [
    { id:'g_1', title:'Read 30 pages', category:'Learning', priority:'Medium', current:10, target:30, unit:'pages', due: new Date(now+3*864e5).toISOString().slice(0,10), favorite:true,  completed:false, updatedAt:now-3600e3 },
    { id:'g_2', title:'Run 20 km',     category:'Fitness',  priority:'High',   current:12, target:20, unit:'km',    due: new Date(now+6*864e5).toISOString().slice(0,10), favorite:false, completed:false, updatedAt:now-5400e3 },
    { id:'g_3', title:'Ship v1 MVP',   category:'Work',     priority:'High',   current:1,  target:4,  unit:'milestones', due: new Date(now+12*864e5).toISOString().slice(0,10), favorite:false, completed:false, updatedAt:now-9200e3 },
    { id:'g_4', title:'Drink water',   category:'Health',   priority:'Low',    current:7,  target:8,  unit:'glasses', due:'', favorite:false, completed:false, updatedAt:now-1800e3 },
    { id:'g_5', title:'Meditate',      category:'Mind',     priority:'Medium', current:30, target:30, unit:'mins',   due:'', favorite:true,  completed:true,  updatedAt:now-7200e3 },
  ]
}
onMounted(()=>{
  loadPersisted()
  loading.value = false
  paginate(true)
  mountIO()
})
onBeforeUnmount(unmountIO)
</script>

<style scoped>
/* Controls */
.chip{ @apply px-3 py-1 rounded-full text-xs bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.chip-active{ @apply bg-cyan-600 text-[#0b1324] border-cyan-500; }
.menu{ @apply absolute right-0 mt-1 bg-[#0f172a] border border-cyan-800 rounded-xl shadow-xl p-1 z-10; }
.menu-item{ @apply w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10; }

/* Buttons */
.icon-btn{ @apply w-9 h-9 rounded-full grid place-items-center bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.btn-cyan{ @apply bg-cyan-600 hover:bg-cyan-500 text-white rounded-full transition; }
.btn-dark{ @apply bg-gray-700 hover:bg-gray-600 text-white rounded-md transition px-3 py-1.5; }
.btn-danger{ @apply bg-rose-600 hover:bg-rose-500 text-white rounded-md transition px-3 py-1.5; }
.btn-primary{ @apply bg-pink-500 hover:bg-pink-400 text-white font-semibold rounded-xl px-4 py-2 transition disabled:opacity-60; }

/* Inputs */
.input{ @apply w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-white/60; }

/* Stats */
.stat{ @apply bg-white/10 border border-white/10 rounded-xl px-3 py-2; }

/* Skeleton */
.skel{ @apply bg-[#0f172a]/60 p-3 rounded-xl border border-cyan-700/50; }
.skel-bar{
  background: linear-gradient(110deg, rgba(255,255,255,.1) 8%, rgba(255,255,255,.04) 18%, rgba(255,255,255,.1) 33%);
  background-size: 200% 100%; animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer { to { background-position-x: -200% } }

/* Utilities */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
</style>
