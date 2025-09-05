<template>
  <section class="w-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="min-w-0">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">Upcoming Streams</h3>
        <p class="text-xs text-gray-500 dark:text-white/60 truncate">
          Times shown in {{ tzLabel }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="reload"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label="Refresh"
          :title="loading ? 'Refreshing…' : 'Refresh'"
        >
          <svg class="w-5 h-5" :class="loading && 'animate-spin'" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3.3 10a6.7 6.7 0 1 1 2 4.74l1.4-1.4A4.7 4.7 0 1 0 5.3 10H3.3zM10 16.7c-1.8 0-3.45-.73-4.64-1.92l-1.41 1.41A8.7 8.7 0 1 0 10 1.3v2a6.7 6.7 0 1 1 0 13.4z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="relative mb-3">
      <input
        v-model="q"
        type="search"
        inputmode="search"
        placeholder="Search title, host, or tag…"
        class="w-full rounded-xl bg-gray-100 dark:bg-white/10 px-10 py-2 text-sm outline-none focus:ring-2 ring-purple-500"
      />
      <svg class="w-4 h-4 absolute left-3 top-2.5 opacity-60" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 1 0 1.06-1.06l-3.25-3.25zM12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" clip-rule="evenodd"/>
      </svg>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2">
      <button v-for="f in filters" :key="f.key" @click="activeFilter = f.key"
              class="px-3 h-9 rounded-full text-sm whitespace-nowrap"
              :class="activeFilter===f.key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15'">
        {{ f.label }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !grouped.length" class="space-y-3">
      <div v-for="i in 3" :key="'sk'+i" class="rounded-2xl overflow-hidden border border-black/5 dark:border-white/10">
        <div class="bg-gray-200 dark:bg-white/10 h-40 animate-pulse"></div>
        <div class="p-3 space-y-2">
          <div class="h-4 w-2/3 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
          <div class="h-3 w-1/2 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
          <div class="h-8 w-full bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!grouped.length" class="text-center py-10 text-gray-500 dark:text-white/60">
      <div class="text-3xl mb-2">🗓️</div>
      <p class="text-sm">No upcoming streams match your filters.</p>
    </div>

    <!-- List grouped by date -->
    <div v-else class="space-y-6">
      <div v-for="g in grouped" :key="g.title">
        <div class="sticky top-0 z-10 bg-white/80 dark:bg-[#0b0b10]/80 backdrop-blur px-0.5 py-1 mb-2">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/60">
            {{ g.title }}
          </h4>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <article
            v-for="ev in g.items"
            :key="ev.id"
            class="rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-white dark:bg-[#0b0b10] shadow-sm"
          >
            <!-- cover -->
            <div class="relative">
              <img
                :src="ev.cover || fallbackCover"
                :alt="ev.title"
                class="w-full h-40 object-cover"
                loading="lazy"
                @click="open(ev)"
              />
              <!-- featured badge -->
              <div v-if="ev.isFeatured" class="absolute left-2 top-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-500 text-black font-semibold">
                Featured
              </div>
              <!-- countdown -->
              <div class="absolute right-2 top-2 text-[11px] px-2 py-0.5 rounded bg-black/70 text-white">
                LIVE IN {{ formatCountdown(ev.start) }}
              </div>
            </div>

            <!-- body -->
            <div class="p-3">
              <h5 class="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{{ ev.title }}</h5>
              <p class="text-xs text-gray-500 dark:text-white/60 mt-0.5">
                {{ formatRange(ev.start, ev.end) }} • Host: {{ ev.hostName }}
              </p>

              <!-- tags -->
              <div v-if="ev.tags?.length" class="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                <span v-for="t in ev.tags" :key="t" class="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 dark:bg-white/10 dark:text-white whitespace-nowrap">
                  #{{ t }}
                </span>
              </div>

              <!-- actions -->
              <div class="mt-3 flex items-center gap-2">
                <button
                  @click="toggleReminder(ev)"
                  class="flex-1 h-9 rounded-xl text-sm font-medium active:scale-95 transition
                         border border-purple-600 text-purple-700 dark:text-purple-300 dark:border-purple-500"
                  :class="isReminded(ev.id) && 'bg-purple-600 text-white dark:bg-purple-600 border-transparent'"
                >
                  {{ isReminded(ev.id) ? 'Reminder set' : 'Remind me' }}
                </button>

                <a
                  :href="ev.url || '#'"
                  @click.prevent="open(ev)"
                  class="h-9 px-3 rounded-xl text-sm bg-gray-900 text-white dark:bg-white dark:text-black active:scale-95"
                >
                  Details
                </a>

                <!-- quick add-to-calendar (Google) -->
                <a
                  :href="googleCalendarLink(ev)"
                  target="_blank" rel="noopener"
                  class="h-9 px-3 rounded-xl text-sm bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15"
                  title="Add to Google Calendar"
                >
                  📅
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- Details Sheet -->
    <div v-if="sheetOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeSheet"></div>
      <div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] shadow-2xl">
        <div class="mx-auto w-full max-w-2xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <button @click="closeSheet" class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">✖</button>
            <h4 class="text-sm font-semibold">{{ active?.title }}</h4>
          </div>

          <img :src="active?.cover || fallbackCover" class="w-full h-40 object-cover rounded-xl mb-3" :alt="active?.title" />
          <p class="text-xs text-gray-600 dark:text-white/70 mb-2">
            {{ formatRange(active!.start, active!.end) }} • Host: {{ active?.hostName }}
          </p>
          <p class="text-sm text-gray-800 dark:text-white/85" v-if="active?.description">
            {{ active?.description }}
          </p>

          <div class="flex items-center gap-2 mt-3">
            <a :href="active?.url || '#'" target="_blank" rel="noopener"
               class="flex-1 h-10 rounded-xl bg-purple-600 text-white text-sm font-medium flex items-center justify-center active:scale-95">
              Open stream
            </a>
            <a :href="googleCalendarLink(active!)" target="_blank" rel="noopener"
               class="h-10 px-3 rounded-xl bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15 text-sm">
              Add to Calendar
            </a>
            <a :href="icsDataUrl(active!)" download="event.ics"
               class="h-10 px-3 rounded-xl bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15 text-sm"
               title="Download .ics">
              ICS
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type StreamEvent = {
  id: string
  title: string
  start: string | Date
  end?: string | Date
  hostName?: string
  cover?: string
  url?: string
  tags?: string[]
  isFeatured?: boolean
  viewersExpected?: number
  description?: string
  ownerId?: string
}

const props = defineProps<{
  events?: StreamEvent[]
  fetchUrl?: string            // optional API endpoint returning StreamEvent[]
  myUserId?: string            // for 'Mine' filter
  autoRefreshMs?: number       // default 5min
  timeZone?: string            // force tz; default Africa/Dar_es_Salaam
}>()

const emit = defineEmits<{
  (e: 'loaded', events: StreamEvent[]): void
  (e: 'error', error: unknown): void
  (e: 'open', ev: StreamEvent): void
  (e: 'remind', ev: { id: string; set: boolean }): void
}>()

// ---- State
const loading = ref(false)
const all = ref<StreamEvent[]>(props.events ? props.events.map(normalize) : demoEvents())
const q = ref('')
const activeFilter = ref<'all' | 'today' | 'week' | 'featured' | 'mine'>('all')
const tz = computed(() => props.timeZone || 'Africa/Dar_es_Salaam')
const tzLabel = computed(() => tz.value.replace('_',' '))
const fallbackCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop'
const now = ref(Date.now())
let tick: number | undefined
let refreshTimer: number | undefined

const sheetOpen = ref(false)
const active = ref<StreamEvent | null>(null)

// Filters model
const filters = [
  { key: 'all',      label: 'All' },
  { key: 'today',    label: 'Today' },
  { key: 'week',     label: 'This week' },
  { key: 'featured', label: 'Featured' },
  { key: 'mine',     label: 'Mine' },
] as const

// ---- Lifecycle
onMounted(async () => {
  startTick()
  if (props.fetchUrl) await fetchEvents()
  startAutoRefresh()
})
onBeforeUnmount(() => {
  stopTick()
  stopAutoRefresh()
})

watch(() => props.events, (ev) => {
  if (ev?.length) all.value = ev.map(normalize)
})

// ---- Time ticker for countdowns
function startTick() { stopTick(); tick = window.setInterval(() => now.value = Date.now(), 1000) }
function stopTick() { if (tick) window.clearInterval(tick) }

// ---- Auto-refresh
function startAutoRefresh() {
  const ms = props.autoRefreshMs ?? 5 * 60 * 1000
  stopAutoRefresh()
  if (props.fetchUrl && ms > 0) refreshTimer = window.setInterval(fetchEvents, ms)
}
function stopAutoRefresh() { if (refreshTimer) window.clearInterval(refreshTimer) }

// ---- Normalization
function normalize(e: StreamEvent): StreamEvent {
  return {
    hostName: 'Host',
    ...e,
    id: e.id || cryptoRandom(),
    start: new Date(e.start),
    end: e.end ? new Date(e.end) : addMinutes(new Date(e.start), 60),
    tags: e.tags || [],
  }
}

// ---- Fetch
async function fetchEvents() {
  loading.value = true
  try {
    const res = await fetch(props.fetchUrl as string)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as StreamEvent[]
    all.value = (data || []).map(normalize).filter(ev => (ev.start as Date).getTime() > Date.now() - 60_000) // keep future
    emit('loaded', all.value)
  } catch (e) {
    emit('error', e)
  } finally {
    loading.value = false
  }
}
function reload() { if (props.fetchUrl) fetchEvents() }

// ---- Search + Filter + Grouping
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  const todayStart = startOfDay(new Date(), tz.value)
  const weekEnd = addDays(todayStart, 7)

  return all.value.filter(ev => {
    const s = ev.start as Date
    if (activeFilter.value === 'today' && !(s >= todayStart && s < addDays(todayStart, 1))) return false
    if (activeFilter.value === 'week' && !(s >= todayStart && s < weekEnd)) return false
    if (activeFilter.value === 'featured' && !ev.isFeatured) return false
    if (activeFilter.value === 'mine' && props.myUserId && ev.ownerId !== props.myUserId) return false

    if (!term) return true
    const hay = [ev.title, ev.hostName, ...(ev.tags || [])].join(' ').toLowerCase()
    return hay.includes(term)
  }).sort((a,b) => +new Date(a.start) - +new Date(b.start))
})

const grouped = computed(() => {
  const groups: { title: string; items: StreamEvent[] }[] = []
  for (const ev of filtered.value) {
    const key = formatDayTitle(ev.start as Date, tz.value)
    let g = groups.find(x => x.title === key)
    if (!g) { g = { title: key, items: [] }; groups.push(g) }
    g.items.push(ev)
  }
  return groups
})

// ---- Actions
function open(ev: StreamEvent) {
  active.value = ev
  sheetOpen.value = true
  emit('open', ev)
}
function closeSheet() { sheetOpen.value = false }

function toggleReminder(ev: StreamEvent) {
  const set = !isReminded(ev.id)
  const list = reminderIds()
  const next = set ? Array.from(new Set([...list, ev.id])) : list.filter(x => x !== ev.id)
  localStorage.setItem('upcoming_reminders', JSON.stringify(next))
  haptic()
  emit('remind', { id: ev.id, set })

  // Best-effort local notify permission (not persistent background scheduling)
  try { Notification?.requestPermission?.() } catch {}
}

function isReminded(id: string) {
  return reminderIds().includes(id)
}
function reminderIds(): string[] {
  try { return JSON.parse(localStorage.getItem('upcoming_reminders') || '[]') } catch { return [] }
}

// ---- Calendar helpers
function googleCalendarLink(ev: StreamEvent) {
  const s = toCalDate(ev.start as Date)
  const e = toCalDate(ev.end as Date)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${s}/${e}`,
    details: (ev.description || '') + (ev.url ? `\n${ev.url}` : ''),
  })
  return `https://www.google.com/calendar/render?${params.toString()}`
}
function icsDataUrl(ev: StreamEvent) {
  const s = toCalDate(ev.start as Date)
  const e = toCalDate(ev.end as Date)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartBiz//UpcomingStreams//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@smartbiz`,
    `DTSTAMP:${toCalDate(new Date())}`,
    `DTSTART:${s}`,
    `DTEND:${e}`,
    `SUMMARY:${escapeICS(ev.title)}`,
    `DESCRIPTION:${escapeICS((ev.description || '') + (ev.url ? `\\n${ev.url}` : ''))}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines)
}
function escapeICS(s: string) { return s.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n') }

// ---- Formatting
function formatRange(start: Date | string, end?: Date | string) {
  const s = new Date(start)
  const e = end ? new Date(end) : addMinutes(s, 60)
  const df = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: tz.value })
  return `${df.format(s)}–${df.format(e)}`
}
function formatDayTitle(d: Date, zone: string) {
  const today = startOfDay(new Date(), zone)
  const df = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit', timeZone: zone })
  const title = df.format(d)
  const dd = startOfDay(d, zone).getTime()
  if (dd === today.getTime()) return `Today — ${title}`
  if (dd === addDays(today,1).getTime()) return `Tomorrow — ${title}`
  return title
}
function formatCountdown(start: Date | string) {
  const ms = new Date(start).getTime() - now.value
  if (ms <= 0) return '00:00:00'
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600).toString().padStart(2,'0')
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2,'0')
  const s = (sec % 60).toString().padStart(2,'0')
  return `${h}:${m}:${s}`
}

// ---- Utils
function toCalDate(d: Date) {
  // Google/ICS UTC basic format
  const z = new Date(d)
  return z.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/, 'Z')
}
function addMinutes(d: Date, m: number) { return new Date(d.getTime() + m*60_000) }
function addDays(d: Date, days: number) { return new Date(d.getTime() + days*86_400_000) }
function startOfDay(d: Date, zone: string) {
  // Build at midnight in target TZ by formatting and parsing
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const parts = fmt.formatToParts(d).reduce((o,p)=> (o[p.type]=p.value, o), {} as any)
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00${offsetForZone(zone)}`)
}
function offsetForZone(zone: string) {
  // Quick offset approximation (for Africa/Dar_es_Salaam = +03:00 fixed). Fallback to +00:00.
  if (zone === 'Africa/Dar_es_Salaam') return '+03:00'
  return '+00:00'
}
function cryptoRandom() {
  try {
    const a = new Uint8Array(8); crypto.getRandomValues(a)
    return Array.from(a, b => b.toString(16).padStart(2,'0')).join('')
  } catch { return String(Math.random()).slice(2) }
}
function haptic() { try { navigator.vibrate?.(15) } catch {} }

// ---- Demo data (used only if no props.events AND no fetchUrl)
function demoEvents(): StreamEvent[] {
  const base = new Date()
  const s1 = addMinutes(base, 90)
  const s2 = addMinutes(base, 240)
  const s3 = addDays(base, 1)
  return [
    {
      id: 'd1',
      title: 'SmartBiz Seller Tips — Boost Your Sales',
      start: s1,
      end: addMinutes(s1, 60),
      hostName: 'Aisha',
      isFeatured: true,
      cover: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop',
      tags: ['SmartBiz','Sales','AI'],
      url: '#',
      description: 'Practical strategies and AI tools to increase conversions on SmartBiz live shopping.'
    },
    {
      id: 'd2',
      title: 'Live Product Showcase — Fashion Friday',
      start: s2,
      end: addMinutes(s2, 90),
      hostName: 'David',
      cover: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?q=80&w=1200&auto=format&fit=crop',
      tags: ['Fashion','Trending'],
      url: '#'
    },
    {
      id: 'd3',
      title: 'Tech Unboxed — New Gadgets 2025',
      start: new Date(s3.setHours(s3.getHours()+18)),
      end: addMinutes(new Date(s3), 60),
      hostName: 'Kelvin',
      cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
      tags: ['Tech','Gadgets'],
      url: '#'
    }
  ].map(normalize)
}
</script>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
