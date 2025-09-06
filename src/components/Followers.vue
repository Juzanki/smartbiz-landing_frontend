<!-- src/components/FollowersMobileUltra.vue -->
<template>
  <div
    class="min-h-[100svh] bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white"
    @touchstart.passive="ptrStart"
    @touchmove.passive="ptrMove"
    @touchend.passive="ptrEnd"
  >
    <!-- Offline banner -->
    <div v-if="!online" class="sticky top-0 z-30 w-full bg-amber-500/15 text-amber-200 text-xs px-3 py-2 text-center">
      You’re offline. Viewing cached data.
    </div>

    <!-- Pull-to-refresh indicator -->
    <div class="ptr-indicator" :style="{ height: `${Math.max(0, ptr.delta)}px`, opacity: ptr.delta>0 ? 1:0 }">
      <span class="ptr-spinner" :class="{ spin: ptr.state==='loading' }"></span>
      <span class="ml-2 text-xs">
        {{ ptr.state==='ready' ? 'Release to refresh' : ptr.state==='loading' ? 'Refreshing…' : 'Pull to refresh' }}
      </span>
    </div>

    <!-- Header / Search / Filters -->
    <header
      class="sticky top-0 z-20 bg-gradient-to-b from-[#0f172a]/90 to-[#0f172a]/60 backdrop-blur-lg border-b border-cyan-800/40"
      :style="{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }"
      role="search"
    >
      <div class="max-w-xl mx-auto px-3 pt-2 pb-3">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-2xl font-bold text-cyan-300">👥 Your Followers</h1>
          <div class="flex items-center gap-2">
            <button class="chip" @click="exportCSV" :disabled="selectedCount===0" title="Export selected to CSV">
              Export
            </button>
            <button class="chip" :class="{ 'chip-active': selectMode }" @click="toggleSelectMode" aria-pressed="selectMode">
              {{ selectMode ? `Done (${selectedCount})` : 'Select' }}
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              v-model.trim="q"
              type="search"
              inputmode="search"
              autocomplete="off"
              placeholder="Search by name or @username"
              class="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="Search followers"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
          </div>

          <button class="chip" :class="{ 'chip-active': filter==='all' }" @click="setFilter('all')">All</button>
          <button class="chip" :class="{ 'chip-active': filter==='mutual' }" @click="setFilter('mutual')">Mutual</button>
          <button class="chip" :class="{ 'chip-active': filter==='verified' }" @click="setFilter('verified')">✓</button>

          <div class="relative" ref="sortMenuRef">
            <button class="chip" @click="toggleSort" :aria-expanded="sortOpen ? 'true':'false'">
              {{ sortLabel }}
            </button>
            <div v-if="sortOpen" class="menu" v-outside="() => sortOpen=false" role="menu" aria-label="Sort menu">
              <button class="menu-item" @click="setSort('recent')" role="menuitem">Recent</button>
              <button class="menu-item" @click="setSort('name')" role="menuitem">Name A–Z</button>
              <button class="menu-item" @click="setSort('active')" role="menuitem">Last Active</button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between mt-2 text-xs text-white/70">
          <span>{{ prettyCount }} follower{{ totalCount!==1 ? 's' : '' }}</span>
          <div class="flex items-center gap-2">
            <button class="underline underline-offset-4 hover:text-cyan-300" @click="hardRefresh">Refresh</button>
            <button v-if="selectMode && visible.length" class="underline underline-offset-4 hover:text-cyan-300" @click="selectAllPage">
              Select page
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Body -->
    <main class="max-w-xl mx-auto px-3 py-4 md:max-w-4xl" @keydown="onKey">
      <!-- Skeletons -->
      <div v-if="loading" class="space-y-3">
        <SkeletonCard v-for="i in 6" :key="i" />
      </div>

      <!-- List / Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3" role="list" aria-label="Followers list">
        <div
          v-for="u in visible"
          :key="u.username"
          class="relative overflow-hidden rounded-xl"
          role="listitem"
        >
          <!-- Hidden actions layer -->
          <div class="absolute inset-0 flex items-stretch justify-end gap-2 px-2 pointer-events-none">
            <button class="swipe-btn bg-cyan-600/80 hover:bg-cyan-500 pointer-events-auto" @click="message(u)" title="Message">💬</button>
            <button class="swipe-btn bg-rose-600/80 hover:bg-rose-500 pointer-events-auto" @click="removeUser(u)" title="Remove">🗑</button>
          </div>

          <!-- Foreground card -->
          <article
            class="bg-[#0f172a]/60 p-4 rounded-xl border border-cyan-700/60 shadow-md hover:shadow-lg transition will-change-transform"
            :style="{ transform: `translateX(${swipe.x[u.username]||0}px)` }"
            @pointerdown="swipeStart($event, u)"
            @pointermove="swipeMove($event, u)"
            @pointerup="swipeEnd(u)"
            @pointercancel="swipeEnd(u)"
            @pointerleave="swipeEnd(u)"
            @click="onRowClick(u)"
            tabindex="0"
            :aria-label="`${u.name} ${u.username}`"
          >
            <div class="flex items-center gap-4">
              <div class="relative">
                <img
                  :src="u.avatar"
                  :alt="`${u.name} avatar`"
                  class="w-12 h-12 rounded-full object-cover ring-2 ring-cyan-500/50"
                  loading="lazy"
                  decoding="async"
                  @error="onAvatarError($event, u)"
                />
                <span
                  class="absolute -bottom-0 -right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0f172a]"
                  :class="u.online ? 'bg-emerald-400' : 'bg-gray-500'"
                  :title="u.online ? 'Online' : 'Offline'"
                ></span>

                <!-- Selection tick -->
                <button
                  v-if="selectMode"
                  class="select-tick"
                  :class="{ on: isSelected(u) }"
                  @click.stop="toggleSelect(u)"
                  :aria-pressed="isSelected(u) ? 'true':'false'"
                  title="Select"
                >✔</button>
              </div>

              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">
                  {{ u.name }}
                  <span v-if="u.verified" class="align-middle ml-1 text-cyan-300" title="Verified">✓</span>
                  <span v-if="u.pro" class="ml-1 text-xs text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">PRO</span>
                  <span v-if="u.mutual" class="ml-1 text-[10px] text-emerald-300 bg-emerald-500/10 px-1 py-0.5 rounded">Mutual</span>
                </p>
                <p class="text-sm text-cyan-300 truncate">{{ u.username }}</p>
              </div>

              <!-- Follow back quick -->
              <div v-if="!u.mutual && !selectMode" class="hidden sm:block">
                <button class="btn-cyan text-xs" @click.stop="followBack(u)">Follow back</button>
              </div>

              <!-- More -->
              <button v-if="!selectMode" class="icon-btn" aria-label="More actions" @click.stop="openSheet(u)">⋯</button>
            </div>

            <p class="mt-3 text-sm text-gray-300 line-clamp-2">{{ u.bio }}</p>

            <div class="mt-4 flex items-center gap-2">
              <button class="btn-cyan text-xs" @click.stop="message(u)">Message</button>
              <button class="btn-dark text-xs" @click.stop="removeUser(u)">Remove</button>
              <span class="ml-auto text-[11px] text-white/60">
                {{ u.online ? 'Active now' : `Seen ${relativeTime(u.lastActive)}` }}
              </span>
            </div>
          </article>
        </div>
      </div>

      <!-- Empty -->
      <p v-if="!loading && !visible.length" class="text-gray-400 italic text-center mt-20">
        No followers match your filters.
      </p>

      <!-- Infinite scroll sentinel -->
      <div ref="sentinel" class="h-10 flex items-center justify-center">
        <span v-if="moreLoading" class="text-white/60 text-sm">Loading…</span>
      </div>
    </main>

    <!-- Bulk action bar -->
    <div
      v-if="selectMode && selectedCount>0"
      class="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-xl mx-auto px-3 pb-3"
      :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
    >
      <div class="bg-[#0f172a]/90 border border-cyan-800 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
        <span class="text-xs text-white/70 px-2">{{ selectedCount }} selected</span>
        <button class="btn-cyan text-xs" @click="bulkMessage">Message</button>
        <button class="btn-dark text-xs" @click="bulkRemove">Remove</button>
        <button class="ml-auto chip" @click="clearSelection">Clear</button>
      </div>
    </div>

    <!-- Bottom Action Sheet -->
    <div v-if="sheet.open" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" @click.self="closeSheet">
      <div
        class="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-xl mx-auto bg-[#0f172a] border-t border-cyan-800 rounded-t-2xl p-3"
        :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
        role="dialog" aria-modal="true"
      >
        <div class="h-1 w-10 bg-white/20 rounded-full mx-auto mb-2"></div>
        <div class="flex items-center gap-3 mb-3">
          <img :src="sheet.user?.avatar" class="w-10 h-10 rounded-full object-cover" alt="" />
          <div>
            <p class="font-semibold">{{ sheet.user?.name }}</p>
            <p class="text-sm text-cyan-300">{{ sheet.user?.username }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button class="sheet-btn" @click="message(sheet.user)">💬 Message</button>
          <button class="sheet-btn" v-if="sheet.user && !sheet.user.mutual" @click="followBack(sheet.user)">➕ Follow back</button>
          <button class="sheet-btn warn" @click="muteUser(sheet.user)">🔕 Mute</button>
          <button class="sheet-btn danger" @click="removeUser(sheet.user)">🗑 Remove</button>
        </div>
        <button class="w-full mt-3 text-white/70 underline underline-offset-4" @click="closeSheet">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick, defineComponent, h } from 'vue'

/* ============ Emits ============ */
const emit = defineEmits(['message','remove','follow'])

/* ============ Online state ============ */
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
function onOnline () { online.value = true }
function onOffline() { online.value = false }
onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

/* ============ Loading & data ============ */
const loading = ref(true)
const moreLoading = ref(false)
const all = ref([])         // entire dataset (cached)
const followers = ref([])   // paged/visible dataset
const page = ref(1)
const pageSize = 8

/* ============ Search & filters ============ */
const q = ref('')
const qDebounced = ref('')
let qTimer
watch(q, (v)=>{ clearTimeout(qTimer); qTimer = setTimeout(()=> qDebounced.value = v, 220) })

const filter = ref(loadPref('followers:filter','all'))   // all | mutual | verified
const sort = ref(loadPref('followers:sort','recent'))    // recent | name | active
watch(filter, (v)=> savePref('followers:filter', v))
watch(sort,   (v)=> savePref('followers:sort', v))

const sortOpen = ref(false)
const sortMenuRef = ref(null)
function toggleSort(){ sortOpen.value = !sortOpen.value }

/* Click-outside directive */
const vOutside = {
  mounted(el, binding) {
    el.__onClickOutside__ = (e) => { if (!el.contains(e.target)) binding.value?.(e) }
    document.addEventListener('mousedown', el.__onClickOutside__)
    document.addEventListener('touchstart', el.__onClickOutside__, { passive: true })
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el.__onClickOutside__)
    document.removeEventListener('touchstart', el.__onClickOutside__)
  }
}

/* ============ Selection mode ============ */
const selectMode = ref(false)
const selected = reactive(new Set())
const selectedCount = computed(() => selected.size)

function toggleSelectMode(){
  selectMode.value = !selectMode.value
  if (!selectMode.value) selected.clear()
}
function isSelected(u){ return selected.has(u.username) }
function toggleSelect(u){ isSelected(u) ? selected.delete(u.username) : selected.add(u.username); buzz(5) }
function clearSelection(){ selected.clear() }
function selectAllPage(){
  visible.value.forEach(u => selected.add(u.username))
  buzz(8)
}

/* ============ Swipe state ============ */
const swipe = reactive({ active:null, startX:0, x: {} })
function swipeStart(e, u){ swipe.active = u.username; swipe.startX = (e.clientX ?? e.touches?.[0]?.clientX) || 0 }
function swipeMove(e, u){
  if (swipe.active !== u.username) return
  const x = ((e.clientX ?? e.touches?.[0]?.clientX) || 0) - swipe.startX
  swipe.x[u.username] = Math.min(0, Math.max(-120, x)) // only left
}
function swipeEnd(u){
  if (!u) return
  const cur = swipe.x[u.username] || 0
  swipe.x[u.username] = cur < -72 ? -96 : 0
  swipe.active = null
}

/* ============ Row interactions ============ */
function onRowClick(u){
  if (Math.abs(swipe.x[u.username]||0) > 6) return
  if (selectMode.value) toggleSelect(u)
  else openSheet(u)
}

/* ============ Bottom sheet ============ */
const sheet = reactive({ open:false, user:null })
function openSheet(u){ sheet.open = true; sheet.user = u; buzz(6) }
function closeSheet(){ sheet.open = false; sheet.user = null }

/* ============ Helpers ============ */
function buzz(ms=8){ if (navigator.vibrate) try{ navigator.vibrate(ms) }catch{} }
function pretty(n){ return n?.toLocaleString?.() ?? String(n) }
const totalCount = computed(()=> all.value.length)
const prettyCount = computed(()=> pretty(totalCount.value))
const sortLabel = computed(()=> sort.value==='recent' ? 'Recent' : sort.value==='name' ? 'A–Z' : 'Active')

/* ============ Filtering + sort + search ============ */
const visible = computed(()=>{
  let v = [...followers.value]
  if (qDebounced.value) {
    const s = qDebounced.value.toLowerCase()
    v = v.filter(u => u.name.toLowerCase().includes(s) || u.username.toLowerCase().includes(s))
  }
  if (filter.value === 'mutual') v = v.filter(u => u.mutual)
  if (filter.value === 'verified') v = v.filter(u => u.verified)
  if (sort.value === 'name') v.sort((a,b)=> a.name.localeCompare(b.name))
  else if (sort.value === 'active') v.sort((a,b)=> (b.lastActive||0) - (a.lastActive||0))
  else v.sort((a,b)=> (b.joined||0) - (a.joined||0))
  return v
})
function setFilter(v){ filter.value = v; buzz(4) }
function setSort(v){ sort.value = v; sortOpen.value = false; buzz(4) }

/* ============ Avatar fallback ============ */
function onAvatarError(e, u){
  e.target.onerror = null
  // fallback: initials as SVG data URL
  const initials = (u?.name || 'U').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
    <rect width='100%' height='100%' rx='48' fill='#0ea5e9'></rect>
    <text x='50%' y='55%' font-size='42' text-anchor='middle' fill='#0b1324' font-family='system-ui,Segoe UI,Roboto'>${initials}</text>
  </svg>`
  e.target.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

/* ============ Actions ============ */
function message(u){ if (!u) return; buzz(8); emit('message', u) }
function removeUser(u){
  if (!u) return
  buzz(12)
  const idxAll = all.value.findIndex(x=> x.username===u.username)
  const idxCur = followers.value.findIndex(x=> x.username===u.username)
  if (idxAll>=0) all.value.splice(idxAll,1)
  if (idxCur>=0) followers.value.splice(idxCur,1)
  closeSheet()
  emit('remove', u)
}
function followBack(u){ if (!u) return; u.mutual = true; buzz(8); emit('follow', u) }
function muteUser(u){ buzz(6); alert(`Muted ${u?.username}`) }

/* Bulk actions */
function bulkMessage(){
  const users = [...selected].map(id => followers.value.find(f=>f.username===id)).filter(Boolean)
  users.forEach(u=> emit('message', u))
  buzz(10)
}
function bulkRemove(){
  const users = [...selected].map(id => followers.value.find(f=>f.username===id)).filter(Boolean)
  users.forEach(u=> removeUser(u))
  selected.clear()
}

/* Export CSV for selected */
function exportCSV(){
  const users = [...selected].map(id => all.value.find(f=>f.username===id)).filter(Boolean)
  if (!users.length) return
  const rows = [
    ['name','username','verified','pro','mutual','online','lastActive'].join(','),
    ...users.map(u => [
      qCSV(u.name),
      qCSV(u.username),
      u.verified ? '1':'0',
      u.pro ? '1':'0',
      u.mutual ? '1':'0',
      u.online ? '1':'0',
      new Date(u.lastActive||0).toISOString()
    ].join(','))
  ].join('\r\n')
  const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'followers.csv'
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
function qCSV(v){ const s = String(v ?? ''); return /[,"\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s }

/* ============ Infinite scroll ============ */
const sentinel = ref(null)
let io
function mountIO(){
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if (e.isIntersecting) loadMore() })
  }, { rootMargin: '400px 0px' })
  if (sentinel.value) io.observe(sentinel.value)
}
function unmountIO(){ try{ io?.disconnect() }catch{} }

async function loadMore(){
  if (moreLoading.value || loading.value) return
  moreLoading.value = true
  await delay(350)
  const start = (page.value-1) * pageSize
  const next = all.value.slice(start, start + pageSize)
  followers.value.push(...next)
  page.value++
  moreLoading.value = false
}

/* ============ Pull-to-refresh ============ */
const ptr = reactive({ startY:0, delta:0, state:'idle' }) // idle|ready|loading
function ptrStart(e){
  if (window.scrollY > 0) return
  ptr.startY = e.touches?.[0]?.clientY ?? 0
  ptr.delta = 0; ptr.state = 'idle'
}
function ptrMove(e){
  if (!ptr.startY) return
  const y = e.touches?.[0]?.clientY ?? 0
  ptr.delta = Math.max(0, y - ptr.startY) * 0.6
  if (ptr.delta > 72 && ptr.state!=='loading') ptr.state = 'ready'
}
async function ptrEnd(){
  if (ptr.state==='ready'){ ptr.state='loading'; await hardRefresh() }
  ptr.startY = 0
  setTimeout(()=> { ptr.delta = 0; if (ptr.state==='loading') ptr.state='idle' }, 300)
}

/* ============ Refresh / Seed data ============ */
async function hardRefresh(){
  buzz(6)
  loading.value = true
  followers.value = []
  page.value = 1
  await seedData(true)
  loading.value = false
}

/* Mock fetch with cache (replace with real API) */
async function seedData(force=false){
  const LS_KEY = 'followers:data:v1'
  // load cache if exists and not forcing
  if (!force){
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
      if (cached && Array.isArray(cached) && cached.length){
        all.value = cached
        followers.value = all.value.slice(0, pageSize)
        page.value = 2
        return
      }
    } catch {}
  }

  // Simulate API
  await delay(600)
  const base = [
    { name: 'Michael AI', username:'@michael_ai', avatar:'/user-avatar.png', bio:'AI Builder & Data Enthusiast', verified:true,  pro:true,  online:true  },
    { name: 'Rose Dev',   username:'@rose_dev',   avatar:'/user-avatar.png', bio:'Frontend Developer & Tech Educator', verified:false, pro:false, online:false },
    { name: 'Kingsley Biz', username:'@kingsley_biz', avatar:'/user-avatar.png', bio:'Entrepreneur & SmartBiz Host', verified:false, pro:true,  online:false },
    { name: 'Nia Pixel',  username:'@niapixel',   avatar:'/user-avatar.png', bio:'Product Designer • Motion', verified:true,  pro:false, online:true  },
    { name: 'Omar Cloud', username:'@omar_cloud', avatar:'/user-avatar.png', bio:'DevOps | K8s | Terraform', verified:false, pro:false, online:false },
    { name: 'Lina ML',    username:'@lina_ml',    avatar:'/user-avatar.png', bio:'ML Engineer | Vision', verified:true,  pro:true,  online:false },
    { name: 'Tasha UX',   username:'@tasha_ux',   avatar:'/user-avatar.png', bio:'UX Research & Strategy', verified:false, pro:false, online:true  },
    { name: 'Ben Trader', username:'@ben_trader', avatar:'/user-avatar.png', bio:'Markets & Macro', verified:false, pro:false, online:false },
    { name: 'Yara Codes', username:'@yara_codes', avatar:'/user-avatar.png', bio:'Full-stack • Node/Go', verified:true,  pro:false, online:false },
    { name: 'Deo Maps',   username:'@deo_maps',   avatar:'/user-avatar.png', bio:'GIS & Geo data', verified:false, pro:false, online:false },
  ]
  const now = Date.now()
  const mapped = base.map((u,i)=> ({
    ...u,
    joined: now - i*60_000,
    lastActive: u.online ? now - Math.floor(Math.random()*30)*1000 : now - (5 + Math.floor(Math.random()*4000))*1000,
    mutual: Math.random() > .5
  }))
  all.value = Array.from({length: 4}, (_,k)=> mapped.map(m => ({
    ...m,
    username: m.username.replace('@', `@${k}`),
    joined: m.joined - k*3_600_000,
    lastActive: m.lastActive - k*5_000_000
  })) ).flat()

  followers.value = all.value.slice(0, pageSize)
  page.value = 2

  try { localStorage.setItem(LS_KEY, JSON.stringify(all.value)) } catch {}
}

/* ============ Keyboard shortcuts ============ */
function onKey(e){
  if (e.key === 'Escape' && sheet.open) { closeSheet(); return }
  if (e.key === 'Escape' && selectMode.value) { toggleSelectMode(); return }
  if (e.key === 'a' && (e.ctrlKey || e.metaKey) && selectMode.value) { e.preventDefault(); selectAllPage() }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectMode.value && selected.size){
    bulkRemove()
  }
}

/* ============ Utils ============ */
function relativeTime(ts){
  if (!ts) return 'recently'
  const seconds = Math.floor((Date.now() - ts)/1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds/60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes/60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours/24)
  return `${days}d ago`
}
function delay(ms){ return new Promise(r=> setTimeout(r, ms)) }
function savePref(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch{} }
function loadPref(k, def){ try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? def }catch{ return def } }

/* ============ Lifecycle ============ */
onMounted(async ()=>{
  await seedData()
  loading.value = false
  mountIO()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(()=>{
  unmountIO()
  window.removeEventListener('keydown', onKey)
})

/* ============ Inline Skeleton card (no JSX) ============ */
const SkeletonCard = defineComponent({
  name: 'SkeletonCard',
  setup(){
    return () => h('div', { class: 'skel' }, [
      h('div', { class: 'flex items-center gap-4' }, [
        h('div', { class:'w-12 h-12 rounded-full skel-bar' }),
        h('div', { class:'flex-1' }, [
          h('div', { class:'h-3 w-40 rounded skel-bar mb-2' }),
          h('div', { class:'h-3 w-24 rounded skel-bar' })
        ])
      ]),
      h('div', { class:'h-3 w-3/4 rounded skel-bar mt-4' }),
      h('div', { class:'flex gap-2 mt-4' }, [
        h('div', { class:'h-8 w-20 rounded-full skel-bar' }),
        h('div', { class:'h-8 w-20 rounded-full skel-bar' })
      ])
    ])
  }
})
</script>

<script>
/* register directives for <script setup> usage */
export default {
  directives: {
    outside: {
      mounted(el, binding) {
        el.__onClickOutside__ = (e) => { if (!el.contains(e.target)) binding.value?.(e) }
        document.addEventListener('mousedown', el.__onClickOutside__)
        document.addEventListener('touchstart', el.__onClickOutside__, { passive: true })
      },
      unmounted(el) {
        document.removeEventListener('mousedown', el.__onClickOutside__)
        document.removeEventListener('touchstart', el.__onClickOutside__)
      }
    }
  }
}
</script>

<style scoped>
/* Chips / controls */
.chip{ @apply px-2.5 py-1 rounded-full text-xs bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.chip-active{ @apply bg-cyan-600 text-[#0b1324] border-cyan-500; }

/* Dropdown menu */
.menu{ @apply absolute right-0 mt-1 bg-[#0f172a] border border-cyan-800 rounded-xl shadow-xl p-1 z-10; }
.menu-item{ @apply w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10; }

/* Buttons */
.btn-cyan { @apply bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 px-3 rounded-full transition; }
.btn-dark { @apply bg-gray-700 hover:bg-gray-600 text-white py-1.5 px-3 rounded-full transition; }
.icon-btn{ @apply w-9 h-9 rounded-full grid place-items-center bg-white/10 border border-white/10 hover:bg-white/20 transition; }

/* Swipe buttons */
.swipe-btn{
  @apply my-2 w-12 rounded-lg text-xl grid place-items-center text-white border border-white/10;
}

/* Selection tick */
.select-tick{
  @apply absolute -top-2 -left-2 w-6 h-6 grid place-items-center rounded-full border border-cyan-500/60 bg-black/60 text-white text-xs;
}
.select-tick.on{ @apply bg-cyan-500 text-[#0b1324] }

/* Skeleton */
.skel{ @apply bg-[#0f172a]/60 p-4 rounded-xl border border-cyan-700/60; }
.skel-bar{
  background: linear-gradient(110deg, rgba(255,255,255,.08) 8%, rgba(255,255,255,.02) 18%, rgba(255,255,255,.08) 33%);
  background-size: 200% 100%; animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer { to { background-position-x: -200% } }

/* Pull-to-refresh */
.ptr-indicator{
  @apply sticky top-0 z-10 flex items-center justify-center text-white/80 text-xs;
  background: linear-gradient(180deg, rgba(15,23,42,.6), rgba(15,23,42,0));
}
.ptr-spinner{
  width:14px;height:14px;border-radius:9999px;border:2px solid rgba(255,255,255,.25);border-top-color:#22d3ee;display:inline-block;
}
.ptr-spinner.spin{ animation: spin 1s linear infinite }
@keyframes spin{ to{ transform: rotate(360deg) } }
</style>
