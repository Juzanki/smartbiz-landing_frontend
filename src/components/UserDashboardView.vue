<template>
  <section class="p-4 sm:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-white">
          Karibu tena, SmartBiz Admin!
        </h1>
        <p class="text-xs text-gray-500 dark:text-white/60">
          {{ greeting }} • {{ nowLabel }} • Africa/Dar_es_Salaam
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-secondary" @click="refresh" :title="loading ? 'Refreshing…' : 'Refresh'" aria-label="Refresh">
          <svg class="w-4 h-4" :class="loading && 'animate-spin'" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3.3 10a6.7 6.7 0 1 1 2 4.74l1.4-1.4A4.7 4.7 0 1 0 5.3 10H3.3zM10 16.7c-1.8 0-3.45-.73-4.64-1.92l-1.41 1.41A8.7 8.7 0 1 0 10 1.3v2a6.7 6.7 0 1 1 0 13.4z"/>
          </svg>
        </button>
        <button class="btn-primary" @click="exportLogsCsv">Export Logs</button>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2 mb-3">
      <button class="chip-action" @click="$emit('invite')">➕ Invite User</button>
      <button class="chip-action" @click="$emit('plans')">💳 Manage Plans</button>
      <button class="chip-action" @click="$emit('settings')">⚙️ Settings</button>
    </div>

    <!-- KPI Filters -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2 mb-2">
      <button
        v-for="r in ranges" :key="r.key"
        @click="range = r.key"
        class="px-3 h-9 rounded-full text-sm whitespace-nowrap"
        :class="range===r.key ? 'bg-blue-700 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white'"
      >{{ r.label }}</button>
    </div>

    <!-- KPI Cards: mobile rail + md grid -->
    <div class="md:grid md:grid-cols-3 gap-4 md:gap-6 mb-6">
      <div class="flex md:hidden gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-1" role="listbox">
        <KpiCard v-for="c in kpis" :key="'m-'+c.label" class="snap-start min-w-[220px]" :card="c" />
      </div>
      <KpiCard v-for="c in kpis" :key="'d-'+c.label" class="hidden md:block" :card="c" />
    </div>

    <!-- Logs Panel -->
    <div class="bg-white dark:bg-[#0b0b10] p-4 sm:p-6 rounded-xl shadow border border-gray-200 dark:border-white/10">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base sm:text-lg font-semibold text-blue-900 dark:text-white">System Logs</h2>
        <span class="text-xs text-gray-600 dark:text-white/70">{{ filtered.length }} items</span>
      </div>

      <!-- Log filters (mobile-first) -->
      <div class="flex gap-2 flex-wrap sm:flex-nowrap mb-3">
        <div class="relative flex-1 min-w-[56%]">
          <input v-model="q" type="search" inputmode="search" placeholder="Search logs (msg, id, actor)…"
                 class="w-full rounded-xl bg-gray-100 dark:bg-white/10 px-10 py-2 text-sm outline-none focus:ring-2 ring-blue-600/60" />
          <svg class="w-4 h-4 absolute left-3 top-2.5 opacity-60" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 1 0 1.06-1.06l-3.25-3.25zM12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" clip-rule="evenodd"/>
          </svg>
        </div>
        <select v-model="sev" class="chip-select">
          <option value="">All severity</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <input v-model="from" type="date" class="chip-select" :max="to || undefined" />
        <input v-model="to" type="date" class="chip-select" :min="from || undefined" />
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 4" :key="'sk'+i" class="h-12 rounded-xl bg-gray-200 dark:bg-white/10 animate-pulse"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="!paged.length" class="text-center py-10 text-gray-500 dark:text-white/60">
        <div class="text-3xl mb-2">📭</div>
        <p class="text-sm">No logs match your filters.</p>
      </div>

      <!-- Logs list -->
      <ul v-else class="divide-y divide-gray-200 dark:divide-white/10">
        <li v-for="l in paged" :key="l.id" class="py-3">
          <div class="flex items-start gap-3">
            <SeverityPill :severity="l.severity" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between">
                <p class="text-sm text-gray-800 dark:text-white/85 line-clamp-2">
                  <span class="font-medium">{{ l.actor }}</span>: {{ l.message }}
                </p>
                <button class="text-xs text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap ml-2"
                        @click="openSheet(l)">Details</button>
              </div>
              <div class="text-xs text-gray-500 dark:text-white/60 mt-0.5">
                {{ fmtDateTime(l.ts) }} • id: {{ l.id }}
              </div>
            </div>
          </div>
        </li>
      </ul>

      <!-- Pagination -->
      <div v-if="filtered.length" class="flex items-center justify-between mt-3 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-gray-600 dark:text-white/70">Rows:</span>
          <select v-model.number="perPage" class="chip-select">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-secondary" :disabled="page===1" @click="page--">Prev</button>
          <span class="text-gray-600 dark:text-white/70">Page {{ page }} / {{ totalPages }}</span>
          <button class="btn-secondary" :disabled="page===totalPages" @click="page++">Next</button>
        </div>
      </div>
    </div>

    <!-- Details Bottom Sheet -->
    <div v-if="sheetOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeSheet"></div>
      <div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] shadow-2xl">
        <div class="mx-auto w-full max-w-2xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <button @click="closeSheet" class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">✖</button>
            <h4 class="text-sm font-semibold">Log #{{ active?.id }}</h4>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-white/80 mb-2">
            <div><span class="muted">Time:</span> {{ fmtDateTime(active!.ts) }}</div>
            <div><span class="muted">Severity:</span> <SeverityPill :severity="active!.severity" /></div>
            <div><span class="muted">Actor:</span> {{ active!.actor }}</div>
            <div><span class="muted">IP:</span> {{ active!.ip }}</div>
          </div>
          <pre class="text-xs bg-gray-50 dark:bg-white/5 rounded-xl p-3 overflow-auto max-h-[40vh]">{{ jsonPretty(active!.meta) }}</pre>
          <div class="flex items-center gap-2 mt-3">
            <button class="btn-primary flex-1" @click="copyJson(active!)">Copy JSON</button>
            <button class="btn-secondary" @click="downloadAs('log-'+active!.id+'.json', JSON.stringify(active!, null, 2))">Download</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

type RangeKey = '7d'|'30d'|'90d'
type KPI = { label: string; value: string|number; delta?: number; trend?: 'up'|'down'|'flat'; series?: number[] }
type LogItem = {
  id: string
  ts: string  // ISO
  severity: 'info'|'warn'|'error'
  actor: string
  ip: string
  message: string
  meta: Record<string, any>
}

const TZ = 'Africa/Dar_es_Salaam'
const now = ref(Date.now())
let tick: number|undefined
const loading = ref(true)

const ranges = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
] as const
const range = ref<RangeKey>('30d')

/* ---------------- KPI demo data (replace with API later) ---------------- */
const seriesUsers = ref<number[]>([])   // daily active users
const seriesSignups = ref<number[]>([]) // daily signups
const seriesSubs = ref<number[]>([])    // active subs

/* ---------------- Logs (demo) ---------------- */
const logs = ref<LogItem[]>([])

/* ---------------- Filters ---------------- */
const q = ref('')
const sev = ref('')
const from = ref('')
const to = ref('')

/* ---------------- Paging ---------------- */
const page = ref(1)
const perPage = ref(10)

/* ---------------- Sheet ---------------- */
const sheetOpen = ref(false)
const active = ref<LogItem|null>(null)

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  // simulate load
  await new Promise(r=>setTimeout(r, 400))
  seedKpis(120)
  seedLogs(160)
  loading.value = false
  startClock()
})
onBeforeUnmount(() => stopClock())

function startClock(){ stopClock(); tick = window.setInterval(()=> now.value = Date.now(), 1000) }
function stopClock(){ if (tick) window.clearInterval(tick) }

/* ---------------- KPI computed ---------------- */
const slicedUsers = computed(()=>sliceRange(seriesUsers.value))
const slicedSignups = computed(()=>sliceRange(seriesSignups.value))
const slicedSubs = computed(()=>sliceRange(seriesSubs.value))

const kpis = computed<KPI[]>(() => {
  const U = buildKpi('Total Users', slicedUsers.value)
  const S = buildKpi('New Signups', slicedSignups.value)
  const A = buildKpi('Active Subscriptions', slicedSubs.value)
  return [U, S, A]
})

function buildKpi(label: string, arr: number[]): KPI {
  const last = arr[arr.length-1] ?? 0
  const first = arr[0] ?? 0
  const delta = first ? ((last-first)/first)*100 : 0
  return {
    label,
    value: new Intl.NumberFormat().format(last),
    delta: Math.round(delta*10)/10,
    trend: delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat',
    series: arr.slice(-14)
  }
}

/* ---------------- Logs filtering/sorting ---------------- */
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  const fromMs = from.value ? new Date(from.value).getTime() : -Infinity
  const toMs = to.value ? new Date(to.value).getTime()+86_400_000-1 : Infinity
  return logs.value.filter(l => {
    const t = new Date(l.ts).getTime()
    if (t < fromMs || t > toMs) return false
    if (sev.value && l.severity !== sev.value) return false
    if (!term) return true
    return [l.message, l.actor, l.id, l.ip].join(' ').toLowerCase().includes(term)
  })
})
watch([q, sev, from, to, perPage], ()=> page.value = 1)

const totalPages = computed(()=> Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const paged = computed(()=> {
  const start = (page.value-1)*perPage.value
  return filtered.value.slice(start, start+perPage.value)
})

/* ---------------- Actions ---------------- */
function refresh(){
  if (loading.value) return
  loading.value = true
  // demo jitter
  jitterLast(seriesUsers.value)
  jitterLast(seriesSignups.value)
  jitterLast(seriesSubs.value)
  logs.value.unshift(fakeLog('info'))
  setTimeout(()=> loading.value = false, 350)
}

function openSheet(l: LogItem){ active.value = l; sheetOpen.value = true }
function closeSheet(){ sheetOpen.value = false }

function copyJson(l: LogItem){ navigator.clipboard?.writeText(JSON.stringify(l, null, 2)) }
function jsonPretty(o:any){ try{return JSON.stringify(o,null,2)}catch{return String(o)} }

function downloadAs(name:string, content:string){
  const blob = new Blob([content], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}
function exportLogsCsv(){
  const rows = [['id','timestamp','severity','actor','ip','message']]
  filtered.value.forEach(l => rows.push([l.id, l.ts, l.severity, l.actor, l.ip, l.message.replace(/\n/g,' ')]))
  const csv = rows.map(r=>r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  downloadAs('logs.csv', csv)
}

/* ---------------- Helpers ---------------- */
function fmtDateTime(iso: string){
  const d = new Date(iso)
  return new Intl.DateTimeFormat(undefined, {
    dateStyle:'medium', timeStyle:'short', timeZone: TZ
  }).format(d)
}
const greeting = computed(()=>{
  const hour = new Date(now.value).getUTCHours() + 3 /* +03:00 */
  const h = (hour+24)%24
  if (h < 12) return 'Habari za asubuhi'
  if (h < 18) return 'Habari za mchana'
  return 'Habari za jioni'
})
const nowLabel = computed(()=> new Intl.DateTimeFormat(undefined,{ timeStyle:'medium', timeZone: TZ }).format(new Date(now.value)) )

function sliceRange(arr:number[]){
  const take = range.value==='7d'?7: range.value==='30d'?30:90
  return arr.slice(-take)
}
function seedKpis(days:number){
  seriesUsers.value = genWalk(days, 340, 8, 2)
  seriesSignups.value = genWalk(days, 35, 5, 3).map(v=>Math.max(5, Math.round(v)))
  seriesSubs.value = genWalk(days, 120, 5, 2)
}
function genWalk(days:number, base:number, amp:number, smooth:number){
  const out:number[] = []; let v=base
  for(let i=0;i<days;i++){ v += (Math.random()*amp - amp/2)/smooth; out.push(Math.round(Math.max(0, v))) }
  return out
}
function jitterLast(arr:number[]){ const last = arr[arr.length-1] ?? 100; arr.push(Math.max(0, last + Math.round(Math.random()*8-4))) }

function seedLogs(n:number){
  const severities:LogItem['severity'][] = ['info','warn','error']
  const actors = ['System','Aisha','David','Kelvin','API']
  const msgs = [
    'User profile updated','Subscription renewed','Payment failed','High latency detected',
    'New signup','Role changed','Webhook received','Quota nearing limit'
  ]
  const now = Date.now()
  logs.value = Array.from({length:n}).map((_,i)=> {
    const ts = new Date(now - i*36e5).toISOString() // each 1h back
    const sev = severities[Math.floor(Math.random()*severities.length)]
    const actor = actors[Math.floor(Math.random()*actors.length)]
    const message = msgs[Math.floor(Math.random()*msgs.length)]
    return fakeLog(sev, { ts, actor, message })
  })
}
function fakeLog(severity:LogItem['severity'], preset?:Partial<LogItem>){
  const id = Math.random().toString(36).slice(2,10)
  return {
    id,
    ts: preset?.ts || new Date().toISOString(),
    severity,
    actor: preset?.actor || 'System',
    ip: `102.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
    message: preset?.message || 'Background job executed',
    meta: {
      reqId: 'req_'+id,
      path: ['/auth/login','/billing/renew','/api/webhook'][Math.floor(Math.random()*3)],
      status: severity==='error'?500:200,
      ua: 'SmartBizApp/1.0'
    }
  } as LogItem
}
</script>

<script lang="ts">
/* Inline components for neatness */
import { defineComponent } from 'vue'

type KPI = { label: string; value: string|number; delta?: number; trend?: 'up'|'down'|'flat'; series?: number[] }

export default {
  components: {
    KpiCard: defineComponent({
      name:'KpiCard',
      props:{ card: { type: Object as () => KPI, required: true } },
      computed:{
        badgeCls(): string {
          const t = (this.card?.trend || 'flat') as 'up'|'down'|'flat'
          return t==='up' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
               : t==='down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
               : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70'
        }
      },
      methods:{
        path(arr:number[]){
          if(!arr?.length) return ''
          const min = Math.min(...arr), max = Math.max(...arr), rng = Math.max(1, max-min)
          return arr.map((v,i)=>{
            const x = (i/(arr.length-1))*100
            const y = 4 + (1 - (v-min)/rng)*20
            return (i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)
          }).join(' ')
        }
      },
      template: `
      <div class="bg-white dark:bg-[#0b0b10] rounded-xl shadow p-4 border border-gray-200 dark:border-white/10">
        <div class="flex items-start justify-between">
          <h3 class="text-xs sm:text-sm text-gray-600 dark:text-white/70">{{ card.label }}</h3>
          <span v-if="card.delta !== undefined" :class="['px-1.5 py-0.5 rounded text-[10px] font-semibold', badgeCls]">
            <template v-if="card.trend==='up'">▲</template>
            <template v-else-if="card.trend==='down'">▼</template>
            <template v-else>▪</template>
            {{ card.delta }}%
          </span>
        </div>
        <p class="mt-1 text-xl sm:text-2xl font-semibold text-blue-900 dark:text-white">{{ card.value }}</p>
        <svg v-if="card.series?.length" viewBox="0 0 100 28" class="mt-2 w-full h-7 text-blue-700 dark:text-blue-300">
          <defs><linearGradient id="kgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="currentColor" stop-opacity="0.35"/><stop offset="100%" stop-color="currentColor" stop-opacity="0.06"/>
          </linearGradient></defs>
          <path :d="path(card.series)" fill="url(#kgrad)"/>
          <path :d="path(card.series)" fill="none" stroke="currentColor" stroke-width="1.4"/>
        </svg>
      </div>
      `
    }),
    SeverityPill: defineComponent({
      name:'SeverityPill',
      props:{ severity: String },
      computed:{
        cls(): string {
          switch(this.severity){
            case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            case 'warn': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
            case 'error':return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            default:     return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70'
          }
        }
      },
      template:`<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold select-none" :class="cls">{{ (severity||'—').toUpperCase() }}</span>`
    })
  }
}
</script>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

.btn-primary {
  @apply h-10 px-4 rounded-xl bg-blue-700 text-white text-sm font-medium active:scale-95 disabled:opacity-50;
}
.btn-secondary {
  @apply h-10 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-sm text-gray-800 dark:text-white active:scale-95 disabled:opacity-50;
}
.chip-action {
  @apply px-3 h-9 rounded-full text-sm bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15;
}
.chip-select {
  @apply rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white
         px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-600/60;
}
.muted { @apply text-gray-500 dark:text-white/60; }

/* Safe-area padding for phones with notches */
@supports(padding:max(0px)) {
  section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}
</style>
