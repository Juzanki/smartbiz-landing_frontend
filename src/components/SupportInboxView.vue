<template>
  <div class="relative min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100">
    <!-- Top Bar -->
    <header class="sticky top-0 z-30 px-4 py-3 flex items-center justify-between bg-white/90 dark:bg-[#121212]/90 backdrop-blur border-b border-black/10 dark:border-white/10">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow">📥</div>
        <div class="leading-tight">
          <h1 class="text-base font-extrabold">Support Inbox</h1>
          <div class="flex items-center gap-2 text-[11px]">
            <span :class="['px-2 py-0.5 rounded-full',
                          online ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600']">
              {{ online ? 'Online' : 'Offline' }}
            </span>
            <span class="opacity-70">{{ totalCount }} items</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-icon" @click="refresh" :disabled="loading" title="Refresh">
          <span v-if="!loading">🔄</span><span v-else class="animate-spin">⏳</span>
        </button>
        <button class="btn-icon" @click="openFilters = true" title="Filters">⚙</button>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="px-3 pt-3">
      <div class="grid grid-cols-4 gap-2">
        <button v-for="t in tabs" :key="t.key"
                @click="activeTab = t.key"
                :class="['tab', activeTab === t.key && 'tab-on']">
          {{ t.label }} <span class="ml-1 text-[10px] opacity-80">({{ countByStatus(t.key) }})</span>
        </button>
      </div>
    </nav>

    <!-- Search -->
    <section class="px-4 mt-3">
      <div class="flex items-center gap-2">
        <input v-model="q" @input="debouncedSearch" class="input flex-1" type="search"
               placeholder="Search name, message, #ticket…" />
        <button class="btn-icon" @click="q=''; applySearch()">✖</button>
      </div>
      <div class="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
        <button class="chip" :class="channelFilter==='all' && 'chip-on'" @click="setChannel('all')">All</button>
        <button class="chip" :class="channelFilter==='whatsapp' && 'chip-on'" @click="setChannel('whatsapp')">WhatsApp</button>
        <button class="chip" :class="channelFilter==='email' && 'chip-on'" @click="setChannel('email')">Email</button>
        <button class="chip" :class="channelFilter==='instagram' && 'chip-on'" @click="setChannel('instagram')">Instagram</button>
        <button class="chip" :class="channelFilter==='facebook' && 'chip-on'" @click="setChannel('facebook')">Facebook</button>
      </div>
    </section>

    <!-- List -->
    <main class="px-2 mt-2 pb-40">
      <ul class="space-y-2">
        <!-- Skeletons -->
        <li v-if="loading && inbox.length===0" v-for="i in 6" :key="'sk'+i" class="mx-2 p-3 rounded-2xl border border-black/10 dark:border-white/10">
          <div class="flex items-center gap-3">
            <div class="skeleton h-12 w-12 rounded-full"></div>
            <div class="flex-1">
              <div class="skeleton h-4 w-2/3 mb-2"></div>
              <div class="skeleton h-3 w-1/2"></div>
            </div>
          </div>
        </li>

        <!-- Items -->
        <li v-for="item in visibleItems" :key="item.id"
            class="relative mx-2"
            @touchstart.passive="onTouchStart(item.id, $event)"
            @touchmove.passive="onTouchMove(item.id, $event)"
            @touchend.passive="onTouchEnd(item)"
        >
          <!-- Swipe background -->
          <div class="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div class="absolute inset-y-0 left-0 w-1/2 grid place-items-center bg-rose-500/15 text-rose-600">🗄 Archive</div>
            <div class="absolute inset-y-0 right-0 w-1/2 grid place-items-center bg-emerald-500/15 text-emerald-600">✅ Resolve</div>
          </div>

          <!-- Card -->
          <button class="w-full text-left"
                  @click="openThread(item)"
                  :style="{ transform: `translateX(${swipeX[item.id]||0}px)` }">
            <div class="p-3 rounded-2xl bg-white dark:bg-[#181818] border border-black/10 dark:border-white/10 shadow-sm active:scale-[0.995]">
              <div class="flex items-center gap-3">
                <img :src="item.avatar" class="h-12 w-12 rounded-full object-cover border border-black/10 dark:border-white/10" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <p class="font-semibold truncate">
                      {{ item.name }}
                      <span class="ml-2 text-[11px] opacity-70">{{ channelIcon(item.channel) }}</span>
                      <span v-if="item.priority" :class="['ml-2 text-[10px] px-2 py-0.5 rounded-full',
                                                          priorityClass(item.priority)]">
                        {{ item.priority }}
                      </span>
                    </p>
                    <span class="text-[11px] opacity-70 ml-2">{{ timeAgo(item.updatedAt) }}</span>
                  </div>
                  <p class="text-sm opacity-90 truncate">{{ item.snippet }}</p>
                  <div class="mt-1 flex items-center gap-2">
                    <span v-for="t in item.tags" :key="t" class="tag">{{ t }}</span>
                  </div>
                </div>
              </div>

              <div class="mt-2 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <span v-if="item.unread>0" class="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold">{{ item.unread }}</span>
                  <span :class="['px-2 py-0.5 rounded-full',
                                statusClass(item.status)]">{{ item.status }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn-chip" @click.stop="quickReply(item)">💬 Reply</button>
                  <button class="btn-chip" @click.stop="resolve(item)">✅ Resolve</button>
                </div>
              </div>
            </div>
          </button>
        </li>

        <!-- Empty -->
        <li v-if="!loading && visibleItems.length===0" class="mx-2 mt-8 text-center opacity-70">
          No conversations found.
        </li>

        <!-- Sentinel -->
        <li ref="sentinel" class="h-10"></li>
      </ul>

      <!-- Load more manual -->
      <div class="flex justify-center mt-2">
        <button class="btn-soft h-9 px-4" @click="loadMore" :disabled="loading || !hasMore">
          {{ hasMore ? (loading ? 'Loading…' : 'Load more') : 'End' }}
        </button>
      </div>
    </main>

    <!-- Compose FAB -->
    <button class="fab" @click="compose">✉</button>

    <!-- Filters Sheet -->
    <transition name="slide-up">
      <section v-if="openFilters" class="sheet" @click.self="openFilters = false">
        <div class="sheet-card">
          <header class="sheet-bar">
            <b>Filters</b>
            <button class="btn-ghost" @click="openFilters = false">✖</button>
          </header>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="label">Sort</label>
              <select v-model="sortBy" class="input">
                <option value="recent">Most recent</option>
                <option value="unread">Unread first</option>
                <option value="priority">Priority</option>
              </select>
            </div>
            <div>
              <label class="label">Priority</label>
              <select v-model="priorityFilter" class="input">
                <option value="all">All</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
          </div>
          <button class="btn-primary w-full mt-3" @click="applyFilters">Apply</button>
        </div>
      </section>
    </transition>

    <!-- Thread Bottom-Sheet -->
    <transition name="slide-up">
      <section v-if="threadOpen" class="sheet" @click.self="closeThread">
        <div class="sheet-card max-h-[80vh] grid grid-rows-[auto,1fr,auto]">
          <header class="sheet-bar">
            <div class="flex items-center gap-2">
              <img :src="activeItem?.avatar" class="h-8 w-8 rounded-full border border-black/10 dark:border-white/10" />
              <div class="leading-tight">
                <p class="text-sm font-bold">{{ activeItem?.name }}</p>
                <p class="text-[11px] opacity-70">{{ channelIcon(activeItem?.channel) }} • {{ activeItem?.id }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn-chip" @click.stop="setStatus('open')">Open</button>
              <button class="btn-chip" @click.stop="setStatus('pending')">Pending</button>
              <button class="btn-chip" @click.stop="setStatus('resolved')">Resolved</button>
              <button class="btn-ghost" @click="closeThread">✖</button>
            </div>
          </header>

          <!-- Messages -->
          <div class="overflow-y-auto px-1 no-scrollbar">
            <div class="space-y-2 py-2">
              <div v-for="m in messages" :key="m.id" :class="m.from==='agent' ? 'justify-end flex' : 'justify-start flex'">
                <div :class="['max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                              m.from==='agent' ? 'bg-indigo-600 text-white rounded-br' : 'bg-black/5 dark:bg-white/10 rounded-bl']">
                  <p class="whitespace-pre-line">{{ m.text }}</p>
                  <p class="text-[10px] opacity-80 mt-1 text-right">{{ timeAgo(m.ts) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Composer -->
          <div class="pt-2">
            <div class="px-2 flex gap-2 overflow-x-auto no-scrollbar mb-2">
              <button v-for="r in quickReplies" :key="r" class="chip" @click="appendReply(r)">{{ r }}</button>
            </div>
            <div class="flex items-end gap-2">
              <textarea v-model="draft" rows="1" class="input flex-1 resize-none" placeholder="Type a reply…"></textarea>
              <button class="btn-primary h-11 px-4" :disabled="!draft.trim()" @click="send">Send</button>
            </div>
          </div>
        </div>
      </section>
    </transition>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow">
        {{ toast }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

/* Online */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

/* State */
const tabs = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'resolved', label: 'Resolved' },
]
const activeTab = ref('open')

const inbox = ref([])               // master list
const loading = ref(false)
const page = ref(1)
const hasMore = ref(true)
const q = ref('')
const channelFilter = ref('all')
const priorityFilter = ref('all')
const sortBy = ref('recent')
const openFilters = ref(false)
const toast = ref('')

/* Swipe */
const swipeStartX = reactive({})
const swipeX = reactive({})

/* Thread */
const threadOpen = ref(false)
const activeItem = ref(null)
const messages = ref([])
const draft = ref('')
const quickReplies = [
  'Asante kwa kutuandikia! Tutakujibu mara moja.',
  'Tafadhali tuma namba ya oda.',
  'Samahani kwa usumbufu — tunaangalia.',
  'Suluhisho: jaribu kusafisha cache kisha ujaribu tena.',
]

/* Derived */
const totalCount = computed(() => inbox.value.length)
const filtered = computed(() => {
  let arr = [...inbox.value]
  if (activeTab.value !== 'all') arr = arr.filter(i => i.status === activeTab.value)
  if (channelFilter.value !== 'all') arr = arr.filter(i => i.channel === channelFilter.value)
  if (priorityFilter.value !== 'all') arr = arr.filter(i => i.priority === priorityFilter.value)
  if (q.value.trim()){
    const s = q.value.trim().toLowerCase()
    arr = arr.filter(i =>
      i.name.toLowerCase().includes(s) ||
      i.snippet.toLowerCase().includes(s) ||
      String(i.id).includes(s)
    )
  }
  if (sortBy.value === 'unread') arr.sort((a,b) => (b.unread||0) - (a.unread||0))
  else if (sortBy.value === 'priority'){
    const order = { Urgent:4, High:3, Medium:2, Low:1, null:0 }
    arr.sort((a,b) => (order[b.priority||'null'] - order[a.priority||'null']))
  } else {
    arr.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }
  return arr
})
const visibleItems = computed(() => filtered.value.slice(0, page.value * 20))

/* IO sentinel for infinite scroll */
const sentinel = ref(null)
let io
function mountIO(){
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) loadMore()
    })
  })
  sentinel.value && io.observe(sentinel.value)
}

/* Fetch mock page (👉 replace with API) */
async function fetchPage(p=1){
  // TODO: Badilisha na REST API yako
  await new Promise(r => setTimeout(r, 400))
  const baseId = (p-1)*20
  const sample = Array.from({ length: 20 }).map((_,i) => ({
    id: baseId + i + 1,
    name: ['Esther','Alpha','Nash','Maya','Ibrahim','Asha'][i%6] + ' ' + (100+i),
    avatar: '/user-avatar.png',
    channel: ['whatsapp','email','instagram','facebook'][i%4],
    priority: [null,'Low','Medium','High','Urgent'][i%5],
    status: ['open','pending','resolved'][i%3],
    snippet: ['Habari! Naomba msaada…','Order #3245 haijafika.','Asante kwa huduma!','Nawezaje kurejesha bidhaa?'][i%4],
    tags: ['VIP','New','Refund','Follow-up'].filter((_,k)=> (i+k)%3===0),
    unread: (i%4===0)? Math.floor(Math.random()*3)+1 : 0,
    updatedAt: new Date(Date.now() - (i*3600e3 + Math.random()*6e5)).toISOString()
  }))
  return sample
}

/* Actions */
async function refresh(){
  loading.value = true
  try{
    page.value = 1; hasMore.value = true
    const data = await fetchPage(1)
    inbox.value = data
    toastMsg('Refreshed')
  } finally {
    loading.value = false
  }
}
async function loadMore(){
  if (loading.value || !hasMore.value) return
  loading.value = true
  try{
    const next = await fetchPage(page.value+1)
    if (next.length === 0) hasMore.value = false
    inbox.value = [...inbox.value, ...next]
    page.value++
  } finally {
    loading.value = false
  }
}
function setChannel(ch){ channelFilter.value = ch }
function applyFilters(){ openFilters.value = false; toastMsg('Filters applied') }
const debouncedSearch = debounce(applySearch, 250)
function applySearch(){ page.value = 1 }

/* Swipe handlers */
function onTouchStart(id, e){ swipeStartX[id] = e.touches[0].clientX; swipeX[id] = 0 }
function onTouchMove(id, e){
  const dx = e.touches[0].clientX - (swipeStartX[id]||0)
  swipeX[id] = Math.max(-120, Math.min(120, dx))
}
function onTouchEnd(item){
  const dx = swipeX[item.id] || 0
  if (dx > 70){ resolve(item) }          // swipe right → resolve
  else if (dx < -70){ archive(item) }    // swipe left → archive
  swipeX[item.id] = 0
}

function quickReply(item){ openThread(item); appendReply('Asante! Tunaangalia sasa…') }
function resolve(item){
  item.status = 'resolved'; item.unread = 0; toastMsg('Marked resolved')
  // TODO: API call → PATCH /tickets/:id { status: 'resolved' }
}
function archive(item){
  inbox.value = inbox.value.filter(x => x.id !== item.id)
  toastMsg('Archived')
  // TODO: API call → POST /tickets/:id/archive
}

/* Thread */
function openThread(item){
  activeItem.value = item
  threadOpen.value = true
  messages.value = seedThread(item)
  // mark read
  item.unread = 0
  // TODO: API: GET /tickets/:id/messages
}
function closeThread(){ threadOpen.value = false; draft.value = '' }
function setStatus(s){ if (!activeItem.value) return; activeItem.value.status = s; toastMsg('Status → ' + s) }
function appendReply(txt){ draft.value = (draft.value ? draft.value + ' ' : '') + txt }
function send(){
  const text = draft.value.trim(); if (!text) return
  messages.value.push({ id: Date.now(), from:'agent', text, ts: new Date().toISOString() })
  draft.value = ''
  // TODO: POST /tickets/:id/reply
}

/* Utils */
function channelIcon(ch){
  return { whatsapp:'🟢 WhatsApp', email:'✉ Email', instagram:'🟣 Instagram', facebook:'🔵 Facebook' }[ch] || '🌐'
}
function statusClass(s){
  return {
    open:'bg-blue-500/15 text-blue-600',
    pending:'bg-yellow-500/15 text-yellow-700',
    resolved:'bg-emerald-500/15 text-emerald-600'
  }[s] || 'bg-gray-500/15 text-gray-600'
}
function priorityClass(p){
  return {
    Low:'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white',
    Medium:'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    High:'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    Urgent:'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
  }[p] || 'bg-black/5 dark:bg-white/10 text-xs'
}
function timeAgo(iso){
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime())/1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s/60); if (m < 60) return `${m}m`
  const h = Math.floor(m/60); if (h < 24) return `${h}h`
  const d = Math.floor(h/24); return `${d}d`
}
function toastMsg(m){ toast.value = m; try{ navigator.vibrate?.(8) }catch{}; setTimeout(()=>toast.value='', 1400) }
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms) } }
function countByStatus(key){
  if (key==='all') return inbox.value.length
  return inbox.value.filter(i => i.status === key).length
}
function seedThread(item){
  return [
    { id: 1, from:'customer', text: item.snippet, ts: item.updatedAt },
    { id: 2, from:'agent', text: 'Habari! Tunaangalia suala lako.', ts: new Date(Date.now()-1800e3).toISOString() }
  ]
}

/* Lifecycle */
onMounted(async ()=>{
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  await refresh()
  mountIO()
})
onBeforeUnmount(()=>{
  io?.disconnect?.()
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
/* Inputs & buttons */
.input{ @apply w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1b1b1b] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400; }
.btn-icon{ @apply h-9 w-9 grid place-items-center rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20; }
.btn-ghost{ @apply h-9 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10; }
.btn-soft{ @apply rounded-xl bg-black/5 dark:bg-white/10 text-sm hover:bg-black/10 dark:hover:bg-white/20; }
.btn-chip{ @apply px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs hover:bg-black/10 dark:hover:bg-white/15; }
.tag{ @apply text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 }

.tab{ @apply h-9 rounded-xl bg-black/5 dark:bg-white/10 text-sm font-semibold; }
.tab-on{ @apply bg-blue-600 text-white }

.fab{ @apply fixed right-4 bottom-20 z-40 h-12 w-12 rounded-full grid place-items-center text-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl active:translate-y-[1px]; }

/* Sheet */
.sheet{ @apply fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end; }
.sheet-card{ @apply w-full rounded-t-2xl bg-white dark:bg-[#1b1b1b] border-t border-black/10 dark:border-white/10 p-3; }
.sheet-bar{ @apply flex items-center justify-between mb-2; }

/* Utilities */
.no-scrollbar::-webkit-scrollbar{ display:none }
.skeleton{ @apply animate-pulse bg-black/10 dark:bg-white/10 }
.slide-up-enter-active,.slide-up-leave-active{ transition: transform .22s ease, opacity .18s ease }
.slide-up-enter-from,.slide-up-leave-to{ transform: translateY(16px); opacity:0 }
.fade-enter-active,.fade-leave-active{ transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
</style>
