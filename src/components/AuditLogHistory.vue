<!-- AuditLogHistoryMobile.vue -->
<template>
  <div class="min-h-screen bg-white text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
    <!-- Offline banner -->
    <div
      v-if="!online"
      class="fixed top-0 inset-x-0 z-50 bg-amber-500 text-black text-center text-xs py-1.5 shadow"
      role="status"
      aria-live="polite"
    >
      ⚠️ You are offline — showing cached activity
    </div>

    <!-- Top Bar -->
    <header
      class="sticky top-0 z-40 bg-white/90 dark:bg-[#0b1220]/90 backdrop-blur border-b border-slate-200/70 dark:border-white/10"
      :class="!online ? 'mt-6' : ''"
    >
      <div class="px-4 h-14 flex items-center justify-between">
        <button
          class="h-10 w-10 grid place-items-center rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 active:scale-95 transition"
          aria-label="Go back"
          @click="goBack"
        >‹</button>

        <div class="min-w-0 w-full px-3">
          <div class="text-base font-bold truncate text-indigo-600 dark:text-indigo-300">
            Audit Log
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Track security, billing, live and system events
          </div>
        </div>

        <button
          class="h-10 w-10 grid place-items-center rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 active:scale-95 transition"
          aria-label="Filters"
          @click="openFilters = true"
        >⚙️</button>
      </div>

      <!-- Search -->
      <div class="px-4 pb-3">
        <div class="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 px-3 py-2.5">
          <span class="opacity-70">🔎</span>
          <input
            v-model.trim="query"
            type="search"
            inputmode="search"
            placeholder="Search user, action, IP, …"
            class="w-full bg-transparent outline-none text-sm placeholder:text-slate-400"
            @input="debounceFilter()"
          />
          <button
            v-if="query"
            class="text-xs text-slate-500 dark:text-slate-300 hover:underline"
            @click="query = ''; applyFilters()"
          >Clear</button>
        </div>

        <!-- Quick chips -->
        <div class="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            v-for="c in categories"
            :key="c.key"
            class="px-3 py-1.5 rounded-full text-[12px] border whitespace-nowrap transition
                   bg-white dark:bg-white/5 border-slate-200 dark:border-white/15
                   text-slate-700 dark:text-slate-200"
            :class="activeCats.has(c.key) ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-white/10'"
            @click="toggleCat(c.key)"
          >
            {{ c.label }}
          </button>
          <button class="px-3 py-1.5 rounded-full text-[12px] border bg-white dark:bg-white/5 border-slate-200 dark:border-white/15"
                  @click="resetFilters">Reset</button>
        </div>
      </div>
    </header>

    <!-- Content / Grouped list -->
    <main class="px-4 pb-24">
      <!-- Date range + export -->
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">
          Showing <span class="font-semibold text-slate-700 dark:text-slate-200">{{ filtered.length }}</span> of {{ total }} events
        </div>
        <div class="flex items-center gap-2">
          <button class="btn ghost !text-[12px]" @click="cycleRange()">{{ rangeLabel }}</button>
          <button class="btn !text-[12px]" @click="exportCSV()">⬇️ Export CSV</button>
        </div>
      </div>

      <!-- Skeletons -->
      <div v-if="loading" class="space-y-2" aria-busy="true">
        <div v-for="i in 6" :key="i" class="rounded-2xl p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 animate-pulse">
          <div class="h-4 w-1/3 bg-slate-200/80 dark:bg-white/10 rounded"></div>
          <div class="mt-3 h-3 w-2/3 bg-slate-200/70 dark:bg-white/10 rounded"></div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!Object.keys(grouped).length" class="text-center py-16 text-slate-500 dark:text-slate-400">
        <div class="text-4xl mb-2">🗂️</div>
        <p class="text-sm">No audit records match your filters.</p>
      </div>

      <!-- Groups -->
      <div v-else class="space-y-6">
        <section v-for="(items, label) in grouped" :key="label">
          <h3 class="sticky top-14 z-10 -mx-4 px-4 py-1.5 text-[11px] font-semibold tracking-wide uppercase
                     bg-white/70 dark:bg-[#0b1220]/70 backdrop-blur border-b border-white/5">
            {{ label }}
          </h3>

          <ul class="mt-2 space-y-2">
            <li v-for="item in items" :key="item.id">
              <button
                class="w-full text-left rounded-2xl p-3.5 border bg-white dark:bg-white/5
                       border-slate-200 dark:border-white/10 active:scale-[0.99] transition"
                @click="openDetail(item)"
              >
                <div class="flex items-start gap-3">
                  <div class="text-2xl" :aria-label="item.category">{{ iconFor(item.category) }}</div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-semibold truncate">{{ item.title }}</span>
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        :class="badgeClass(item.severity)"
                      >{{ item.severity }}</span>
                    </div>
                    <p class="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">
                      {{ item.summary }}
                    </p>
                    <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>👤 {{ item.actor }}</span>
                      <span>🎯 {{ item.target }}</span>
                      <span v-if="item.ip">🌐 {{ item.ip }}</span>
                    </div>
                  </div>

                  <time class="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {{ relTime(item.at) }}
                  </time>
                </div>
              </button>
            </li>
          </ul>
        </section>

        <!-- Infinite loader sentinel -->
        <div ref="sentinel" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <span v-if="hasMore">Loading more…</span>
          <span v-else>End of results</span>
        </div>
      </div>
    </main>

    <!-- Detail Bottom Sheet -->
    <div
      v-if="detail"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      @click.self="detail = null"
      @keydown.esc="detail = null"
    >
      <section
        class="fixed inset-x-0 bottom-0 w-full max-h-[85vh] rounded-t-3xl bg-white dark:bg-[#0b1220] text-slate-900 dark:text-slate-100
               ring-1 ring-slate-200/70 dark:ring-white/10 shadow-2xl animate-sheet-in"
        role="dialog"
        aria-modal="true"
      >
        <div class="sm:hidden pt-2 grid place-items-center">
          <div class="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20"></div>
        </div>

        <header class="px-4 pt-2 pb-3 flex items-center justify-between border-b border-slate-200/70 dark:border-white/10">
          <div class="min-w-0">
            <h4 class="text-base font-bold truncate">{{ detail.title }}</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ fmt(detail.at) }} • {{ detail.id }}</p>
          </div>
          <button class="h-10 w-10 grid place-items-center rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15" @click="detail = null">✕</button>
        </header>

        <div class="px-4 py-3 space-y-3 overflow-y-auto" :style="{ maxHeight: 'calc(85vh - 120px)' }">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">Actor: <b>{{ detail.actor }}</b></div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border">Target: <b>{{ detail.target }}</b></div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border">IP: <b>{{ detail.ip || '—' }}</b></div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border">Category: <b class="capitalize">{{ detail.category }}</b></div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="text-[12px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Summary</div>
            <p class="text-sm leading-relaxed">{{ detail.summary }}</p>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="text-[12px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Payload</div>
            <pre class="text-xs overflow-x-auto whitespace-pre-wrap">{{ pretty(detail.payload) }}</pre>
          </div>

          <div class="flex items-center justify-end gap-2">
            <button class="btn ghost" @click="copyJSON(detail)">📋 Copy JSON</button>
            <button class="btn" @click="detail = null">Done</button>
          </div>
        </div>

        <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
      </section>
    </div>
  </div>
</template>

<script setup>
/**
 * Mobile-first Audit Log History
 * - Search, quick category chips, date-range cycling
 * - Grouped by natural date (“Today”, “Yesterday”, “Aug 2025”)
 * - Infinite scroll (IntersectionObserver)
 * - Offline banner, export CSV, detail bottom sheet
 * - Dark mode ready, a11y labels, haptics
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const goBack = () => { try{ navigator?.vibrate?.(6) }catch{}; router.back() }

/* --------- Connectivity --------- */
const online = ref(navigator.onLine)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }
onMounted(()=>{ window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline) })
onBeforeUnmount(()=>{ window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) })

/* --------- Filters --------- */
const query = ref('')
const categories = [
  { key: 'security', label: 'Security' },
  { key: 'billing',  label: 'Billing'  },
  { key: 'live',     label: 'Live'     },
  { key: 'system',   label: 'System'   }
]
const activeCats = reactive(new Set(['security','billing','live','system']))

// date range cycles: all → 7d → 30d → today
const rangeIndex = ref(0)
const ranges = [
  { key: 'all', label: 'All time',  from: null },
  { key: '7d',  label: 'Last 7 days', from: () => Date.now() - 7*864e5 },
  { key: '30d', label: 'Last 30 days', from: () => Date.now() - 30*864e5 },
  { key: '1d',  label: 'Today', from: () => new Date().setHours(0,0,0,0) }
]
const rangeLabel = computed(()=> ranges[rangeIndex.value].label)
function cycleRange(){ rangeIndex.value = (rangeIndex.value + 1) % ranges.length; applyFilters() }

function toggleCat(key){
  if (activeCats.has(key)) activeCats.delete(key); else activeCats.add(key)
  applyFilters()
}
function resetFilters(){
  query.value = ''
  activeCats.clear(); categories.forEach(c => activeCats.add(c.key))
  rangeIndex.value = 0
  applyFilters()
}

/* --------- Data (mock) --------- */
const all = ref([])
const loading = ref(true)
const page = ref(1)
const pageSize = 40
const hasMore = ref(true)

function seed(){
  const cats = ['security','billing','live','system']
  const sev  = ['info','low','medium','high','critical']
  const names = ['You','Stella','Henry','Asha','Jon','Maya','Guest-217']
  const targets = ['Account','Invoice #1023','Stream #88','API Key','Workspace','Role: Admin']
  const items = []
  const now = Date.now()
  for (let i=0;i<180;i++){
    const at = now - Math.floor(Math.random()*45*864e5) - Math.floor(Math.random()*864e5)
    const category = cats[Math.floor(Math.random()*cats.length)]
    const severity = sev[Math.floor(Math.random()*sev.length)]
    const actor = names[Math.floor(Math.random()*names.length)]
    const target = targets[Math.floor(Math.random()*targets.length)]
    items.push({
      id: `AL-${(at+i).toString(36)}-${i}`,
      at,
      category,
      severity,
      actor,
      target,
      ip: Math.random()>.35 ? `41.${rand(0,255)}.${rand(0,255)}.${rand(0,255)}` : '',
      title: titleFor(category),
      summary: summaryFor(category, target),
      payload: { category, severity, actor, target, detail: { device: 'mobile', region: 'TZ' } }
    })
  }
  all.value = items.sort((a,b)=> b.at - a.at)
  loading.value = false
}
function titleFor(c){
  if (c==='security') return 'Login attempt'
  if (c==='billing')  return 'Payment processed'
  if (c==='live')     return 'Live session event'
  return 'System update'
}
function summaryFor(c, tgt){
  if (c==='security') return `Successful sign-in with 2FA to ${tgt}.`
  if (c==='billing')  return `Charge completed and receipt sent for ${tgt}.`
  if (c==='live')     return `Live scene switched and guest admitted to ${tgt}.`
  return `Background job finished and cache warmed for ${tgt}.`
}
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min }

/* --------- Filtering + pagination --------- */
const filtered = ref([])
const total = computed(()=> all.value.length)

function applyFilters(){
  const q = query.value.toLowerCase()
  const from = ranges[rangeIndex.value].from?.()
  let list = all.value.filter(x => activeCats.has(x.category))
  if (from) list = list.filter(x => x.at >= from)
  if (q){
    list = list.filter(x =>
      [x.title,x.summary,x.actor,x.target,x.ip,x.category,x.severity].join(' ').toLowerCase().includes(q)
    )
  }
  // reset pagination
  page.value = 1
  hasMore.value = list.length > pageSize
  filtered.value = list.slice(0, pageSize)
}
function loadMore(){
  const q = query.value.toLowerCase()
  const from = ranges[rangeIndex.value].from?.()
  let list = all.value.filter(x => activeCats.has(x.category))
  if (from) list = list.filter(x => x.at >= from)
  if (q){
    list = list.filter(x =>
      [x.title,x.summary,x.actor,x.target,x.ip,x.category,x.severity].join(' ').toLowerCase().includes(q)
    )
  }
  const start = page.value * pageSize
  const next = list.slice(start, start + pageSize)
  filtered.value.push(...next)
  page.value++
  hasMore.value = list.length > filtered.value.length
}

let debounceId
function debounceFilter(){
  clearTimeout(debounceId)
  debounceId = setTimeout(applyFilters, 180)
}

/* --------- Grouping --------- */
const grouped = computed(()=>{
  const groups = {}
  for (const item of filtered.value){
    const label = groupLabel(item.at)
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  }
  return groups
})
function groupLabel(ts){
  const d = new Date(ts)
  const today = new Date(); today.setHours(0,0,0,0)
  const yday = new Date(today); yday.setDate(yday.getDate()-1)
  const dd = new Date(d); dd.setHours(0,0,0,0)
  if (dd.getTime() === today.getTime()) return 'Today'
  if (dd.getTime() === yday.getTime())  return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

/* --------- Icons / badges / time --------- */
function iconFor(c){
  return c==='security' ? '🛡️'
    : c==='billing'    ? '💳'
    : c==='live'       ? '🎬'
    : '⚙️'
}
function badgeClass(s){
  return s==='critical' ? 'bg-rose-600 text-white'
    : s==='high'       ? 'bg-amber-500 text-black'
    : s==='medium'     ? 'bg-indigo-600 text-white'
    : s==='low'        ? 'bg-emerald-600 text-white'
    : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200'
}
function relTime(ts){
  const diff = Date.now() - ts
  const m = Math.round(diff/60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.round(m/60)
  if (h < 24) return `${h}h`
  const d = Math.round(h/24)
  return `${d}d`
}
function fmt(ts){
  return new Date(ts).toLocaleString()
}
function pretty(o){
  try { return JSON.stringify(o, null, 2) } catch { return String(o) }
}

/* --------- Detail sheet --------- */
const detail = ref(null)
function openDetail(item){ detail.value = item; try{ navigator?.vibrate?.(8) }catch{} }
async function copyJSON(item){
  try{
    await navigator.clipboard.writeText(JSON.stringify(item, null, 2))
    toast('Copied JSON')
  }catch{}
}

/* --------- Export CSV --------- */
function exportCSV(){
  const headers = ['id','timestamp','category','severity','actor','target','ip','title','summary']
  const rows = filtered.value.map(x => [
    x.id, new Date(x.at).toISOString(), x.category, x.severity, x.actor, x.target, x.ip || '',
    sanitize(x.title), sanitize(x.summary)
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${Date.now()}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
  toast('CSV exported')
}
function csvCell(v){ const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s }
function sanitize(s){ return String(s).replace(/\n/g, ' ').replace(/\s+/g,' ').trim() }

/* --------- Infinite scroll --------- */
const sentinel = ref(null)
let io
onMounted(()=>{
  seed()
  applyFilters()
  io = new IntersectionObserver((entries)=>{
    for (const e of entries){
      if (e.isIntersecting && hasMore.value && !loading.value){
        loadMore()
      }
    }
  }, { rootMargin: '120px' })
  if (sentinel.value) io.observe(sentinel.value)
})
onBeforeUnmount(()=> io?.disconnect())

/* --------- Tiny toast --------- */
function toast(msg){
  const n = document.createElement('div')
  n.textContent = ` ${msg} `
  n.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-1.5 rounded-xl shadow-2xl z-[100]'
  document.body.appendChild(n)
  setTimeout(()=>{ n.style.opacity='0'; n.style.transition='opacity .2s'; setTimeout(()=>n.remove(), 220)}, 1400)
}
</script>

<style scoped>
/* Buttons */
.btn{ @apply px-3 py-2 rounded-lg text-sm bg-slate-900 text-white border border-slate-900 hover:opacity-90 dark:bg-indigo-600 dark:border-indigo-600; }
.btn.ghost{ @apply bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-100 dark:border-white/15; }

/* Bottom sheet entrance */
@keyframes sheetIn { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
.animate-sheet-in{ animation: sheetIn .22s ease-out both; }

/* Hide horizontal scrollbar on chips */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none; }

/* Utility: line clamp */
.line-clamp-2{
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
