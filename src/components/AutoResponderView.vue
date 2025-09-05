<!-- AutoRespondersMobile.vue -->
<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
    <!-- Top Bar -->
    <header
      class="sticky top-0 z-40 bg-white/90 dark:bg-[#0b1220]/90 backdrop-blur border-b border-slate-200/70 dark:border-white/10"
      :style="{ paddingTop: 'max(0px, env(safe-area-inset-top))' }"
    >
      <div class="px-4 pt-2 pb-3">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-extrabold tracking-tight">Auto Responders</h1>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Manage smart messages • <b>{{ activeCount }}</b> active of {{ responders.length }}
            </p>
          </div>

          <!-- Add new -->
          <button class="btn icon" @click="openEditor()"
                  aria-label="Create auto responder">
            ✚
          </button>
        </div>

        <!-- Search + filters -->
        <div class="mt-3 flex items-center gap-2">
          <div
            class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 border
                   border-slate-200 dark:border-white/15 flex-1"
          >
            <span class="opacity-70">🔎</span>
            <input
              v-model.trim="query"
              type="search"
              inputmode="search"
              placeholder="Search by name or description"
              class="w-full bg-transparent outline-none text-sm placeholder:text-slate-400"
              @input="debounceFilter()"
            />
            <button v-if="query" class="text-xs text-slate-500 hover:underline" @click="query=''; applyFilters()">
              Clear
            </button>
          </div>

          <select v-model="statusFilter" class="chip-select" aria-label="Filter by status" @change="applyFilters()">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="px-4 pb-24">
      <!-- Skeleton -->
      <div v-if="loading" class="space-y-3 mt-4" aria-busy="true">
        <div v-for="i in 5" :key="i" class="skeleton-card"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!filtered.length" class="text-center py-16">
        <div class="text-5xl mb-2">🤖</div>
        <p class="text-sm text-slate-500 dark:text-slate-400">No responders found</p>
        <button class="btn mt-3" @click="openEditor()">Create new</button>
      </div>

      <!-- List -->
      <ul v-else class="mt-3 space-y-3">
        <li v-for="r in filtered" :key="r.id">
          <article
            class="rounded-2xl p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm active:scale-[0.995] transition"
          >
            <div class="flex items-start gap-3">
              <!-- Status badge -->
              <div class="grid place-items-center w-10 h-10 rounded-xl"
                   :class="r.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-600 dark:bg-white/10'">
                <span>{{ r.active ? '✅' : '⏸' }}</span>
              </div>

              <!-- Meta -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h2 class="font-semibold truncate">{{ r.name }}</h2>
                  <span class="pill" :class="r.active ? 'pill-on' : 'pill-off'">
                    {{ r.active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {{ r.description || '—' }}
                </p>

                <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>⏱ Trigger: <b class="text-slate-700 dark:text-slate-200">{{ r.trigger }}</b></span>
                  <span>📤 Sends: <b class="text-slate-700 dark:text-slate-200">{{ r.channel }}</b></span>
                  <span v-if="r.delayMin">⏳ Delay: <b>{{ r.delayMin }}m</b></span>
                  <span v-if="r.stats?.sent">🧮 Sent: <b>{{ r.stats.sent }}</b></span>
                </div>
              </div>

              <!-- Overflow menu -->
              <div class="relative">
                <button class="btn icon ghost" @click="openMenu(r)">⋯</button>

                <!-- Actions menu -->
                <div
                  v-if="openMenuId === r.id"
                  class="absolute right-0 mt-2 min-w-[170px] rounded-xl bg-white dark:bg-[#0b1220]
                         border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10"
                >
                  <button class="menu-item" @click="openEditor(r)">✏️ Edit</button>
                  <button class="menu-item" @click="duplicateResponder(r)">🧬 Duplicate</button>
                  <button class="menu-item" @click="openLogs(r)">📄 View Logs</button>
                  <button class="menu-item danger" @click="removeResponder(r)">🗑 Delete</button>
                </div>
              </div>
            </div>

            <!-- Controls row -->
            <div class="mt-3 flex items-center justify-between gap-3">
              <div class="text-[11px] text-slate-500 dark:text-slate-400">
                Next run: <b>{{ nextRunLabel(r) }}</b>
              </div>

              <!-- Accessible switch -->
              <button
                class="switch"
                role="switch"
                :aria-checked="r.active ? 'true' : 'false'"
                :class="{ 'on': r.active }"
                @click="toggleResponder(r)"
              >
                <span class="knob"></span>
              </button>
            </div>
          </article>
        </li>
      </ul>
    </main>

    <!-- Floating create button (mobile reach) -->
    <button
      class="fab"
      @click="openEditor()"
      aria-label="Add responder"
      :style="{ bottom: `calc(16px + env(safe-area-inset-bottom))` }"
    >
      ✚
    </button>

    <!-- Editor Bottom Sheet -->
    <div v-if="showEditor" class="sheet-backdrop" @click.self="closeEditor()">
      <section class="sheet" role="dialog" aria-modal="true" aria-label="Responder editor">
        <div class="sheet-grip"></div>
        <header class="sheet-head">
          <h3 class="font-bold">{{ editing?.id ? 'Edit Responder' : 'New Responder' }}</h3>
          <button class="btn icon ghost" @click="closeEditor">✕</button>
        </header>

        <form class="px-4 pb-4 space-y-3" @submit.prevent="saveResponder">
          <div class="field">
            <label>Name</label>
            <input v-model.trim="form.name" required placeholder="e.g., Welcome Bot"/>
          </div>

          <div class="field">
            <label>Description</label>
            <textarea v-model.trim="form.description" rows="2" placeholder="What does this responder do?"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label>Trigger</label>
              <select v-model="form.trigger">
                <option>On Follow</option>
                <option>On First Message</option>
                <option>After Stream</option>
                <option>24h Inactive</option>
              </select>
            </div>
            <div class="field">
              <label>Channel</label>
              <select v-model="form.channel">
                <option>In-chat</option>
                <option>DM</option>
                <option>Email</option>
                <option>SMS</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label>Delay (minutes)</label>
              <input type="number" min="0" inputmode="numeric" v-model.number="form.delayMin" placeholder="0"/>
            </div>
            <div class="field flex-row">
              <label class="mr-2">Active</label>
              <button type="button" class="switch" :class="{ on: form.active }" @click="form.active=!form.active">
                <span class="knob"></span>
              </button>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between">
            <button type="button" class="btn ghost" @click="closeEditor">Cancel</button>
            <button type="submit" class="btn">Save</button>
          </div>
        </form>

        <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
      </section>
    </div>

    <!-- Logs Sheet -->
    <div v-if="showLogs" class="sheet-backdrop" @click.self="closeLogs()">
      <section class="sheet" role="dialog" aria-modal="true" aria-label="Responder logs">
        <div class="sheet-grip"></div>
        <header class="sheet-head">
          <h3 class="font-bold">Logs — {{ logsFor?.name }}</h3>
          <button class="btn icon ghost" @click="closeLogs">✕</button>
        </header>

        <div class="px-4 pb-4 max-h-[50vh] overflow-y-auto space-y-2">
          <div v-for="(entry,i) in logs" :key="i" class="log-row">
            <span class="text-[11px] text-slate-500">{{ new Date(entry.at).toLocaleString() }}</span>
            <p class="text-sm">{{ entry.msg }}</p>
          </div>
          <div v-if="!logs.length" class="text-sm text-slate-500">No logs yet.</div>
        </div>

        <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
      </section>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'

/* ---------- State ---------- */
const loading = ref(true)
const query = ref('')
const statusFilter = ref('all')
const responders = reactive([]) // will seed & persist
const filtered = ref([])
const openMenuId = ref(null)
const toast = ref('')

/* Editor */
const showEditor = ref(false)
const editing = ref(null)
const form = reactive({ id:null, name:'', description:'', trigger:'On Follow', channel:'In-chat', delayMin:0, active:true })

/* Logs */
const showLogs = ref(false)
const logsFor = ref(null)
const logs = ref([])

/* ---------- Init & persistence ---------- */
const STORAGE_KEY = 'mobile_auto_responders_v1'

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (saved?.length) responders.push(...saved)
    else seed()
  } catch { seed() }
  applyFilters()
  setTimeout(()=> loading.value = false, 300) // subtle skeleton
})

function seed(){
  responders.splice(0)
  responders.push(
    { id: 1, name: 'Welcome Bot', description:'Greets new users with a warm message.', trigger:'On Follow', channel:'DM', delayMin:0, active:true, stats: { sent: 218 } },
    { id: 2, name: 'Follow-Up', description:'Sends a check-in after 24 hours.', trigger:'24h Inactive', channel:'DM', delayMin:1440, active:false, stats: { sent: 92 } },
    { id: 3, name: 'Promo Push', description:'Shares timely promotions to viewers.', trigger:'On First Message', channel:'In-chat', delayMin:2, active:true, stats: { sent: 341 } }
  )
  persist()
}
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(responders)) }

/* ---------- Filtering ---------- */
let debTimer
function debounceFilter(){ clearTimeout(debTimer); debTimer = setTimeout(applyFilters, 160) }
function applyFilters(){
  const q = query.value.toLowerCase()
  const st = statusFilter.value
  const list = responders.filter(r => {
    const okQ = !q || [r.name, r.description, r.trigger, r.channel].join(' ').toLowerCase().includes(q)
    const okS = st === 'all' || (st === 'active' ? r.active : !r.active)
    return okQ && okS
  })
  filtered.value = list
  openMenuId.value = null
}

const activeCount = computed(() => responders.filter(r => r.active).length)

/* ---------- Actions ---------- */
function toggleResponder(r){
  r.active = !r.active
  vibrate(8)
  persist()
  applyFilters()
  showToast(r.active ? 'Responder activated' : 'Responder paused')
}

function openMenu(r){
  openMenuId.value = openMenuId.value === r.id ? null : r.id
}

function removeResponder(r){
  if (!confirm(`Delete "${r.name}"?`)) return
  const i = responders.findIndex(x => x.id === r.id)
  if (i >= 0) responders.splice(i,1)
  persist(); applyFilters()
  showToast('Deleted')
}

function duplicateResponder(r){
  const copy = { ...r, id: Date.now(), name: `${r.name} (copy)`, stats: { sent: 0 } }
  responders.unshift(copy)
  persist(); applyFilters()
  showToast('Duplicated')
}

/* ---------- Editor ---------- */
function openEditor(r = null){
  editing.value = r
  if (r) Object.assign(form, r)
  else Object.assign(form, { id:null, name:'', description:'', trigger:'On Follow', channel:'In-chat', delayMin:0, active:true })
  showEditor.value = true
  vibrate(6)
}
function closeEditor(){ showEditor.value = false; editing.value = null }

function saveResponder(){
  const payload = { ...form }
  if (!payload.name.trim()) return showToast('Name is required')

  if (editing.value){ // update
    const i = responders.findIndex(x => x.id === editing.value.id)
    if (i >= 0) responders[i] = { ...responders[i], ...payload }
    showToast('Saved changes')
  } else { // create
    payload.id = Date.now()
    payload.stats = { sent: 0 }
    responders.unshift(payload)
    showToast('Responder created')
  }
  persist(); applyFilters(); closeEditor()
}

/* ---------- Logs ---------- */
function openLogs(r){
  logsFor.value = r
  logs.value = mockLogs(r)
  showLogs.value = true
}
function closeLogs(){ showLogs.value = false; logsFor.value = null; logs.value = [] }
function mockLogs(r){
  const now = Date.now()
  return [
    { at: now - 2*3600e3, msg: `Sent "${r.name}" to @kayla` },
    { at: now - 26*3600e3, msg: `Rule triggered by viewer count threshold` },
    { at: now - 48*3600e3, msg: `Edited description` }
  ]
}

/* ---------- Helpers ---------- */
function nextRunLabel(r){
  if (!r.active) return 'paused'
  const mins = Math.max(0, r.delayMin || 0)
  if (mins === 0) return 'immediate'
  if (mins < 60) return `~${mins}m`
  const h = Math.round(mins/60)
  return `~${h}h`
}

function showToast(msg){
  toast.value = msg
  clearTimeout(showToast._t)
  showToast._t = setTimeout(()=> toast.value = '', 1500)
}
function vibrate(ms=8){ try{ navigator?.vibrate?.(ms) }catch{} }
</script>

<style scoped>
/* Buttons */
.btn{
  @apply px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 border border-indigo-600 text-white
         hover:bg-indigo-700 active:scale-95 transition;
}
.btn.ghost{
  @apply bg-white/10 border-white/15 text-white hover:bg-white/15;
}
.btn.icon{
  @apply grid place-items-center w-10 h-10 rounded-xl bg-slate-900 text-white border border-slate-900;
}
.btn.icon.ghost{
  @apply bg-white/10 text-white border-white/15;
}

/* Select chip */
.chip-select{
  @apply px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-sm;
}

/* Pills */
.pill{ @apply px-2 py-0.5 rounded-full text-[10px] font-bold border; }
.pill-on{ @apply bg-emerald-500 text-white border-emerald-500; }
.pill-off{ @apply bg-slate-200 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10; }

/* Switch */
.switch{
  --w: 44px; --h: 26px;
  width: var(--w); height: var(--h); border-radius: 999px; position: relative;
  background: rgba(100,116,139,.25); border: 1px solid rgba(100,116,139,.35);
  transition: background .2s ease, border-color .2s ease;
}
.switch.on{ background: #10b981; border-color: #10b981; }
.switch .knob{
  position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; border-radius: 999px;
  background: #fff; transition: transform .2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,.25);
}
.switch.on .knob{ transform: translateX(18px); }

/* Menu */
.menu-item{
  @apply w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/10 transition;
}
.menu-item.danger{ @apply text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10; }

/* FAB */
.fab{
  @apply fixed right-4 grid place-items-center w-14 h-14 rounded-full shadow-2xl text-white text-2xl
         bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition;
  z-index: 60;
}

/* Bottom sheet */
.sheet-backdrop{
  @apply fixed inset-0 bg-black/60 backdrop-blur-sm z-50;
}
.sheet{
  @apply fixed inset-x-0 bottom-0 w-full max-w-xl mx-auto rounded-t-3xl bg-white dark:bg-[#0b1220]
         text-slate-900 dark:text-slate-100 ring-1 ring-slate-200/70 dark:ring-white/10 shadow-2xl;
  animation: sheetIn .22s ease-out both;
}
.sheet-grip{ @apply pt-2 grid place-items-center; }
.sheet-grip::after{
  content:''; @apply block h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20;
}
.sheet-head{ @apply px-4 pt-1 pb-3 flex items-center justify-between border-b border-slate-200/70 dark:border-white/10; }

/* Fields */
.field{ @apply flex flex-col; }
.field.flex-row{ @apply flex-row items-center; }
.field > label{ @apply text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300; }
.field > input,
.field > select,
.field > textarea{
  @apply w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm
         outline-none focus:ring-2 focus:ring-indigo-400/70;
}

/* Logs */
.log-row{ @apply rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white dark:bg-white/5; }

/* Toast */
.toast{
  @apply fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-3 py-1.5 rounded-lg shadow-2xl z-[70];
  animation: fadeToast .2s ease, fadeOut 1.5s 1.1s forwards;
}

/* Skeleton */
.skeleton-card{
  @apply h-24 rounded-2xl bg-slate-200/70 dark:bg-white/10 border border-slate-200 dark:border-white/10;
  animation: pulse 1.3s infinite ease-in-out;
}

/* Animations */
@keyframes sheetIn{ from{ transform: translateY(18px); opacity: 0 } to{ transform: translateY(0); opacity: 1 } }
@keyframes pulse{ 0%,100%{ opacity:.85 } 50%{ opacity: .55 } }
@keyframes fadeToast{ from{ opacity:0; transform: translateY(6px)} to{ opacity:1; transform: translateY(0)} }
@keyframes fadeOut{ to{ opacity:0 } }

/* Utilities */
.line-clamp-2{
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
</style>
