<template>
  <div class="page">

    <!-- Top bar -->
    <div class="top">
      <h1 class="title">📅 Scheduled Promotions</h1>

      <div class="top-actions">
        <div class="search-wrap">
          <input
            v-model.trim="search"
            type="search"
            class="input"
            placeholder="Search title, message or channel…"
            @input="applyFilters"
          />
        </div>

        <button class="btn btn-green" @click="openModal">
          <span>➕</span> <b>Schedule</b>
        </button>
      </div>

      <!-- Quick filters -->
      <div class="chips" role="tablist" aria-label="status filters">
        <button
          v-for="s in statusesUi"
          :key="s.value"
          class="chip"
          :class="{ active: statusFilter === s.value }"
          @click="setStatus(s.value)"
          role="tab"
        >
          <span class="dot" :style="{ background: s.color }"></span>{{ s.label }}
        </button>

        <div class="select-wrap">
          <select v-model="channelFilter" class="select" @change="applyFilters">
            <option value="">All Channels</option>
            <option v-for="c in channels" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Content -->
    <section v-if="filtered.length" class="grid">
      <article v-for="p in filtered" :key="p.id" class="card">
        <header class="card__header">
          <h3 class="card__title">{{ p.title }}</h3>
          <span class="badge" :class="`badge--${p.status.toLowerCase()}`">{{ p.status }}</span>
        </header>

        <p class="muted clamp-2">{{ p.message }}</p>

        <div class="meta">
          <span class="pill">{{ p.channel }}</span>
          <span class="meta-line">
            <i class="i">🗓️</i>
            {{ fmtDate(p.date) }} • {{ p.time }}
          </span>
        </div>

        <div class="nextrun" v-if="p.status === 'Scheduled'">
          <i class="i">⏱️</i> Runs in <b>{{ timeToGo(p.date, p.time) }}</b>
        </div>

        <footer class="card__footer">
          <button class="btn btn-outline" @click="viewPromotion(p.id)">View</button>
          <div class="grow"></div>
          <button class="icon-btn" title="Duplicate" @click="duplicate(p)">📄</button>
          <button class="icon-btn" title="Delete" @click="remove(p.id)">🗑️</button>
        </footer>
      </article>
    </section>

    <!-- Empty state -->
    <section v-else class="empty">
      <img src="https://cdn-icons-png.flaticon.com/512/747/747310.png" alt="" />
      <h3>No promotions scheduled</h3>
      <p class="muted">Plan your next campaign by tapping the green button above.</p>
      <button class="btn btn-green" @click="openModal">➕ Schedule your first promotion</button>
    </section>

    <!-- Modal -->
    <transition name="fade">
      <div v-if="showModal" class="backdrop" @click.self="closeModal" aria-modal="true" role="dialog">
        <div class="modal">
          <header class="modal__header">
            <h3>📝 Schedule New Promotion</h3>
            <button class="icon-btn" @click="closeModal" aria-label="Close">✖️</button>
          </header>

          <form @submit.prevent="submit" novalidate>
            <div class="field">
              <label>Title</label>
              <input v-model.trim="form.title" class="input" type="text" placeholder="E.g., Weekend Sale 15%" required />
            </div>

            <div class="field">
              <label>Message <small class="muted">({{ msgCount }} chars)</small></label>
              <textarea v-model.trim="form.message" class="textarea" rows="4" required
                        placeholder="Short, clear message for your audience…"></textarea>
              <div class="muted tiny">{{ msgHint }}</div>
            </div>

            <div class="field">
              <label>Channel</label>
              <select v-model="form.channel" class="select" required>
                <option value="">-- Select --</option>
                <option v-for="c in channels" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>

            <div class="grid-2">
              <div class="field">
                <label>Date</label>
                <input v-model="form.date" class="input" type="date" required />
              </div>
              <div class="field">
                <label>Time</label>
                <input v-model="form.time" class="input" type="time" required />
              </div>
            </div>

            <footer class="modal__footer">
              <button class="btn" type="button" @click="closeModal">Cancel</button>
              <button class="btn btn-primary" type="submit" :disabled="!canSave">Save</button>
            </footer>
          </form>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* Data */
const promotions = ref([])
const channels = ['WhatsApp', 'Telegram', 'SMS', 'Email']

/* Filters */
const search = ref('')
const statusFilter = ref('')   // '', 'Scheduled', 'Sent', 'Failed'
const channelFilter = ref('')  // '', or channel

const statusesUi = [
  { value: '', label: 'All', color: '#64748b' },
  { value: 'Scheduled', label: 'Scheduled', color: '#16a34a' },
  { value: 'Sent', label: 'Sent', color: '#0ea5e9' },
  { value: 'Failed', label: 'Failed', color: '#ef4444' },
]

/* Modal form */
const showModal = ref(false)
const form = ref({
  title: '',
  message: '',
  channel: '',
  date: '',
  time: '',
  status: 'Scheduled',
})

/* Load saved items */
onMounted(() => {
  const saved = JSON.parse(localStorage.getItem('my_promotions') || '[]')
  promotions.value = saved
})

/* Helpers */
function fmtDate(d){ try{ return new Date(d).toLocaleDateString() } catch { return d } }
function timeToGo(d, t){
  const target = new Date(`${d}T${t}`)
  const ms = target - new Date()
  if (ms <= 0) return 'now'
  const sec = Math.floor(ms/1000)
  const days = Math.floor(sec/86400)
  const hours = Math.floor((sec%86400)/3600)
  const mins = Math.floor((sec%3600)/60)
  if (days)  return `${days}d ${hours}h`
  if (hours) return `${hours}h ${mins}m`
  return `${mins}m`
}
function isFuture(d,t){ return new Date(`${d}T${t}`) > new Date() }

/* Filtering + sorting (upcoming first) */
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = promotions.value
    .filter(p => (statusFilter.value ? p.status === statusFilter.value : true))
    .filter(p => (channelFilter.value ? p.channel === channelFilter.value : true))
    .filter(p =>
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.message.toLowerCase().includes(q) ||
      p.channel.toLowerCase().includes(q)
    )
    .slice()
    .sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time))

  return list
})

function setStatus(val){ statusFilter.value = val; applyFilters() }
function applyFilters(){ /* computed handles it; keep for future debounce */ }

/* Modal actions */
function openModal(){
  showModal.value = true
  // Default date/time: next full hour
  const now = new Date()
  const next = new Date(now.getTime() + 60*60*1000)
  form.value = {
    title: '',
    message: '',
    channel: '',
    date: next.toISOString().slice(0,10),
    time: `${String(next.getHours()).padStart(2,'0')}:${String(next.getMinutes()).padStart(2,'0')}`,
    status: 'Scheduled',
  }
}
function closeModal(){ showModal.value = false }

const msgCount = computed(() => (form.value.message || '').length)
const msgHint = computed(() => {
  switch(form.value.channel){
    case 'SMS': return 'Tip: Keep under ~320 chars to avoid many segments.'
    case 'Email': return 'A clear, short preview improves open rates.'
    default: return 'Keep it clear and action-oriented.'
  }
})
const canSave = computed(() =>
  form.value.title && form.value.message && form.value.channel && form.value.date && form.value.time &&
  isFuture(form.value.date, form.value.time)
)

function submit(){
  if (!canSave.value) return
  promotions.value.push({ id: Date.now(), ...form.value })
  localStorage.setItem('my_promotions', JSON.stringify(promotions.value))
  closeModal()
}

/* Card actions */
function viewPromotion(id){ router.push(`/promotion-profile/${id}`) }
function remove(id){
  if (!confirm('Delete this promotion?')) return
  promotions.value = promotions.value.filter(p => p.id !== id)
  localStorage.setItem('my_promotions', JSON.stringify(promotions.value))
}
function duplicate(p){
  const copy = { ...p, id: Date.now(), title: `${p.title} (copy)` }
  promotions.value.push(copy)
  localStorage.setItem('my_promotions', JSON.stringify(promotions.value))
}
</script>

<style scoped>
:root{
  --bg:#f8fafc;
  --card:#ffffff;
  --line:#e2e8f0;
  --text:#0f172a;
  --muted:#64748b;
  --brand:#0A1C3D;
  --green:#16a34a;
  --blue:#0ea5e9;
  --red:#ef4444;
  --gold:#ffd700;
}

/* Layout */
.page{ padding:16px; background:var(--bg); color:var(--text); }
.top{ display:flex; flex-direction:column; gap:10px; margin-bottom:10px; }
.title{ font-size:1.35rem; font-weight:800; color:var(--brand); margin:0; }

/* Top actions */
.top-actions{ display:flex; gap:8px; align-items:center; }
.search-wrap{ flex:1; }
.input{
  width:100%; border:1px solid var(--line); border-radius:12px;
  padding:.65rem .85rem; background:#fff; outline:none;
}
.input:focus{ border-color:var(--gold); box-shadow:0 0 0 2px #ffd70055; }

/* Chips & filters */
.chips{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:6px; }
.chip{
  border:1px solid var(--line); background:#fff; border-radius:999px;
  padding:.35rem .75rem; font-weight:700; font-size:.85rem;
}
.chip.active{ border-color:var(--gold); box-shadow:0 0 0 2px #ffd70033; }
.dot{ width:.6rem; height:.6rem; border-radius:999px; display:inline-block; margin-right:.4rem; }
.select-wrap{ margin-left:auto; }
.select{
  border:1px solid var(--line); border-radius:10px; padding:.5rem .7rem; background:#fff;
}

/* Grid of cards */
.grid{
  display:grid; gap:12px;
  grid-template-columns: 1fr;
}

/* Card */
.card{
  background:var(--card); border:1px solid var(--line); border-radius:16px;
  padding:12px; box-shadow:0 8px 24px rgba(2,6,23,.04);
  display:flex; flex-direction:column; gap:8px;
}
.card__header{ display:flex; align-items:center; gap:8px; }
.card__title{ font-size:1.05rem; font-weight:800; margin:0; flex:1; }
.badge{
  padding:.25rem .6rem; border-radius:999px; font-weight:800; font-size:.75rem;
}
.badge--scheduled{ background:#dcfce7; color:#166534; }
.badge--sent{ background:#e0f2fe; color:#075985; }
.badge--failed{ background:#fee2e2; color:#991b1b; }

.muted{ color:var(--muted); }
.tiny{ font-size:.8rem; }
.clamp-2{
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}

.meta{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.pill{
  background:#f1f5f9; color:#0f172a; border-radius:999px; padding:.25rem .55rem; font-weight:700; font-size:.8rem;
}
.meta-line{ color:var(--muted); display:flex; align-items:center; gap:6px; }
.i{ opacity:.85 }

.nextrun{
  background:#fffbeb; border:1px dashed #fde68a; color:#854d0e;
  padding:.35rem .6rem; border-radius:12px; font-size:.9rem; display:flex; gap:6px; align-items:center;
}

.card__footer{ display:flex; align-items:center; gap:8px; margin-top:4px; }
.grow{ flex:1; }
.btn{
  border:1px solid var(--line); background:#fff; color:var(--text);
  padding:.55rem .9rem; border-radius:10px; font-weight:700;
}
.btn-primary{ background:var(--brand); color:#fff; border-color:transparent; }
.btn-green{ background:var(--green); color:#fff; border-color:transparent; }
.btn-outline{ background:#fff; }
.icon-btn{
  border:1px solid var(--line); background:#fff; border-radius:10px;
  width:36px; height:36px; display:grid; place-content:center;
}

/* Empty */
.empty{
  text-align:center; padding:48px 12px;
  display:flex; flex-direction:column; align-items:center; gap:10px;
}
.empty img{ width:120px; height:120px; opacity:.9; }

/* Modal */
.backdrop{
  position:fixed; inset:0; background:rgba(0,0,0,.35);
  display:grid; place-items:center; z-index:50; padding:14px;
}
.modal{
  background:#fff; border-radius:16px; width:100%; max-width:560px;
  padding:14px; border:1px solid var(--line); box-shadow:0 20px 50px rgba(0,0,0,.2);
}
.modal__header{
  display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;
}
.field{ display:flex; flex-direction:column; gap:6px; margin:8px 0; }
.textarea{
  width:100%; border:1px solid var(--line); border-radius:12px; padding:.65rem .85rem; outline:none; resize:vertical;
}
.textarea:focus{ border-color:var(--gold); box-shadow:0 0 0 2px #ffd70055; }
.grid-2{ display:grid; grid-template-columns:1fr; gap:10px; }
.modal__footer{ display:flex; gap:8px; justify-content:flex-end; margin-top:8px; }

/* Transitions */
.fade-enter-active,.fade-leave-active{ transition: opacity .2s ease; }
.fade-enter-from,.fade-leave-to{ opacity:0 }

/* Buttons hover */
.btn:hover, .icon-btn:hover, .chip:hover{ filter:brightness(0.98) }

/* Responsive */
@media (min-width: 720px){
  .title{ font-size:1.6rem; }
  .grid{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  .grid-2{ grid-template-columns:1fr 1fr; }
}
@media (min-width: 1024px){
  .grid{ grid-template-columns: repeat(3, minmax(0,1fr)); }
}
</style>
