<template>
  <div
    class="min-h-[100svh] bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white"
    :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
  >
    <!-- Header: mobile-first, sticky -->
    <header
      class="sticky top-0 z-20 bg-gradient-to-b from-[#0f172a]/90 to-[#0f172a]/60 backdrop-blur-lg border-b border-cyan-800/40"
      :style="{ paddingTop: 'max(.5rem, env(safe-area-inset-top))' }"
      role="search"
    >
      <div class="max-w-xl mx-auto px-4 pt-2 pb-3">
        <h1 class="text-2xl font-bold text-cyan-300 mb-2">👥 Your Followers</h1>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              v-model="q"
              type="search"
              inputmode="search"
              autocomplete="off"
              placeholder="Search name or @username"
              class="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="Search followers"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
          </div>
          <button class="chip" :class="{ 'chip-active': filter==='all' }" @click="setFilter('all')">All</button>
          <button class="chip" :class="{ 'chip-active': filter==='mutual' }" @click="setFilter('mutual')">Mutual</button>
          <button class="chip" :class="{ 'chip-active': filter==='verified' }" @click="setFilter('verified')">✓</button>

          <div class="relative">
            <button class="chip" @click="sortOpen = !sortOpen" :aria-expanded="sortOpen ? 'true':'false'">
              {{ sortLabel }}
            </button>
            <div
              v-if="sortOpen"
              class="menu"
              @keydown.escape="sortOpen=false"
              @click="sortOpen=false"
            >
              <button class="menu-item" @click.stop="setSort('recent')">Recent</button>
              <button class="menu-item" @click.stop="setSort('name')">Name A–Z</button>
              <button class="menu-item" @click.stop="setSort('active')">Last Active</button>
            </div>
          </div>
        </div>

        <div class="mt-2 text-xs text-white/70 flex items-center justify-between">
          <span>{{ prettyCount }} follower{{ totalCount!==1 ? 's' : '' }}</span>
          <button class="underline underline-offset-4 hover:text-cyan-300" @click="refresh">Refresh</button>
        </div>
      </div>
    </header>

    <!-- Body -->
    <main class="max-w-xl mx-auto px-4 py-4 md:max-w-4xl">
      <!-- Skeletons -->
      <div v-if="loading" class="space-y-3">
        <SkeletonCard v-for="i in 6" :key="i" />
      </div>

      <!-- List (mobile) / Grid (md+) -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 gap-3"
        role="list"
        aria-label="Followers list"
      >
        <article
          v-for="u in visible"
          :key="u.username"
          class="bg-[#1e293b]/80 p-4 rounded-xl border border-cyan-700/60 shadow-md hover:shadow-lg hover:scale-[1.01] transition"
          role="listitem"
          @click="openSheet(u)"
        >
          <div class="flex items-center gap-4">
            <div class="relative">
              <img
                :src="u.avatar"
                :alt="`${u.name} avatar`"
                class="w-12 h-12 rounded-full object-cover ring-2 ring-cyan-500/40"
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
              <p class="truncate font-semibold">
                {{ u.name }}
                <span v-if="u.verified" class="align-middle ml-1 text-cyan-300" title="Verified">✓</span>
                <span v-if="u.pro" class="ml-1 text-[10px] text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded">PRO</span>
                <span v-if="u.mutual" class="ml-1 text-[10px] text-emerald-300 bg-emerald-500/10 px-1 py-0.5 rounded">Mutual</span>
              </p>
              <p class="text-sm text-cyan-300 truncate">{{ u.username }}</p>
            </div>

            <div class="hidden sm:flex gap-2">
              <button class="btn-cyan text-xs" @click.stop="message(u)">Message</button>
              <button class="btn-dark text-xs" @click.stop="removeUser(u)">Remove</button>
            </div>
          </div>

          <p class="mt-3 text-sm text-gray-300 line-clamp-2">{{ u.bio }}</p>

          <div class="mt-4 flex items-center gap-2 sm:hidden">
            <button class="btn-cyan text-xs" @click.stop="message(u)">Message</button>
            <button class="btn-dark text-xs" @click.stop="removeUser(u)">Remove</button>
            <span class="ml-auto text-[11px] text-white/60">
              {{ u.online ? 'Active now' : `Seen ${relativeTime(u.lastActive)}` }}
            </span>
          </div>
        </article>
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

    <!-- Bottom Action Sheet (mobile) -->
    <div
      v-if="sheet.open"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      @click.self="closeSheet"
      role="dialog" aria-modal="true"
    >
      <div
        class="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-xl mx-auto bg-[#0f172a] border-t border-cyan-800 rounded-t-2xl p-3"
        :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
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
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/* Emits to parent (optional) */
const emit = defineEmits(['message','remove','follow'])

/* Data */
const loading = ref(true)
const moreLoading = ref(false)
const all = ref([])        // dataset (server)
const followers = ref([])  // rendered list (paged)
const page = ref(1)
const pageSize = 8

/* Search + Filters + Sort */
const q = ref('')
const qDebounced = ref('')
let qTimer
watch(q, (v)=>{ clearTimeout(qTimer); qTimer = setTimeout(()=> qDebounced.value = v, 220) })
const filter = ref('all')   // all | mutual | verified
const sort = ref('recent')  // recent | name | active
const sortOpen = ref(false)
const sortLabel = computed(()=> sort.value==='recent' ? 'Recent' : sort.value==='name' ? 'A–Z' : 'Active')

function setFilter(v){ filter.value = v; vibrate(4) }
function setSort(v){ sort.value = v; sortOpen.value = false; vibrate(4) }

/* Derived */
const totalCount = computed(()=> all.value.length)
const prettyCount = computed(()=> pretty(totalCount.value))
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

/* Actions */
function message(u){ if (!u) return; vibrate(8); emit('message', u) }
function removeUser(u){
  if (!u) return
  vibrate(12)
  const idxAll = all.value.findIndex(x=> x.username===u.username)
  const idxCur = followers.value.findIndex(x=> x.username===u.username)
  if (idxAll>=0) all.value.splice(idxAll,1)
  if (idxCur>=0) followers.value.splice(idxCur,1)
  closeSheet()
  emit('remove', u)
}
function followBack(u){ if (!u) return; u.mutual = true; vibrate(8); emit('follow', u) }
function muteUser(u){ vibrate(6); alert(`Muted ${u?.username}`) }

/* Avatars */
function onAvatarError(e){ e.target.src = '/user-avatar.png' }

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
  await new Promise(r=> setTimeout(r, 500)) // simulate API latency
  const start = (page.value-1) * pageSize
  const next = all.value.slice(start, start + pageSize)
  followers.value.push(...next)
  page.value++
  moreLoading.value = false
}

/* Refresh */
async function refresh(){
  vibrate(6)
  loading.value = true
  followers.value = []
  page.value = 1
  await seedData(true)
  loading.value = false
}

/* Helpers */
function pretty(n){ return n.toLocaleString?.() ?? String(n) }
function relativeTime(ts){
  if (!ts) return '—'
  const diff = Math.max(1, Math.floor((Date.now() - ts)/1000))
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff/60); if (m<60) return `${m}m ago`
  const h = Math.floor(m/60); if (h<24) return `${h}h ago`
  const d = Math.floor(h/24); return `${d}d ago`
}
function vibrate(ms){ if (navigator.vibrate) try{ navigator.vibrate(ms) }catch{} }

/* Bottom sheet */
const sheet = reactive({ open:false, user:null })
function openSheet(u){ sheet.open = true; sheet.user = u; vibrate(6) }
function closeSheet(){ sheet.open = false; sheet.user = null }

/* Mock API — badilisha na halisi */
async function seedData(force=false){
  if (all.value.length && !force) return
  await new Promise(r=> setTimeout(r, 700))
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
}

/* Lifecycle */
onMounted(async ()=>{ await seedData(); loading.value = false; mountIO() })
onBeforeUnmount(unmountIO)
</script>

<style scoped>
/* Controls */
.chip{
  @apply px-2.5 py-1 rounded-full text-xs bg-white/10 border border-white/10 hover:bg-white/20 transition;
}
.chip-active{
  @apply bg-cyan-600 text-[#0b1324] border-cyan-500;
}

/* Menu */
.menu{
  @apply absolute right-0 mt-1 bg-[#0f172a] border border-cyan-800 rounded-xl shadow-xl p-1 z-10;
}
.menu-item{
  @apply w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10;
}

/* Buttons */
.btn-cyan { @apply bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 px-3 rounded-full transition; }
.btn-dark { @apply bg-gray-700 hover:bg-gray-600 text-white py-1.5 px-3 rounded-full transition; }

/* Sheet buttons */
.sheet-btn{
  @apply w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-3 py-2 text-left;
}
.sheet-btn.warn   { @apply border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 }
.sheet-btn.danger { @apply border-rose-400/30  bg-rose-500/10  text-rose-200  hover:bg-rose-500/20 }

/* Skeleton */
.skel{ @apply bg-[#0f172a]/60 p-4 rounded-xl border border-cyan-700/60; }
.skel-bar{
  background: linear-gradient(110deg, rgba(255,255,255,.08) 8%, rgba(255,255,255,.02) 18%, rgba(255,255,255,.08) 33%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer { to { background-position-x: -200% } }
</style>

<script lang="ts">
/* Inline Skeleton subcomponent (rahisisha faili moja) */
import { defineComponent, h } from 'vue'
export default {}
export const SkeletonCard = defineComponent({
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
