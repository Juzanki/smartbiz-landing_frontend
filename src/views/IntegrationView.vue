<template>
  <div class="min-h-screen bg-[#0a1f44] text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 bg-gradient-to-b from-[#0a1f44] to-[#0a1f44]/80 backdrop-blur-sm px-4 pt-safe pb-3 border-b border-white/10">
      <div class="flex items-center justify-between gap-2">
        <h1 class="text-lg font-extrabold tracking-tight">🔌 Integrations</h1>
        <button class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold active:scale-95" @click="refresh">
          Refresh
        </button>
      </div>

      <!-- Search -->
      <div class="mt-3">
        <div class="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-cyan-300">
          <span aria-hidden="true">🔎</span>
          <input
            v-model.trim="q"
            type="search"
            placeholder="Search integrations…"
            class="w-full bg-transparent text-white/90 placeholder-white/50 outline-none text-sm"
          />
          <button v-if="q" class="text-white/60 hover:text-white" @click="q=''">✕</button>
        </div>
      </div>

      <!-- Filters -->
      <nav class="mt-3 flex gap-2 flex-wrap" role="tablist" aria-label="Integration filters">
        <button v-for="t in tabs" :key="t.key" :aria-selected="tab===t.key" role="tab"
          @click="tab=t.key"
          class="px-3 py-1.5 rounded-full text-xs font-black transition border"
          :class="tab===t.key
            ? 'bg-cyan-400 text-[#0a1f44] border-cyan-300 shadow'
            : 'bg-white/0 text-white/70 border-white/15 hover:bg-white/5'">
          {{ t.label }}
        </button>
      </nav>
    </header>

    <!-- Body -->
    <main class="px-4 py-4 pb-28">
      <!-- Skeleton -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="i in 6" :key="i" class="p-4 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
          <div class="h-5 w-1/2 bg-white/10 rounded mb-3"></div>
          <div class="h-3 w-3/4 bg-white/10 rounded mb-2"></div>
          <div class="h-3 w-2/3 bg-white/10 rounded mb-5"></div>
          <div class="h-9 w-full bg-white/10 rounded"></div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!filtered.length" class="text-center py-14">
        <div class="text-5xl mb-2">✨</div>
        <h2 class="text-lg font-extrabold">No matches</h2>
        <p class="text-white/70 text-sm">Try a different search or filter.</p>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <article
          v-for="item in filtered"
          :key="item.key"
          class="rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition p-4 flex flex-col gap-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl grid place-items-center text-[#0a1f44] font-black text-lg"
                   :class="iconBg(item.category)">
                {{ item.icon }}
              </div>
              <div class="min-w-0">
                <h3 class="font-extrabold truncate">{{ item.name }}</h3>
                <p class="text-xs text-white/70 truncate">{{ item.desc }}</p>
              </div>
            </div>
            <span class="px-2 py-1 text-[10px] font-black rounded-full"
                  :class="item.connected ? 'bg-emerald-300 text-[#0a1f44]' : 'bg-rose-300 text-[#0a1f44]'">
              {{ item.connected ? 'Connected' : 'Not connected' }}
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <span class="chip">{{ prettyCat(item.category) }}</span>
            <span v-if="item.oauth" class="chip">OAuth</span>
            <span v-if="item.beta" class="chip alt">Beta</span>
          </div>

          <div class="mt-1 text-xs text-white/60">
            <span v-if="item.connected && item.lastSync">Last sync: {{ relTime(item.lastSync) }}</span>
            <span v-else>&nbsp;</span>
          </div>

          <div class="mt-auto grid grid-cols-2 gap-2">
            <button
              v-if="!item.connected"
              class="btn primary"
              :disabled="busyKey===item.key"
              @click="connect(item)"
              :aria-label="`Connect ${item.name}`"
            >{{ busyKey===item.key ? 'Connecting…' : 'Connect' }}</button>

            <button
              v-else
              class="btn"
              :disabled="busyKey===item.key"
              @click="disconnect(item)"
              :aria-label="`Disconnect ${item.name}`"
            >{{ busyKey===item.key ? 'Disconnecting…' : 'Disconnect' }}</button>

            <button class="btn ghost" @click="openDocs(item)">Docs</button>
            <button class="btn ghost" @click="configure(item)" :disabled="!item.connected">Settings</button>
          </div>
        </article>
      </div>
    </main>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

defineOptions({ name: 'IntegrationsView' })

/** ---------- State ---------- */
const loading = ref(false)
const toast   = ref('')
const q       = ref('')
const tab     = ref('all')
const busyKey = ref('')

/** ---------- Data (replace with API) ---------- */
const items = ref([
  { key:'wa',   name:'WhatsApp Business API', icon:'📱', desc:'Send/receive WhatsApp messages.', connected:true,  oauth:true,  category:'messaging', lastSync: Date.now()-1000*60*25 },
  { key:'tg',   name:'Telegram Bot',          icon:'✈️', desc:'Automated Telegram replies & updates.', connected:false, oauth:false, category:'messaging' },
  { key:'stripe',name:'Stripe',               icon:'💳', desc:'Accept customer payments securely.', connected:true,  oauth:true,  category:'payments', lastSync: Date.now()-1000*60*60*4 },
  { key:'zap',  name:'Zapier',                icon:'⚡', desc:'Automate with thousands of apps.', connected:false, oauth:true,  category:'automation', beta:false },
  { key:'slack',name:'Slack',                 icon:'💬', desc:'Team notifications in Slack.', connected:false, oauth:true,  category:'collab' },
  { key:'sheets',name:'Google Sheets',        icon:'📊', desc:'Export reports to Sheets in real-time.', connected:false, oauth:true,  category:'sheets', beta:true },
])

/** ---------- Filters ---------- */
const tabs = [
  { key:'all', label:'All' },
  { key:'connected', label:'Connected' },
  { key:'messaging', label:'Messaging' },
  { key:'payments',  label:'Payments' },
  { key:'automation',label:'Automation' },
  { key:'collab',    label:'Collaboration' },
  { key:'sheets',    label:'Sheets' },
]

const filtered = computed(() => {
  let arr = [...items.value]
  // tab filter
  if (tab.value === 'connected') arr = arr.filter(i => i.connected)
  else if (tab.value !== 'all')  arr = arr.filter(i => i.category === tab.value)
  // search
  if (q.value) {
    const s = q.value.toLowerCase()
    arr = arr.filter(i =>
      i.name.toLowerCase().includes(s) ||
      i.desc.toLowerCase().includes(s)
    )
  }
  // sort: connected → recent sync → name
  arr.sort((a,b) => (Number(b.connected)-Number(a.connected)) || ((b.lastSync||0)-(a.lastSync||0)) || a.name.localeCompare(b.name))
  return arr
})

/** ---------- UI Helpers ---------- */
function iconBg(cat){
  if (cat==='messaging')  return 'bg-gradient-to-tr from-emerald-300 to-lime-300'
  if (cat==='payments')   return 'bg-gradient-to-tr from-sky-300 to-cyan-300'
  if (cat==='automation') return 'bg-gradient-to-tr from-amber-300 to-pink-300'
  if (cat==='collab')     return 'bg-gradient-to-tr from-fuchsia-300 to-violet-300'
  if (cat==='sheets')     return 'bg-gradient-to-tr from-lime-300 to-green-300'
  return 'bg-gradient-to-tr from-slate-200 to-slate-100'
}
function prettyCat(cat){
  return ({
    messaging:'Messaging', payments:'Payments', automation:'Automation', collab:'Collaboration', sheets:'Sheets'
  }[cat] || 'Other')
}
function relTime(ts){
  const d = Date.now() - ts
  const m = Math.floor(d/60000)
  if (m < 1)   return 'now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m/60)
  if (h < 24)  return `${h}h ago`
  const days = Math.floor(h/24)
  return `${days}d ago`
}

/** ---------- Actions (simulate async/OAuth) ---------- */
function showToast(msg){ toast.value = msg; setTimeout(()=>toast.value='', 1800) }
function refresh(){ loading.value = true; setTimeout(()=> loading.value=false, 600) }

async function connect(item){
  busyKey.value = item.key
  try {
    if (item.oauth) {
      // Placeholder: redirect to your backend OAuth start
      // window.location.href = `/api/oauth/${item.key}/start`
      await new Promise(r => setTimeout(r, 900))
    } else {
      await new Promise(r => setTimeout(r, 700))
    }
    item.connected = true
    item.lastSync  = Date.now()
    showToast(`${item.name} connected`)
  } finally {
    busyKey.value = ''
  }
}

async function disconnect(item){
  if (!confirm(`Disconnect ${item.name}?`)) return
  busyKey.value = item.key
  try {
    await new Promise(r => setTimeout(r, 700))
    item.connected = false
    showToast(`${item.name} disconnected`)
  } finally {
    busyKey.value = ''
  }
}

function openDocs(item){
  // Open docs route or external link
  alert(`Open docs for ${item.name} (hook to /docs/${item.key})`)
}
function configure(item){
  if (!item.connected) return
  alert(`Open settings for ${item.name} (hook to /integrations/${item.key}/settings)`)
}
</script>

<style scoped>
/* safe-area for iOS */
.pt-safe{ padding-top:max(1rem, env(safe-area-inset-top)); }

/* Chips & Buttons */
.chip{
  display:inline-block; padding:.2rem .5rem; border-radius:999px; font-size:10px; font-weight:900;
  background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.12);
}
.chip.alt{ background:#fde68a; color:#0a1f44; border-color:#fcd34d }

.btn{
  padding:.6rem .8rem; border-radius:12px; font-weight:900; background:#fff; color:#0a1f44; border:1px solid #e5e7eb;
}
.btn.primary{
  background:#22d3ee; color:#0a1f44; border-color:#67e8f9; box-shadow:0 10px 22px rgba(34,211,238,.25);
}
.btn.ghost{
  background:rgba(255,255,255,.06); color:#fff; border:1px solid rgba(255,255,255,.12);
}

/* Toast */
.toast{
  position:fixed; left:50%; bottom:18px; transform:translateX(-50%);
  background:#111827; color:#fff; padding:.6rem .9rem; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.18);
  z-index:50; font-weight:800;
}
.fade-enter-active,.fade-leave-active{ transition:opacity .25s }
.fade-enter-from,.fade-leave-to{ opacity:0 }
</style>
