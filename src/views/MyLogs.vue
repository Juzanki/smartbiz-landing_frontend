<!-- src/views/MyLogs.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
        <button class="shrink-0 w-10 h-10 rounded-xl bg-white/5 grid place-content-center"
                aria-label="Back" @click="$router.back()">
          <span>⬅️</span>
        </button>
        <div class="flex-1">
          <h1 class="text-lg font-semibold leading-tight">📋 Activity Log</h1>
          <p class="text-[11px] text-white/60">Last updated: {{ lastUpdated }}</p>
        </div>
        <button class="shrink-0 w-10 h-10 rounded-xl bg-white/5 grid place-content-center"
                aria-label="Refresh" @click="refreshLogs">
          <span>🔄</span>
        </button>
      </div>

      <!-- Segmented Tabs -->
      <div class="mx-auto max-w-3xl px-4 pb-3">
        <div class="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-white/10">
          <button v-for="tab in tabs" :key="tab.label"
                  @click="currentTab = tab.label"
                  :class="[
                    'h-10 rounded-xl text-sm font-medium transition',
                    currentTab === tab.label
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-white/70 hover:bg-white/10'
                  ]">
            {{ tab.label }} ({{ tab.count }})
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="mx-auto max-w-3xl px-4 pb-28 pt-4">
      <!-- Search + switches -->
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
        <input v-model="searchQuery" type="text" inputmode="search"
               placeholder="Search logs…"
               class="h-11 w-full rounded-xl px-3 bg-white/10 text-white placeholder-white/60
                      border border-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <label class="inline-flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" v-model="autoRefresh" class="accent-cyan-500 w-4 h-4" />
          Auto refresh
        </label>
      </div>

      <p class="text-xs text-white/60 mb-3">
        Showing <span class="text-white">{{ filteredLogs.length }}</span> logs
      </p>

      <!-- Empty state -->
      <div v-if="filteredLogs.length === 0"
           class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div class="text-3xl mb-2">🔍</div>
        <p class="font-medium">No logs match your search.</p>
        <p class="text-white/60 text-sm">Try a different keyword or tab.</p>
      </div>

      <!-- Groups -->
      <section v-for="(group, dateLabel) in groupedLogs" :key="dateLabel" class="mb-6">
        <h2 class="text-[13px] font-semibold text-white/70 mb-2">{{ dateLabel }}</h2>

        <ul class="space-y-2">
          <li v-for="(log, i) in group" :key="i"
              class="rounded-2xl bg-white/5 border border-white/10 p-3.5">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/10 grid place-content-center text-xl">
                {{ getIcon(log.action) }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p class="font-medium leading-tight truncate">{{ log.action }}</p>
                  <span :class="[
                          'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                          log.type === 'System' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        ]">
                    {{ log.type }}
                  </span>
                </div>
                <p class="text-[12px] text-white/60 mt-1">
                  {{ log.timestamp }} • {{ timeAgo(log.timestamp) }}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </main>

    <!-- Floating Export Button -->
    <button @click="exportToCSV"
            class="fixed bottom-6 right-6 z-30 h-12 px-4 rounded-2xl shadow-xl
                   bg-emerald-600 hover:bg-emerald-700 active:scale-95
                   text-white font-semibold">
      📥 Export CSV
    </button>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="showToast"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30
                  bg-cyan-600 text-white text-sm px-4 py-2 rounded-xl shadow">
        🔄 Logs updated
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const logs = ref([])
const lastUpdated = ref(new Date().toLocaleString())
const searchQuery = ref('')
const autoRefresh = ref(false)
const showToast = ref(false)
const currentTab = ref('All Logs')
let intervalId = null

const loadLogs = () => {
  logs.value = [
    { action: 'User logged in',                timestamp: '2025-07-02 08:00 AM', type: 'User' },
    { action: 'System backup completed',       timestamp: '2025-07-01 10:00 PM', type: 'System' },
    { action: 'Updated profile picture',       timestamp: '2025-07-01 05:44 AM', type: 'User' },
    { action: 'Subscribed to SmartBiz Pro',    timestamp: '2025-06-30 09:21 PM', type: 'User' },
    { action: 'Accessed dashboard',            timestamp: '2025-06-30 08:00 PM', type: 'System' },
    { action: 'Changed password',              timestamp: '2025-06-29 03:15 PM', type: 'User' },
    { action: 'Logged out',                    timestamp: '2025-06-28 02:50 PM', type: 'User' }
  ]
}

const tabs = computed(() => {
  const userCount = logs.value.filter(l => l.type === 'User').length
  const sysCount  = logs.value.filter(l => l.type === 'System').length
  return [
    { label: 'All Logs',   count: logs.value.length },
    { label: 'User Logs',  count: userCount },
    { label: 'System Logs',count: sysCount }
  ]
})

const filteredLogs = computed(() =>
  logs.value
    .filter(log =>
      (currentTab.value === 'All Logs' || log.type === currentTab.value.replace(' Logs', '')) &&
      log.action.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
)

const getIcon = (action) => {
  const a = action.toLowerCase()
  if (a.includes('logged')) return '👤'
  if (a.includes('profile')) return '🖼️'
  if (a.includes('dashboard')) return '📊'
  if (a.includes('subscribed')) return '💎'
  if (a.includes('password')) return '🔐'
  if (a.includes('backup')) return '🗄️'
  return '📝'
}

const timeAgo = (ts) => {
  const d = new Date(ts)
  const diff = Math.max(0, Date.now() - d.getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const refreshLogs = () => {
  loadLogs()
  lastUpdated.value = new Date().toLocaleString()
  showToast.value = true
  setTimeout(() => (showToast.value = false), 1800)
}

const groupedLogs = computed(() => {
  const groups = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  filteredLogs.value.forEach(log => {
    const logDate = new Date(log.timestamp).toDateString()
    const label = logDate === today ? '📅 Today'
                : logDate === yesterday ? '🕓 Yesterday'
                : '📂 Older'
    ;(groups[label] ||= []).push(log)
  })
  return groups
})

const exportToCSV = () => {
  const csv = 'data:text/csv;charset=utf-8,Action,Timestamp,Type\n' +
    logs.value.map(l => `"${l.action.replace(/"/g,'""')}","${l.timestamp}","${l.type}"`).join('\n')
  const link = document.createElement('a')
  link.href = encodeURI(csv)
  link.download = `activity_logs_${Date.now()}.csv`
  document.body.appendChild(link); link.click(); link.remove()
}

watch(autoRefresh, enabled => {
  if (enabled) intervalId = setInterval(refreshLogs, 10000)
  else if (intervalId) clearInterval(intervalId)
})

onMounted(loadLogs)
</script>

<style scoped>
/* simple fade for toast */
.fade-enter-active,.fade-leave-active{ transition: opacity .25s }
.fade-enter-from,.fade-leave-to{ opacity: 0 }
</style>
