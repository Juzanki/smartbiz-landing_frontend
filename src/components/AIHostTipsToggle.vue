<!-- AITipsRolesMobile.vue -->
<template>
  <!-- Floating Action Button (mobile-first) -->
  <button
    class="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-indigo-600 text-white grid place-items-center shadow-lg
           hover:bg-indigo-500 active:scale-95 transition md:bottom-6 md:right-6"
    :aria-expanded="open ? 'true' : 'false'"
    aria-controls="ai-roles-sheet"
    @click="toggle()"
  >
    🤖
    <span class="sr-only">Open AI tips & role planner</span>
  </button>

  <!-- Backdrop -->
  <div
    v-if="open"
    class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
    @click.self="close()"
  />

  <!-- Bottom Sheet -->
  <section
    v-if="open"
    id="ai-roles-sheet"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ai-roles-title"
    class="fixed inset-x-0 bottom-0 z-50 w-full max-h-[92vh] rounded-t-3xl bg-[#0b1220] text-white
           ring-1 ring-white/10 shadow-2xl animate-sheet-in md:inset-x-1/2 md:bottom-auto md:top-1/2
           md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:rounded-2xl"
    @keydown.esc="close()"
  >
    <!-- Drag handle (mobile) -->
    <div class="sm:hidden pt-2 grid place-items-center">
      <div class="h-1.5 w-12 rounded-full bg-white/20"></div>
    </div>

    <!-- Header -->
    <header class="px-4 pt-2 pb-3 flex items-center justify-between gap-3 border-b border-white/10">
      <div class="min-w-0">
        <h2 id="ai-roles-title" class="text-base font-bold text-cyan-300 truncate">
          AI Tips & Role Planner
        </h2>
        <p class="text-[11px] text-white/60">Delegate tasks, track progress, and boost live engagement</p>
      </div>
      <button
        ref="closeBtn"
        class="h-10 w-10 grid place-items-center rounded-xl bg-white/10 border border-white/15 hover:bg-white/15"
        @click="close()"
        aria-label="Close"
      >✕</button>
    </header>

    <!-- Role tabs + Assignee -->
    <div class="px-4 py-3 space-y-3 border-b border-white/10">
      <!-- Tabs (scrollable on mobile) -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          v-for="r in ROLES"
          :key="r.key"
          class="px-3 py-1.5 rounded-full text-[12px] border whitespace-nowrap transition
                 bg-white/5 border-white/10 text-white/90 hover:bg-white/10"
          :class="role === r.key ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-100' : ''"
          @click="setRole(r.key)"
        >
          {{ r.label }}
        </button>
      </div>

      <!-- Quick assignee row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div class="sm:col-span-2">
          <label class="block text-[11px] text-white/60 mb-1">Assign default person for this role</label>
          <div class="flex gap-2">
            <select
              v-model="roleState.assignee"
              class="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
              <option v-for="p in people" :key="p" :value="p">{{ p }}</option>
            </select>
            <button class="btn" @click="addPerson()">➕ Add</button>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/60 mb-1">Progress</label>
          <div class="h-9 rounded-xl border border-white/10 bg-white/5 overflow-hidden grid">
            <div
              class="bg-cyan-600"
              :style="{ width: progressPct + '%' }"
            />
          </div>
          <div class="mt-1 text-right text-[11px] text-white/70">{{ progressPct }}%</div>
        </div>
      </div>
    </div>

    <!-- Content scroll area -->
    <div class="px-4 py-4 space-y-4 overflow-y-auto" :style="scrollMax">
      <!-- Checklist -->
      <section class="rounded-2xl border border-white/10 bg-white/5 p-3">
        <h3 class="text-sm font-semibold mb-2">📋 Responsibilities</h3>
        <ul class="space-y-2">
          <li
            v-for="t in roleState.tasks"
            :key="t.id"
            class="rounded-xl border border-white/10 bg-white/5 p-3 flex items-start gap-3"
          >
            <button
              class="mt-0.5 h-5 w-5 rounded-md border border-white/20 grid place-items-center
                     bg-white/10 hover:bg-white/15"
              :class="t.done ? 'ring-2 ring-cyan-400/50' : ''"
              @click="toggleTask(t.id)"
              :aria-pressed="String(t.done)"
            >
              <span v-if="t.done">✔</span>
            </button>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xl">{{ t.emoji }}</span>
                <p class="font-medium text-sm">{{ t.title }}</p>
              </div>
              <p class="text-[12px] text-white/75 mt-1">{{ t.hint }}</p>

              <!-- Per-task assignee -->
              <div class="mt-2 flex items-center gap-2">
                <span class="text-[11px] text-white/60">Assignee:</span>
                <select
                  v-model="t.assignee"
                  class="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[12px]"
                >
                  <option :value="roleState.assignee">Default ({{ roleState.assignee }})</option>
                  <option v-for="p in people" :key="p" :value="p">{{ p }}</option>
                </select>

                <!-- Optional quick action -->
                <button
                  v-if="t.action"
                  class="btn ghost ml-auto"
                  @click="runAction(t)"
                >
                  ⚡ {{ t.action.label }}
                </button>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Tips/snippets -->
      <section class="rounded-2xl border border-white/10 bg-white/5 p-3">
        <h3 class="text-sm font-semibold mb-2">💬 Quick Scripts</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button v-for="q in quickScripts" :key="q.id" class="btn justify-between" @click="copy(q)">
            <span class="truncate">{{ q.title }}</span>
            <span class="text-white/60 text-xs">Copy</span>
          </button>
        </div>
      </section>

      <!-- Engagement boosters -->
      <section class="rounded-2xl border border-white/10 bg-white/5 p-3">
        <h3 class="text-sm font-semibold mb-2">🎯 Engagement Boosters</h3>
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button v-for="b in boosters" :key="b.id" class="chip" @click="applyBooster(b)">
            {{ b.label }}
          </button>
        </div>
        <p v-if="appliedBooster" class="text-[12px] text-white/70 mt-2">Applied: {{ appliedBooster }}</p>
      </section>
    </div>

    <!-- Footer / actions -->
    <div class="px-4 py-3 border-t border-white/10 flex items-center justify-between text-[12px] text-white/70">
      <button class="btn ghost" @click="resetRole()">↺ Reset</button>
      <div class="flex items-center gap-2">
        <button class="btn" @click="sharePlan()">🔗 Share plan</button>
        <button class="btn primary" @click="close()">Done</button>
      </div>
    </div>

    <!-- Safe area -->
    <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>

    <!-- a11y live region -->
    <span class="sr-only" role="status" aria-live="polite">{{ live }}</span>
  </section>
</template>

<script setup>
/**
 * Mobile-first AI Tips & Role Planner
 * - Floating button opens a bottom sheet
 * - Role tabs (Host, Co-Host, Moderator, Producer)
 * - Per-role checklist with task-level assignees
 * - Progress tracking, quick scripts, boosters
 * - LocalStorage persistence
 * - Copy/share helpers, subtle haptics
 */
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* ===== UI state ===== */
const open = ref(false)
const closeBtn = ref(null)
const live = ref('')

function toggle(){ open.value ? close() : openSheet() }
function openSheet(){
  open.value = true
  queueMicrotask(() => closeBtn.value?.focus())
  vibrate(8)
}
function close(){ open.value = false; vibrate(6) }
function vibrate(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/* ===== People / assignees ===== */
const people = ref(['You', 'Stella', 'Henry', 'Asha'])

function addPerson(){
  const name = prompt('Add teammate (name):')
  if (!name) return
  people.value.push(name.trim())
  live.value = `Added ${name}`
}

/* ===== Roles & tasks ===== */
const ROLES = [
  { key: 'host',      label: 'Host' },
  { key: 'cohost',    label: 'Co-Host' },
  { key: 'moderator', label: 'Moderator' },
  { key: 'producer',  label: 'Producer' }
]
const role = ref('host')

/* LocalStorage */
const LS_KEY = 'ai_role_planner_v1'

/* Role states */
const defaultState = () => ({
  assignee: 'You',
  tasks: []
})

const store = reactive({
  host:      defaultState(),
  cohost:    defaultState(),
  moderator: defaultState(),
  producer:  defaultState()
})

/* Initial tasks per role */
function baseTasks(r){
  const act = (label, fn) => ({ label, fn })
  if (r === 'host') return [
    t('🎯','Hook in first 10s','Promise 1–2 takeaways; pin it.'),
    t('🙋','Name + Echo','Call viewers by name; echo their point.'),
    t('⏱️','Loop every 90s','Re-state promise for joiners.'),
    t('🧭','Outline next segment','Tell what’s coming to reduce drop-offs.',
       act('Tease next', () => toast('Next: 3-step demo in 60s')))
  ]
  if (r === 'cohost') return [
    t('🔄','Recap baton','Every 2–3 mins, recap while host breathes.'),
    t('📌','Pin key comment','Pin or summarize a top insight.',
       act('Pin comment', () => toast('Pinned featured comment'))),
    t('🎁','Gift shoutouts','Thank by name; tie to milestone.')
  ]
  if (r === 'moderator') return [
    t('🛡️','Safety first','Filter spam; hide sensitive info.',
       act('Quick mute', () => toast('Muted user for 60s'))),
    t('🗳️','Run polls','Break monotony every 5–10 mins.',
       act('Start poll', () => toast('Poll started: Yes / No'))),
    t('🧹','Chat hygiene','Convert repeats to FAQ & pin.')
  ]
  // producer
  return [
    t('🎤','Audio check','Mic 20–25cm, AGC off, test clap <0.5s.'),
    t('🎛️','Scene switch','Every 6–8 mins: demo → Q&A → recap.',
       act('Switch scene', () => toast('Switched to Q&A scene'))),
    t('🧪','Record & backup','Local record; battery & storage OK.')
  ]
}
function t(emoji, title, hint, action){
  return {
    id: hash(`${emoji}|${title}`),
    emoji, title, hint,
    assignee: 'You',
    done: false,
    action: action ? { label: action.label, run: action.fn } : null
  }
}

/* Current role state */
const roleState = reactive({ assignee: 'You', tasks: [] })

/* Switch role */
function setRole(key){
  role.value = key
  loadRole()
}

/* Load/save */
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (saved) Object.assign(store, saved)
  } catch {}
  // seed tasks if missing
  for (const r of ROLES.map(r=>r.key)){
    if (!store[r].tasks?.length) store[r].tasks = baseTasks(r)
    if (!store[r].assignee) store[r].assignee = 'You'
  }
  loadRole()
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
function onKey(e){ if (open.value && e.key === 'Escape') close() }

function loadRole(){
  Object.assign(roleState, JSON.parse(JSON.stringify(store[role.value])))
}
watch(
  () => ({ role: role.value, state: roleState }),
  () => persistCurrentRole(),
  { deep: true }
)
function persistCurrentRole(){
  store[role.value] = JSON.parse(JSON.stringify(roleState))
  localStorage.setItem(LS_KEY, JSON.stringify(store))
}

/* Task interactions */
function toggleTask(id){
  const task = roleState.tasks.find(t => t.id === id)
  if (!task) return
  task.done = !task.done
  vibrate(8)
}
function runAction(t){
  try { t.action?.run?.() } catch {}
}

function resetRole(){
  roleState.assignee = 'You'
  roleState.tasks = baseTasks(role.value)
  persistCurrentRole()
  live.value = 'Role reset'
}

/* Progress */
const progressPct = computed(() => {
  const total = roleState.tasks.length || 1
  const done = roleState.tasks.filter(t => t.done).length
  return Math.round((done / total) * 100)
})

/* ===== Quick scripts & boosters ===== */
const quickScripts = [
  { id:'qs1', title:'“If this helps, share to 1 friend learning this.”' },
  { id:'qs2', title:'“2 mins from now I’ll reveal the shortcut—stay with me.”' },
  { id:'qs3', title:'“Drop your challenge in 5 words; I’ll pick 2 to solve.”' },
  { id:'qs4', title:'“At 5 gifts we unlock a bonus tip.”' },
]
async function copy(q){
  try{ await navigator.clipboard.writeText(q.title) }catch{}
  toast('Copied to clipboard')
  vibrate(8)
}

const boosters = [
  { id:'b1', label:'Start Poll' },
  { id:'b2', label:'Pin Comment' },
  { id:'b3', label:'Gift Milestone' },
  { id:'b4', label:'Shoutout Queue' }
]
const appliedBooster = ref('')
function applyBooster(b){
  appliedBooster.value = b.label
  toast(`${b.label} activated`)
  vibrate(8)
}

/* Share plan */
async function sharePlan(){
  const txt = renderPlanText()
  if (navigator.share){
    try{ await navigator.share({ title:'Live Plan', text: txt }) }catch{}
  } else {
    try{ await navigator.clipboard.writeText(txt) }catch{}
  }
  toast('Plan shared')
  vibrate(8)
}
function renderPlanText(){
  const rLabel = ROLES.find(x=>x.key===role.value)?.label || 'Role'
  const lines = [
    `🎬 ${rLabel} — Assignee: ${roleState.assignee}`,
    ...roleState.tasks.map(t => `- ${t.done ? '✅' : '⬜️'} ${t.emoji} ${t.title} (${t.assignee || roleState.assignee}) — ${t.hint}`)
  ]
  return lines.join('\n')
}

/* Tiny toast */
function toast(msg){
  live.value = msg
  const n = document.createElement('div')
  n.textContent = ` ${msg} `
  n.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 bg-white text-black text-sm px-3 py-1.5 rounded-xl shadow-2xl z-[100]'
  document.body.appendChild(n)
  setTimeout(()=>{ n.style.opacity='0'; n.style.transition='opacity .2s'; setTimeout(()=>n.remove(), 220)}, 1400)
}

/* Utils */
function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0 } return `t_${Math.abs(h)}` }

/* Layout helpers */
const scrollMax = computed(() => ({ maxHeight: 'calc(92vh - 190px)' }))
</script>

<style scoped>
/* Buttons */
.btn{ @apply px-3 py-1.5 rounded-lg text-sm bg-white/10 border border-white/15 hover:bg-white/15 flex items-center; }
.btn.primary{ @apply bg-cyan-600 border-cyan-600 hover:bg-cyan-700; }
.btn.ghost{ @apply bg-white/10 border-white/15 hover:bg-white/15; }

/* Chips */
.chip{ @apply px-3 py-1 rounded-full text-[12px] bg-white/10 border border-white/15 hover:bg-white/15 whitespace-nowrap; }

/* Bottom sheet entrance */
@keyframes sheetIn { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
.animate-sheet-in{ animation: sheetIn .25s ease-out both; }

/* Hide horizontal scrollbar on chips */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* iOS tap highlight */
:host, button, input, select { -webkit-tap-highlight-color: transparent; }
</style>
