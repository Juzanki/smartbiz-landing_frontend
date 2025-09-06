<template>
  <div
    class="min-h-[100svh] bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white"
    :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
  >
    <!-- Header -->
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

        <!-- Search + sort -->
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              ref="searchRef"
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

          <button
            class="chip"
            :class="{ 'chip-active': activeRole==='all' }"
            :aria-pressed="String(activeRole==='all')"
            @click="setRole('all')"
          >All</button>

          <div class="relative">
            <button class="chip" :aria-expanded="String(sortOpen)" aria-haspopup="menu" @click="toggleSort">
              {{ sortLabel }}
            </button>

            <!-- menu -->
            <div
              v-if="sortOpen"
              class="menu"
              role="menu"
              v-click-outside="() => (sortOpen=false)"
              @keydown.esc.stop.prevent="sortOpen=false"
            >
              <button class="menu-item" role="menuitem" @click="setSort('recent')">Recently followed</button>
              <button class="menu-item" role="menuitem" @click="setSort('name')">Name A–Z</button>
              <button class="menu-item" role="menuitem" @click="setSort('active')">Last Active</button>
            </div>
          </div>
        </div>

        <!-- dynamic role chips -->
        <div class="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            v-for="r in roleList"
            :key="r"
            class="chip shrink-0"
            :class="{ 'chip-active': activeRole===r }"
            :aria-pressed="String(activeRole===r)"
            @click="setRole(r)"
          >{{ r }}</button>
        </div>
      </div>
    </header>

    <!-- Body -->
    <main class="max-w-xl mx-auto px-4 py-4 md:max-w-4xl">
      <div v-if="loading" class="space-y-3">
        <SkeletonRow v-for="i in 6" :key="i" />
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" role="list" aria-label="Following list">
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
                @error="onAvatarError"
              />
              <span
                class="absolute -bottom-0 -right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1e293b]"
                :class="u.online ? 'bg-emerald-400' : 'bg-gray-500'"
                :title="u.online ? 'Online' : 'Offline'"
              />
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-white">
                {{ u.username }}
                <span v-if="u.verified" class="ml-1 text-cyan-300" title="Verified">✓</span>
              </p>
              <p class="text-[12px] text-gray-400 truncate">{{ u.role }}</p>
            </div>

            <div class="hidden sm:flex gap-1">
              <button class="btn-cyan text-[11px] px-2 py-1" @click.stop="message(u)">Message</button>
              <button class="btn-dark text-[11px] px-2 py-1" @click.stop="askUnfollow(u)">Unfollow</button>
            </div>

            <button class="icon-btn sm:hidden" aria-label="More" @click="openSheet(u)">⋯</button>
          </div>
        </article>
      </div>

      <p v-if="!loading && !visible.length" class="text-gray-400 italic text-center mt-16">
        You’re not following anyone (yet) that matches your filters.
      </p>

      <div ref="sentinel" class="h-10 flex items-center justify-center">
        <span v-if="moreLoading" class="text-white/60 text-sm">Loading…</span>
      </div>
    </main>

    <!-- Bottom Sheet -->
    <div
      v-if="sheet.open"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @keydown.esc="closeSheet"
      @click.self="closeSheet"
    >
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

    <!-- Confirm Unfollow -->
    <div v-if="confirm.open" class="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div class="w-full max-w-sm bg-[#0f172a] border border-cyan-800 rounded-2xl p-4 shadow-2xl">
        <h3 class="text-lg font-semibold text-cyan-300 mb-2">Unfollow user?</h3>
        <p class="text-sm text-white/80 mb-4">
          You will stop seeing updates from <span class="font-medium">{{ confirm.user?.username }}</span>.
        </p>
        <div class="flex items-center justify-end gap-2">
          <button class="btn-dark px-3 py-1.5" @click="confirm.open=false">Cancel</button>
          <button class="btn-danger px-3 py-1.5" @click="unfollow(confirm.user)">Unfollow</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, defineComponent, h } from 'vue'

defineOptions({ name: 'Following' })

/* types */
type User = {
  username: string
  role?: string
  avatar: string
  verified?: boolean
  online?: boolean
  followedAt?: number
  lastActive?: number
}

/* emits */
const emit = defineEmits<{
  (e: 'message', u: User): void
  (e: 'unfollow', u: User): void
  (e: 'refresh'): void
}>()

/* state */
const loading     = ref(true)
const moreLoading = ref(false)
const all   = ref<User[]>([])
const list  = ref<User[]>([])
const page  = ref(1)
const pageSize = 9

/* search / filter / sort */
const q = ref('')
const qDebounced = ref('')
let qTimer: any
watch(q, v => { clearTimeout(qTimer); qTimer = setTimeout(()=> (qDebounced.value = v), 220) })

const activeRole = ref<'all' | string>('all')
const sortBy     = ref<'recent' | 'name' | 'active'>('recent')
const sortOpen   = ref(false)
const sortLabel  = computed(() => sortBy.value==='recent' ? 'Recent' : sortBy.value==='name' ? 'A–Z' : 'Active')

/* sheet + confirm */
const sheet   = reactive<{ open: boolean; user: User | null }>({ open:false, user:null })
const confirm = reactive<{ open: boolean; user: User | null }>({ open:false, user:null })
function openSheet(u: User){ sheet.open = true; sheet.user = u; vibrate(6) }
function closeSheet(){ sheet.open = false; sheet.user = null }
function askUnfollow(u?: User | null){ if(!u) return; confirm.open = true; confirm.user = u; sheet.open=false; vibrate(10) }
function unfollow(u?: User | null){
  if (!u) return
  vibrate(12)
  const idxAll = all.value.findIndex(x=> x.username===u.username)
  const idxCur = list.value.findIndex(x=> x.username===u.username)
  if (idxAll>=0) all.value.splice(idxAll,1)
  if (idxCur>=0) list.value.splice(idxCur,1)
  confirm.open = false
  emit('unfollow', u)
}

/* derived */
const roleList = computed(() => {
  const set = new Set(all.value.map(u => (u.role || '').trim()).filter(Boolean))
  return Array.from(set).sort()
})
const totalCount  = computed(() => all.value.length)
const prettyCount = computed(() => totalCount.value.toLocaleString?.() ?? String(totalCount.value))

/* helpers */
function vibrate(ms:number){ if (typeof navigator !== 'undefined' && 'vibrate' in navigator) try{ navigator.vibrate(ms) }catch{} }
function onAvatarError(e: Event){ (e.target as HTMLImageElement).src = '/user-avatar.png' }
function setRole(r: string){ activeRole.value = r; vibrate(4) }
function setSort(s: 'recent'|'name'|'active'){ sortBy.value = s; sortOpen.value = false; vibrate(4) }
function toggleSort(){ sortOpen.value = !sortOpen.value; vibrate(3) }
function message(u?: User | null){ if (!u) return; vibrate(8); emit('message', u) }

/* filter/sort pipeline */
const visible = computed(() => {
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

/* infinite scroll */
const sentinel = ref<HTMLElement | null>(null)
let io: IntersectionObserver | undefined
function mountIO(){
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
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

/* refresh (public) */
async function refresh(){
  vibrate(6)
  loading.value = true
  list.value = []
  page.value = 1
  await seedData(true)
  loading.value = false
  emit('refresh')
}

/* mock API */
async function seedData(force=false){
  if (all.value.length && !force) return
  await new Promise(r=> setTimeout(r, 600))
  const base: User[] = [
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
  all.value = Array.from({length: 3}, (_,k)=>
    enriched.map(m=> ({
      ...m,
      username: `${m.username}_${k}`,
      followedAt: (m.followedAt||now) - k*3_600_000,
      lastActive: (m.lastActive||now) - k*1_800_000
    }))
  ).flat()

  list.value = all.value.slice(0, pageSize)
  page.value = 2
}

/* keyboard UX: '/' to focus search */
const searchRef = ref<HTMLInputElement | null>(null)
function onKeydown(e: KeyboardEvent){
  if (e.key === '/' && document.activeElement !== searchRef.value){
    e.preventDefault()
    searchRef.value?.focus()
  }
}

/* local subcomponent: SkeletonRow */
const SkeletonRow = defineComponent({
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

/* local directive usable as v-click-outside */
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

defineExpose({ refresh })

onMounted(async ()=>{
  await seedData()
  loading.value = false
  mountIO()
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(()=>{
  unmountIO()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* Chips & controls */
.chip{ @apply px-2.5 py-1 rounded-full text-xs bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.chip-active{ @apply bg-cyan-600 text-[#0b1324] border-cyan-500; }
/* Dropdown menu */
.menu{ @apply absolute right-0 mt-1 bg-[#0f172a] border border-cyan-800 rounded-xl shadow-xl p-1 z-10; }
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
  background-size: 200% 100%;
  animation: shimmer 1.1s linear infinite;
}
@keyframes shimmer { to { background-position-x: -200% } }
/* mobile sheet buttons */
.sheet-btn{ @apply w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10; }
.sheet-btn.warn{ @apply bg-rose-600/90 hover:bg-rose-500/90 border-rose-500/40 text-white; }
</style>
