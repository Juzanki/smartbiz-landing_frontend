<template>
  <div
    class="min-h-[100svh] bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white"
    :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
  >
    <!-- Header: sticky, mobile-first -->
    <header
      class="sticky top-0 z-20 bg-gradient-to-b from-[#0f172a]/90 to-[#0f172a]/60 backdrop-blur-lg border-b border-cyan-800/40"
      :style="{ paddingTop: 'max(.5rem, env(safe-area-inset-top))' }"
      role="search"
    >
      <div class="max-w-xl mx-auto px-4 pt-2 pb-3">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-2xl font-bold text-cyan-300">👣 Following</h2>
          <span class="text-xs text-white/70">{{ prettyCount }} account{{ totalCount!==1 ? 's' : '' }}</span>
        </div>

        <!-- Search + filters + sort -->
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              v-model="q"
              type="search"
              inputmode="search"
              autocomplete="off"
              placeholder="Search @username or role"
              class="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="Search following"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
          </div>

          <!-- Quick filter chips -->
          <button
            class="chip"
            :class="{ 'chip-active': activeRole==='all' }"
            @click="setRole('all')"
          >
            All
          </button>

          <div class="relative">
            <button class="chip" @click="sortOpen = !sortOpen" :aria-expanded="String(sortOpen)">
              {{ sortLabel }}
            </button>
            <div v-if="sortOpen" class="menu" @click.outside="sortOpen=false">
              <button class="menu-item" @click="setSort('recent')">Recently followed</button>
              <button class="menu-item" @click="setSort('name')">Name A–Z</button>
              <button class="menu-item" @click="setSort('active')">Last Active</button>
            </div>
          </div>
        </div>

        <!-- Role scroller (auto from data) -->
        <div class="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            v-for="r in roleList"
            :key="r"
            class="chip shrink-0"
            :class="{ 'chip-active': activeRole===r }"
            @click="setRole(r)"
          >
            {{ r }}
          </button>
        </div>
      </div>
    </header>

    <!-- Body -->
    <main class="max-w-xl mx-auto px-4 py-4 md:max-w-4xl">
      <!-- Skeletons -->
      <div v-if="loading" class="space-y-3">
        <SkeletonRow v-for="i in 6" :key="i" />
      </div>

      <!-- List (mobile 1-col) / Grid (md+) -->
      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
        role="list"
        aria-label="Following list"
      >
        <article
          v-for="u in visible"
          :key="u.username"
          role="listitem"
          class="group bg-[#1e293b]/80 p-3 rounded-xl border border-cyan-700/50 hover:border-cyan-500/60 shadow-sm hover:shadow-lg transition"
        >
          <div class="flex items-center gap-3">
            <div class="relative">
              <img
                :src="u.avatar"
                :alt="`${u.username} avatar`"
                class="w-11 h-11 rounded-full object-cover ring-2 ring-cyan-500/30"
                loading="lazy"
                decoding="async"
                @error="onAvatarError($event)"
              />
              <span
                class="absolute -bottom-0 -right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1e293b]"
                :class="u.online ? 'bg-emerald-400' : 'bg-gray-500'"
                :title="u.online ? 'Online' : 'Offline'"
              ></span>
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-white">
                {{ u.username }}
                <span v-if="u.verified" class="ml-1 text-cyan-300" title="Verified">✓</span>
              </p>
              <p class="text-[12px] text-gray-400 truncate">{{ u.role }}</p>
            </div>

            <!-- Quick actions (desktop show) -->
            <div class="hidden sm:flex gap-1">
              <button class="btn-cyan text-[11px] px-2 py-1" @click.stop="message(u)">Message</button>
              <button class="btn-dark text-[11px] px-2 py-1" @click.stop="askUnfollow(u)">Unfollow</button>
            </div>

            <!-- Mobile: open sheet -->
            <button class="icon-btn sm:hidden" aria-label="More" @click="openSheet(u)">⋯</button>
          </div>
        </article>
      </div>

      <!-- Empty -->
      <p v-if="!loading && !visible.length" class="text-gray-400 italic text-center mt-16">
        You’re not following anyone (yet) that matches your filters.
      </p>

      <!-- Infinite scroll sentinel -->
      <div ref="sentinel" class="h-10 flex items-center justify-center">
        <span v-if="moreLoading" class="text-white/60 text-sm">Loading…</span>
      </div>
    </main>

    <!-- Bottom Sheet (mobile actions) -->
    <div v-if="sheet.open" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" @click.self="closeSheet" role="dialog" aria-modal="true">
      <div
        class="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-xl mx-auto bg-[#0f172a] border-t border-cyan-800 rounded-t-2xl p-3"
        :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
      >
        <div class="h-1 w-10 bg-white/20 rounded-full mx-auto mb-2"></div>
        <div class="flex items-center gap-3 mb-3">
          <img :src="sheet.user?.avatar" class="w-10 h-10 rounded-full object-cover" alt="" />
          <div>
            <p class="font-semibold">{{ sheet.user?.username }}</p>
            <p class="text-xs text-gray-400">{{ sheet.user?.role }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button class="sheet-btn" @click="message(sheet.user)">💬 Message</button>
          <button class="sheet-btn warn" @click="askUnfollow(sheet.user)">🚫 Unfollow</button>
        </div>
        <button class="w-full mt-3 text-white/70 underline underline-offset-4" @click="closeSheet">Close</button>
      </div>
    </div>

    <!-- Confirm Unfollow Dialog -->
    <div v-if="confirm.open" class="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div class="w-full max-w-sm bg-[#0f172a] border border-cyan-800 rounded-2xl p-4 shadow-2xl">
        <h3 class="text-lg font-semibold text-cyan-300 mb-2">Unfollow user?</h3>
        <p class="text-sm text-white/80 mb-4">You will stop seeing updates from <span class="font-medium">{{ confirm.user?.username }}</span>.</p>
        <div class="flex items-center justify-end gap-2">
          <button class="btn-dark px-3 py-1.5" @click="confirm.open=false">Cancel</button>
          <button class="btn-danger px-3 py-1.5" @click="unfollow(confirm.user)">Unfollow</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/* Emits (optional for parent integration) */
const emit = defineEmits(['message','unfollow','refresh'])

/* --- Data & state --- */
const loading     = ref(true)
const moreLoading = ref(false)
const all         = ref([])   // full dataset (server)
const list        = ref([])   // paged render list
const page        = ref(1)
const pageSize    = 9

/* Search / Filter / Sort */
const q = ref('')
const qDebounced = ref('')
let qTimer
watch(q, v => { clearTimeout(qTimer); qTimer = setTimeout(()=> qDebounced.value = v, 220) })

const activeRole = ref('all')     // 'all' or any role
const sortBy     = ref('recent')  // recent | name | active
const sortOpen   = ref(false)
const sortLabel  = computed(()=> sortBy.value==='recent' ? 'Recent' : sortBy.value==='name' ? 'A–Z' : 'Active')

/* Bottom sheet & Confirm */
const sheet = reactive({ open:false, user:null })
function openSheet(u){ sheet.open = true; sheet.user = u; vibrate(6) }
function closeSheet(){ sheet.open = false; sheet.user = null }

const confirm = reactive({ open:false, user:null })
function askUnfollow(u){ confirm.open = true; confirm.user = u; sheet.open=false; vibrate(10) }
function unfollow(u){
  if (!u) return
  vibrate(12)
  // Optimistic removal
  const idxAll = all.value.findIndex(x=> x.username===u.username)
  const idxCur = list.value.findIndex(x=> x.username===u.username)
  if (idxAll>=0) all.value.splice(idxAll,1)
  if (idxCur>=0) list.value.splice(idxCur,1)
  confirm.open = false
  emit('unfollow', u)
}

/* Derived roles from dataset */
const roleList = computed(()=>{
  const set = new Set(all.value.map(u => (u.role || '').trim()).filter(Boolean))
  return Array.from(set).sort()
})

/* Helpers */
const totalCount = computed(()=> all.value.length)
const prettyCount = computed(()=> (totalCount.value).toLocaleString?.() ?? String(totalCount.value))
function vibrate(ms){ if (navigator.vibrate) try{ navigator.vibrate(ms) }catch{} }
function onAvatarError(e){ e.target.src = '/user-avatar.png' }

/* Filter + search + sort pipeline */
const visible = computed(()=>{
  let v = [...list.value]
  if (qDebounced.value) {
    const s = qDebounced.value.toLowerCase()
    v = v.filter(u =>
      u.username.toLowerCase().includes(s) ||
      (u.role||'').toLowerCase().includes(s)
    )
  }
  if (activeRole.value !== 'all') v = v.filter(u => (u.role||'').toLowerCase() === activeRole.value.toLowerCase())
  if (sortBy.value === 'name') v.sort((a,b)=> a.username.localeCompare(b.username))
  else if (sortBy.value === 'active') v.sort((a,b)=> (b.lastActive||0) - (a.lastActive||0))
  else v.sort((a,b)=> (b.followedAt||0) - (a.followedAt||0))
  return v
})
function setRole(r){ activeRole.value = r; vibrate(4) }
function setSort(s){ sortBy.value = s; sortOpen.value = false; vibrate(4) }

/* Actions */
function message(u){ if (!u) return; vibrate(8); emit('message', u) }

/* Infinite scroll */
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
  await new Promise(r=> setTimeout(r, 450)) // simulate API
  const start = (page.value-1) * pageSize
  const next  = all.value.slice(start, start+pageSize)
  list.value.push(...next)
  page.value++
  moreLoading.value = false
}

/* Refresh (public) */
async function refresh(){
  vibrate(6)
  loading.value = true
  list.value = []
  page.value = 1
  await seedData(true)
  loading.value = false
  emit('refresh')
}

/* Mock seed — replace with real API fetch */
async function seedData(force=false){
  if (all.value.length && !force) return
  await new Promise(r=> setTimeout(r, 600))
  const base = [
    { username:'@david_tech',  role:'AI Enthusiast',     avatar:'/avatars/david.png',     verified:true,  online:true  },
    { username:'@queenbizz',   role:'Startup Founder',   avatar:'/avatars/queenbizz.png', verified:false, online:false },
    { username:'@smartdev',    role:'Fullstack Engineer',avatar:'/avatars/smartdev.png',  verified:false, online:true  },
    { username:'@ux_rose',     role:'Designer',          avatar:'/user-avatar.png',       verified:true,  online:false },
    { username:'@ops_omar',    role:'DevOps',            avatar:'/user-avatar.png',       verified:false, online:false },
    { username:'@analyst_ben', role:'Analyst',           avatar:'/user-avatar.png',       verified:false, online:false },
    { username:'@ml_lina',     role:'AI Enthusiast',     avatar:'/user-avatar.png',       verified:true,  online:false },
    { username:'@founder_k',   role:'Startup Founder',   avatar:'/user-avatar.png',       verified:false, online:true  },
    { username:'@tasha_ux',    role:'Designer',          avatar:'/user-avatar.png',       verified:false, online:true  },
  ]
  const now = Date.now()
  const enriched = base.map((u, i)=> ({
    ...u,
    followedAt: now - i*90_000,
    lastActive: u.online ? now - Math.floor(Math.random()*40)*1000
                         : now - (5 + Math.floor(Math.random()*4000))*1000
  }))
  // duplicate pages to demo infinite scroll
  all.value = Array.from({length: 3}, (_,k)=>
    enriched.map(m=> ({
      ...m,
      username: `${m.username}_${k}`,
      followedAt: m.followedAt - k*3_600_000,
      lastActive: m.lastActive - k*1_800_000
    }))
  ).flat()

  list.value = all.value.slice(0, pageSize)
  page.value = 2
}

/* Lifecycle */
onMounted(async ()=>{ await seedData(); loading.value = false; mountIO() })
onBeforeUnmount(unmountIO)
</script>

<style scoped>
/* Chips & controls */
.chip{
  @apply px-2.5 py-1 rounded-full text-xs bg-white/10 border border-white/10 hover:bg-white/20 transition;
}
.chip-active{ @apply bg-cyan-600 text-[#0b1324] border-cyan-500; }

/* Dropdown menu */
.menu{
  @apply absolute right-0 mt-1 bg-[#0f172a] border border-cyan-800 rounded-xl shadow-xl p-1 z-10;
}
.menu-item{ @apply w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10; }

/* Buttons */
.btn-cyan { @apply bg-cyan-600 hover:bg-cyan-500 text-white rounded-full transition; }
.btn-dark { @apply bg-gray-700 hover:bg-gray-600 text-white rounded-full transition; }
.icon-btn { @apply w-9 h-9 rounded-full grid place-items-center bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.btn-danger{ @apply bg-rose-600 hover:bg-rose-500 text-white rounded-md transition; }

/* Utilities */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }

/* Skeleton row */
.skel{ @apply bg-[#1e293b]/80 p-3 rounded-xl border border-cyan-700/50; }
.skel-bar{
  background: linear-gradient(110deg, rgba(255,255,255,.08) 8%, rgba(255,255,255,.02) 18%, rgba(255,255,255,.08) 33%);
  background-size: 200% 100%; animation: shimmer 1.1s linear infinite;
}
@keyframes shimmer { to { background-position-x: -200% } }
</style>

<script lang="ts">
/* Inline Skeleton subcomponent (file moja) */
import { defineComponent, h } from 'vue'
export default {}
export const SkeletonRow = defineComponent({
  name: 'SkeletonRow',
  setup(){
    return () => h('div', { class: 'skel' }, [
      h('div', { class:'flex items-center gap-3' }, [
        h('div', { class:'w-11 h-11 rounded-full skel-bar' }),
        h('div', { class:'flex-1' }, [
          h('div', { class:'h-3 w-28 rounded skel-bar mb-2' }),
          h('div', { class:'h-3 w-20 rounded skel-bar' })
        ]),
        h('div', { class:'h-7 w-16 rounded-full skel-bar' })
      ])
    ])
  }
})
</script>
