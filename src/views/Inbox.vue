<template>
  <DashboardLayout>
    <div class="min-h-screen bg-[#0a1f44] text-white">
      <!-- Brand App Bar (no 'Dashboard' text) -->
      <header
        class="sticky top-0 z-20 bg-gradient-to-b from-[#0a1f44] to-[#0a1f44]/80 backdrop-blur-sm px-4 pt-safe pb-3 shadow-md border-b border-white/10"
      >
        <div class="flex items-center justify-between gap-2">
          <!-- SmartBiz brand chip -->
          <button class="brand-chip" @click="goHome">
            <img
              :src="SMARTBIZ_LOGO"
              alt="SmartBiz"
              class="h-7 w-7 rounded-xl ring-2 ring-cyan-300/50 object-cover"
              @error="logoErr=true"
              v-if="!logoErr"
            />
            <div v-else class="h-7 w-7 rounded-xl grid place-items-center bg-cyan-400 text-[#0a1f44] font-extrabold">SB</div>
            <div class="text-left leading-tight">
              <div class="font-extrabold tracking-tight">SmartBiz</div>
              <div class="text-[10px] font-black text-cyan-300/90 uppercase">Assistance</div>
            </div>
          </button>

          <div class="flex items-center gap-2">
            <button
              class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 transition text-sm font-semibold"
              @click="markAllRead"
            >
              {{ $t?.('mark_all_read') ?? 'Mark all read' }}
            </button>
            <button
              class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 transition text-sm font-semibold"
              @click="logout"
              aria-label="Logout"
              title="Logout"
            >
              🔒
            </button>
          </div>
        </div>

        <!-- Search -->
        <div class="mt-3">
          <div
            class="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-cyan-300"
          >
            <span aria-hidden="true">🔎</span>
            <input
              v-model.trim="q"
              type="search"
              :placeholder="$t?.('search_inbox') ?? 'Search inbox…'"
              class="w-full bg-transparent text-white/90 placeholder-white/50 outline-none text-sm"
              @input="debouncedFilter"
            />
            <button v-if="q" class="text-white/60 hover:text-white" @click="clearSearch">✕</button>
          </div>
        </div>

        <!-- Filters -->
        <nav class="mt-3 flex gap-2" role="tablist" aria-label="Message filters">
          <button
            v-for="t in tabs"
            :key="t.key"
            :aria-selected="tab===t.key"
            role="tab"
            @click="tab=t.key"
            class="px-3 py-1.5 rounded-full text-xs font-bold transition border"
            :class="tab===t.key
              ? 'bg-cyan-400 text-[#0a1f44] border-cyan-300 shadow'
              : 'bg-white/0 text-white/70 border-white/15 hover:bg-white/5'">
            {{ t.label }}
          </button>
        </nav>
      </header>

      <!-- Content -->
      <main class="px-4 pb-28">
        <!-- Loading skeleton -->
        <div v-if="loading" class="mt-4 space-y-3" aria-busy="true" aria-live="polite">
          <div v-for="i in 6" :key="i" class="flex items-center gap-3 p-3 bg-white/5 rounded-2xl animate-pulse">
            <div class="w-12 h-12 rounded-2xl bg-white/10"></div>
            <div class="flex-1 space-y-2">
              <div class="h-3 w-1/2 bg-white/15 rounded"></div>
              <div class="h-3 w-2/3 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!filtered.length" class="mt-12 text-center">
          <div class="text-5xl mb-2">✨</div>
          <h2 class="text-lg font-extrabold">No messages</h2>
          <p class="text-white/70 text-sm">Start promoting, chatting, or check back later.</p>
        </div>

        <!-- List -->
        <ul v-else class="mt-3 space-y-2">
          <li v-for="msg in filtered" :key="msg.id">
            <article
              class="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 active:scale-[.998] transition"
            >
              <div class="flex items-stretch">
                <!-- Avatar / Source Icon -->
                <div class="p-3">
                  <div
                    class="w-12 h-12 rounded-2xl grid place-items-center font-black text-sm text-[#0a1f44]"
                    :class="avatarBg(msg)"
                    aria-hidden="true"
                  >
                    {{ initials(msg.sender) }}
                  </div>
                </div>

                <!-- Core -->
                <div class="flex-1 py-3 pr-3">
                  <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <h3 class="truncate font-extrabold">
                          <span class="align-middle">{{ displaySender(msg.sender) }}</span>
                          <span v-if="msg.mention" class="ml-1 align-middle text-[10px] font-black px-1.5 py-0.5 rounded-full bg-fuchsia-400 text-[#0a1f44]">@mention</span>
                          <span v-if="msg.channel==='whatsapp'" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-400 text-[#0a1f44] font-black">WA</span>
                          <span v-else-if="msg.channel==='email'" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-300 text-[#0a1f44] font-black">MAIL</span>
                          <span v-else-if="msg.channel==='bot'" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-300 text-[#0a1f44] font-black">BOT</span>
                        </h3>
                        <span v-if="!msg.read" class="w-2 h-2 rounded-full bg-cyan-300 shadow shadow-cyan-300/30"></span>
                      </div>
                      <p class="truncate text-white/70 text-[13px] leading-snug">{{ msg.text }}</p>
                    </div>
                    <div class="text-right">
                      <time class="block text-[11px] text-white/60">{{ relTime(msg.timestamp) }}</time>
                      <span v-if="msg.priority==='high'" class="inline-block mt-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-400/90 text-[#0a1f44]">PRIORITY</span>
                    </div>
                  </div>

                  <!-- Quick actions -->
                  <div class="mt-3 flex gap-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                    <button class="qx" @click="toggleRead(msg)">{{ msg.read ? 'Mark unread' : 'Mark read' }}</button>
                    <button class="qx" @click="pin(msg)">{{ msg.pinned ? 'Unpin' : 'Pin' }}</button>
                    <button class="qx danger" @click="remove(msg.id)">Delete</button>
                  </div>
                </div>
              </div>
            </article>
          </li>
        </ul>

        <!-- Load more -->
        <div v-if="hasMore && !loading" class="mt-4 flex justify-center">
          <button class="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 active:scale-95" @click="loadMore">Load more</button>
        </div>
      </main>

      <!-- FAB: Compose -->
      <button
        class="fixed right-4 bottom-5 z-30 rounded-2xl px-4 py-3 font-extrabold shadow-xl bg-cyan-400 text-[#0a1f44] active:scale-95"
        @click="compose"
        aria-label="Compose new message"
      >
        ✉️ Compose
      </button>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from 'vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue' // ✅ FIX: no space!

/** ====== BRAND ====== */
const SMARTBIZ_LOGO = '/assets/smartbiz-logo.svg' // 🔁 badilisha path ya logo yako
const logoErr = ref(false)

/** ====== DEMO DATA (badilisha na API) ====== */
const allMessages = ref([
  { id: 1,  sender: '+255 789 123 456', channel: 'whatsapp', text: 'Hello, is the promo still valid?', timestamp: Date.now() - 2*60*1000, read:false, mention:false, priority:null, pinned:false },
  { id: 2,  sender: '@customer_bot',     channel: 'bot',      text: 'Thanks for your support.',       timestamp: Date.now() - 5*60*1000, read:true,  mention:true,  priority:null, pinned:false },
  { id: 3,  sender: 'support@biz.com',   channel: 'email',    text: 'Your issue has been resolved.',  timestamp: Date.now() - 60*60*1000, read:false, mention:false, priority:'high', pinned:true },
])

const loading  = ref(false)
const q        = ref('')
const tab      = ref('all')
const tabs     = [
  { key: 'all',     label: 'All' },
  { key: 'unread',  label: 'Unread' },
  { key: 'mentions',label: 'Mentions' },
  { key: 'pinned',  label: 'Pinned' },
]

/** Pagination mock */
const page      = ref(1)
const pageSize  = 10
const hasMore   = computed(() => allMessages.value.length > page.value * pageSize)

/** Derived & helpers */
const filtered = computed(() => {
  let arr = [...allMessages.value]
  if (tab.value === 'unread')    arr = arr.filter(m => !m.read)
  if (tab.value === 'mentions')  arr = arr.filter(m => m.mention)
  if (tab.value === 'pinned')    arr = arr.filter(m => m.pinned)
  if (q.value) {
    const s = q.value.toLowerCase()
    arr = arr.filter(m => (m.sender||'').toLowerCase().includes(s) || (m.text||'').toLowerCase().includes(s))
  }
  arr.sort((a,b) => (b.pinned - a.pinned) || (b.timestamp - a.timestamp))
  return arr.slice(0, page.value * pageSize)
})

function loadMore(){ page.value++ }
function clearSearch(){ q.value='' }

let debounceTimer=null
function debouncedFilter(){ clearTimeout(debounceTimer); debounceTimer=setTimeout(()=>{}, 200) }

function initials(s){
  const t = (s || '').toString().trim()
  if (!t) return 'SB'
  const parts = t.split(/[\s@._+-]+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'S'
  const last  = (parts[1]?.[0]) ?? (t[1] ?? 'B')
  return (first + last).toUpperCase()
}
function displaySender(s){ if (!s) return 'Unknown'; if (s.includes('@') && !s.startsWith('@')) return s.split('@')[0]; return s }
function relTime(ts){ const d=Date.now()-ts, m=Math.floor(d/60000); if(m<1)return'now'; if(m<60)return`${m}m`; const h=Math.floor(m/60); if(h<24)return`${h}h`; return `${Math.floor(h/24)}d` }
function avatarBg(msg){
  if (msg.channel === 'whatsapp') return 'bg-gradient-to-tr from-emerald-300 to-lime-300'
  if (msg.channel === 'email')    return 'bg-gradient-to-tr from-sky-300 to-cyan-300'
  if (msg.channel === 'bot')      return 'bg-gradient-to-tr from-amber-300 to-pink-300'
  return 'bg-gradient-to-tr from-slate-200 to-slate-100'
}
function toggleRead(m){ m.read = !m.read }
function pin(m){ m.pinned = !m.pinned }
function remove(id){ allMessages.value = allMessages.value.filter(x => x.id !== id) }
function markAllRead(){ allMessages.value.forEach(m => m.read = true) }
function compose(){ alert('Compose…') }
function logout(){ alert('Logout… (hook to your auth)') }

/** Safe navigate home even if $router is missing (prevents white screen) */
function goHome(){
  const inst = getCurrentInstance()
  const r = inst?.proxy?.$router
  if (r) r.push('/')
}
</script>

<style scoped>
/* iOS safe-area top padding */
.pt-safe{ padding-top: max(1rem, env(safe-area-inset-top)); }

/* Brand chip */
.brand-chip{
  display:flex; align-items:center; gap:.6rem; background:rgba(255,255,255,.06);
  padding:.4rem .55rem; border-radius:999px; border:1px solid rgba(255,255,255,.12);
  box-shadow:0 8px 18px rgba(2,6,23,.15);
}

/* Quick action buttons in list */
.qx{
  padding: .45rem .7rem; border-radius: 999px; font-weight: 800; font-size: 12px;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); transition: .15s;
}
.qx:hover{ background: rgba(255,255,255,.12) }
.qx.danger{ color:#ffc9c9; border-color:#ffb4b4; background: rgba(255,40,40,.08) }
</style>
