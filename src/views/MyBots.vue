<!-- src/views/MyBotsMobile.vue -->
<template>
  <div class="app">
    <!-- Sticky App Bar -->
    <header class="appbar">
      <div class="ttl">
        <h1>My Personal Bots</h1>
        <p>Teach, price & deploy your assistants</p>
      </div>

      <button class="pill" @click="goCreate" aria-label="Create Bot">
        <span class="plus">＋</span> New Bot
      </button>
    </header>

    <!-- Filters -->
    <section class="pad">
      <div class="tools">
        <div class="searchbox">
          <svg viewBox="0 0 24 24" class="s-ic"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
          <input v-model.trim="query" class="search" type="search" placeholder="Search bots..." />
          <button v-if="query" class="clear" @click="query = ''" aria-label="Clear">✕</button>
        </div>

        <div class="chips no-scrollbar">
          <button
            v-for="o in statusTabs"
            :key="o.value"
            :class="['chip', activeStatus === o.value ? 'active' : '']"
            @click="activeStatus = o.value"
          >
            {{ o.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Bot Cards -->
    <section class="pad">
      <div class="grid">
        <!-- Skeletons -->
        <template v-if="loading">
          <div v-for="i in 6" :key="'sk-'+i" class="card sk"></div>
        </template>

        <!-- Cards -->
        <template v-else>
          <div v-for="bot in visibleBots" :key="bot.id" class="card">
            <div class="card-top">
              <div class="avatar">{{ initials(bot.name) }}</div>
              <div class="meta">
                <div class="row1">
                  <h2 class="name" :title="bot.name">{{ bot.name }}</h2>
                  <span class="badge" :class="bot.status">{{ bot.status.toUpperCase() }}</span>
                </div>
                <div class="row2">
                  <PackageTag :name="bot.package" />
                  <span class="expiry" :title="formatDate(bot.expiry_date)">
                    Expiry: {{ formatDate(bot.expiry_date) }}
                  </span>
                </div>
              </div>
              <button class="menu" @click="toggleActive(bot)" :aria-label="bot.status==='active'?'Deactivate':'Activate'">
                <span v-if="bot.status==='active'">⏸</span>
                <span v-else>▶</span>
              </button>
            </div>

            <!-- Pricing preview -->
            <div class="pricing">
              <div class="price-row">
                <span>Price</span>
                <strong>{{ money(bot.price) }}</strong>
              </div>
              <div class="price-row">
                <span>Discount</span>
                <strong>{{ bot.discount }}%</strong>
              </div>
              <div class="price-row total">
                <span>Final</span>
                <strong>{{ money(finalPrice(bot.price, bot.discount)) }}</strong>
              </div>
            </div>

            <!-- Actions -->
            <div class="actions">
              <button class="btn ghost" @click="viewBot(bot.id)">View</button>
              <button class="btn ghost" @click="editBot(bot.id)">Edit</button>
              <button class="btn ghost" @click="renewBot(bot.id)">Renew</button>
            </div>

            <div class="actions-2">
              <button class="btn small" @click="openTeach(bot)">Teach</button>
              <button class="btn small" @click="openPricing(bot)">Set Pricing</button>
              <button class="btn small primary" @click="openRun(bot)">Run Task</button>
            </div>
          </div>

          <div v-if="!visibleBots.length" class="empty">
            No bots found. Try a different search or status.
          </div>
        </template>
      </div>
    </section>

    <!-- Teach Sheet -->
    <transition name="sheet">
      <div v-if="teachOpen" class="sheet-wrap" @click.self="closeTeach">
        <div class="sheet">
          <div class="s-head">
            <h3>Teach Bot</h3>
            <button class="x" @click="closeTeach" aria-label="Close">✕</button>
          </div>
          <div class="s-body">
            <p class="s-sub">Add instructions, tone, product catalog links, FAQs—anything your bot needs.</p>
            <textarea v-model.trim="teachText" class="area" rows="6" placeholder="Example: 
- When customers ask for pricing, first qualify their use case.
- Use friendly, concise tone. 
- Upsell SmartBiz Pro if they stream weekly." />
            <div class="s-actions">
              <button class="btn ghost" @click="closeTeach">Cancel</button>
              <button class="btn primary" :disabled="!teachText || saving" @click="saveTeach">
                <span v-if="!saving">Save Knowledge</span>
                <span v-else class="loader">Saving…</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Pricing Sheet -->
    <transition name="sheet">
      <div v-if="pricingOpen" class="sheet-wrap" @click.self="closePricing">
        <div class="sheet">
          <div class="s-head">
            <h3>Set Price & Discount</h3>
            <button class="x" @click="closePricing" aria-label="Close">✕</button>
          </div>
          <div class="s-body">
            <div class="field">
              <label class="lbl">Base Price (TZS)</label>
              <input class="inp" type="tel" inputmode="numeric" v-model="priceInput" placeholder="e.g. 150000" />
            </div>
            <div class="field">
              <label class="lbl">Discount %</label>
              <input class="inp" type="tel" inputmode="numeric" v-model="discountInput" placeholder="e.g. 20" />
            </div>

            <div class="total">
              <span>Final Price</span>
              <strong>{{ money(finalPrice(num(priceInput), num(discountInput))) }}</strong>
            </div>

            <p v-if="pricingError" class="warn">{{ pricingError }}</p>

            <div class="s-actions">
              <button class="btn ghost" @click="closePricing">Cancel</button>
              <button class="btn primary" :disabled="!!pricingError || saving" @click="savePricing">
                <span v-if="!saving">Save Pricing</span>
                <span v-else class="loader">Saving…</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Run Task Sheet -->
    <transition name="sheet">
      <div v-if="runOpen" class="sheet-wrap" @click.self="closeRun">
        <div class="sheet">
          <div class="s-head">
            <h3>Run Task with Bot</h3>
            <button class="x" @click="closeRun" aria-label="Close">✕</button>
          </div>
          <div class="s-body">
            <div class="field">
              <label class="lbl">Task</label>
              <textarea v-model.trim="taskText" class="area" rows="4" placeholder="Example: Create a 3-day promo plan with copy and post times for Instagram & TikTok." />
            </div>

            <div class="summary">
              <div class="row"><span>Selected Bot</span><strong>{{ runBot?.name || '-' }}</strong></div>
              <div class="row"><span>Quoted Price</span><strong>{{ money(runBot ? finalPrice(runBot.price, runBot.discount) : 0) }}</strong></div>
              <div class="row"><span>Discount</span><strong>{{ runBot ? runBot.discount : 0 }}%</strong></div>
            </div>

            <div class="s-actions">
              <button class="btn ghost" @click="closeRun">Cancel</button>
              <button class="btn primary" :disabled="!taskText || running" @click="executeTask">
                <span v-if="!running">Execute Task</span>
                <span v-else class="loader">Running…</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toasts -->
    <transition name="toast"><div v-if="msg" class="toast ok">{{ msg }}</div></transition>
    <transition name="toast"><div v-if="err" class="toast bad">{{ err }}</div></transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PackageTag from '@/components/PackageTag.vue'

const router = useRouter()

/** Demo data (replace with API) */
const myBots = ref([
  { id: 1, name: 'Assistant Mary', package: 'ProBot', status: 'active',   expiry_date: '2025-12-31', price: 150000, discount: 15 },
  { id: 2, name: 'Lead Hunter',     package: 'BasicBot', status: 'inactive', expiry_date: '2025-06-30', price:  80000, discount:  0 },
  { id: 3, name: 'Sales Genie',     package: 'ProBot', status: 'active',   expiry_date: '2026-03-10', price: 220000, discount: 10 },
])

/** UI state */
const loading = ref(true)
const query = ref('')
const activeStatus = ref('all')
const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
]

/** Sheets */
const teachOpen = ref(false)
const pricingOpen = ref(false)
const runOpen = ref(false)

const teachText = ref('')
const priceInput = ref('')
const discountInput = ref('')
const saving = ref(false)

const taskText = ref('')
const running = ref(false)
const runBot = ref(null)

const msg = ref('')
const err = ref('')

/** Helpers */
function formatDate(dateString) {
  try { return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return dateString }
}
function initials(name='') {
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'B'
}
function money(n) {
  return Number(n || 0).toLocaleString('en-KE', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 })
}
const num = (v) => Number(String(v).replace(/[^\d.-]/g,'')) || 0
function finalPrice(base, disc) {
  const b = num(base), d = Math.min(100, Math.max(0, num(disc)))
  return Math.max(0, Math.round(b - (b * d / 100)))
}

/** Filtering */
const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return myBots.value.filter(b => {
    const sOK = activeStatus.value === 'all' ? true : b.status === activeStatus.value
    const qOK = !q || `${b.name} ${b.package}`.toLowerCase().includes(q)
    return sOK && qOK
  })
})
const visibleBots = computed(() => filtered.value)

/** Load (simulate) */
onMounted(() => setTimeout(()=> loading.value = false, 450))

/** Actions */
function viewBot(id){ router.push(`/bots/stats/${id}`) }
function editBot(id){ router.push(`/bots/edit/${id}`) }
function renewBot(id){ router.push(`/bots/renew/${id}`) }
function goCreate(){ router.push('/bots/packages') }

function toggleActive(bot){
  bot.status = bot.status === 'active' ? 'inactive' : 'active'
  msg.value = bot.status === 'active' ? 'Bot activated.' : 'Bot deactivated.'
  setTimeout(()=> msg.value = '', 1800)
}

/** Teach */
let teachBotId = null
function openTeach(bot){ teachBotId = bot.id; teachText.value=''; teachOpen.value=true }
function closeTeach(){ teachOpen.value=false; teachBotId=null }
async function saveTeach(){
  saving.value = true; err.value=''; msg.value=''
  try{
    // await axios.post(`/api/bots/${teachBotId}/knowledge`, { text: teachText.value })
    await new Promise(r=>setTimeout(r,800))
    msg.value = 'Knowledge saved. Your bot has been trained.'
    closeTeach()
  }catch{
    err.value = 'Failed to save knowledge. Please try again.'
  }finally{
    saving.value = false
    setTimeout(()=> { msg.value=''; err.value='' }, 2600)
  }
}

/** Pricing */
let pricingBot = null
function openPricing(bot){
  pricingBot = bot
  priceInput.value = String(bot.price)
  discountInput.value = String(bot.discount)
  pricingOpen.value = true
}
function closePricing(){ pricingOpen.value=false; pricingBot=null }
const pricingError = computed(()=>{
  const p = num(priceInput.value), d = num(discountInput.value)
  if (p <= 0) return 'Base price must be greater than 0.'
  if (d < 0 || d > 100) return 'Discount must be between 0 and 100.'
  return ''
})
async function savePricing(){
  if (pricingError.value) return
  saving.value = true; err.value=''; msg.value=''
  try{
    const p = num(priceInput.value), d = num(discountInput.value)
    // await axios.put(`/api/bots/${pricingBot.id}/pricing`, { price: p, discount: d })
    pricingBot.price = p; pricingBot.discount = d
    await new Promise(r=>setTimeout(r,700))
    msg.value = 'Pricing updated.'
    closePricing()
  }catch{
    err.value = 'Failed to update pricing.'
  }finally{
    saving.value = false
    setTimeout(()=> { msg.value=''; err.value='' }, 2000)
  }
}

/** Run Task */
function openRun(bot){ runBot.value = bot; taskText.value=''; runOpen.value=true }
function closeRun(){ runOpen.value=false; runBot.value=null }
async function executeTask(){
  running.value = true; err.value=''; msg.value=''
  try{
    // await axios.post(`/api/bots/${runBot.value.id}/run`, { task: taskText.value })
    await new Promise(r=>setTimeout(r,1000))
    msg.value = `Task sent to ${runBot.value.name}. You will be notified on completion.`
    closeRun()
  }catch{
    err.value = 'Failed to run task. Please try again.'
  }finally{
    running.value = false
    setTimeout(()=> { msg.value=''; err.value='' }, 2600)
  }
}
</script>

<style scoped>
/* ===== App (digital, mobile-first) ===== */
.app{
  min-height:100vh;
  background:
    radial-gradient(900px 480px at 90% -10%, #2e2a8a 0%, rgba(46,42,138,0) 60%),
    radial-gradient(800px 420px at -10% 0%, #6b21a8 0%, rgba(107,33,168,0) 55%),
    linear-gradient(180deg,#0a0f22 0%, #0b1633 100%);
  color:#fff; display:flex; flex-direction:column;
}

/* ===== App Bar ===== */
.appbar{
  position:sticky; top:0; z-index:20;
  display:flex; align-items:center; gap:.75rem; padding:1rem .95rem .75rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.ttl h1{ margin:0; font-size:1.05rem; font-weight:900; letter-spacing:.2px }
.ttl p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.72) }
.pill{
  margin-left:auto; display:inline-flex; align-items:center; gap:.35rem;
  border-radius:999px; padding:.5rem .8rem; font-weight:900; color:#000;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  border:1px solid rgba(255,255,255,.14);
  box-shadow:0 6px 18px rgba(99,102,241,.35);
}
.plus{ font-weight:900 }

/* ===== Sections ===== */
.pad{ padding: .75rem .95rem 0 }

/* ===== Tools ===== */
.tools{ display:grid; gap:.7rem }
.searchbox{
  position:relative; display:flex; align-items:center; gap:.5rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
  border-radius:1rem; padding:.55rem .75rem;
}
.s-ic{ width:18px; height:18px; opacity:.85 }
.search{ flex:1; background:transparent; border:none; color:#fff; font-size:.95rem }
.search:focus{ outline:none }
.clear{
  height:28px; width:28px; border-radius:8px; background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.14); color:#fff;
}
.chips{ display:flex; gap:.5rem; overflow-x:auto; padding-bottom:.2rem }
.chips::-webkit-scrollbar{ display:none }
.chip{
  padding:.5rem .85rem; border-radius:999px; white-space:nowrap; font-weight:800; font-size:.86rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff;
  transition: all .2s ease;
}
.chip.active{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  border-color:transparent; color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35);
}

/* ===== Grid & Card ===== */
.grid{ display:grid; gap:.8rem; grid-template-columns: repeat(1, minmax(0,1fr)) }
@media (min-width: 640px){ .grid{ grid-template-columns: repeat(2, minmax(0,1fr)) } }
@media (min-width: 1024px){ .grid{ grid-template-columns: repeat(3, minmax(0,1fr)) } }

.card{
  border-radius:1.25rem; padding:1rem;
  background:linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.12); backdrop-filter: blur(14px);
  box-shadow: 0 10px 36px rgba(0,0,0,.42);
}

/* Top row */
.card-top{ display:grid; grid-template-columns:auto 1fr auto; gap:.8rem; align-items:center }
.avatar{
  height:48px; width:48px; border-radius:14px; display:grid; place-items:center; font-weight:900; color:#000;
  background:linear-gradient(135deg,#fbbf24,#f59e0b); box-shadow: inset 0 -6px 14px rgba(0,0,0,.25), 0 8px 24px rgba(245,158,11,.35);
}
.meta{ min-width:0 }
.row1{ display:flex; align-items:center; gap:.5rem }
.name{ margin:0; font-weight:900; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.badge{
  font-size:.7rem; padding:.18rem .5rem; border-radius:.6rem; border:1px solid; letter-spacing:.04em;
}
.badge.active{ color:#b8f3d8; border-color:#2dd4bf; background:rgba(45,212,191,.12) }
.badge.inactive{ color:#ffc9d2; border-color:#f43f5e; background:rgba(244,63,94,.12) }
.row2{ display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; margin-top:.25rem }
.expiry{ font-size:.78rem; color:rgba(255,255,255,.75) }
.menu{
  height:40px; width:40px; border-radius:12px; background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.14); color:#fff
}

/* Pricing block */
.pricing{ margin:.7rem 0 .85rem; display:grid; gap:.25rem }
.price-row{ display:flex; align-items:center; justify-content:space-between; font-size:.92rem }
.price-row.total{ font-weight:900 }

/* Actions */
.actions{ display:flex; gap:.5rem; margin-top:.35rem }
.actions-2{ display:flex; gap:.5rem; margin-top:.5rem }
.btn{
  flex:1; border-radius:.9rem; padding:.6rem .75rem; font-weight:900; border:1px solid transparent; color:#fff; text-align:center
}
.btn.ghost{ background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.16) }
.btn.small{ padding:.5rem; font-size:.92rem }
.btn.primary{ background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35) }

/* Empty */
.empty{
  grid-column:1/-1; text-align:center; color:rgba(255,255,255,.75);
  padding:1rem; border-radius:1rem; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12)
}

/* Skeleton */
.sk{
  height:172px;
  background:linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  border:1px solid rgba(255,255,255,.12); border-radius:1.25rem; animation: shine 1.1s linear infinite;
}
@keyframes shine{ 0%{ background-position:-200px 0 } 100%{ background-position:200px 0 } }

/* ===== Bottom Sheets ===== */
.sheet-wrap{ position:fixed; inset:0; z-index:40; display:grid; align-items:end; background:rgba(0,0,0,.45); backdrop-filter: blur(4px) }
.sheet{
  border-top-left-radius:1.25rem; border-top-right-radius:1.25rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.12); padding:.9rem .95rem 1rem;
}
.s-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:.6rem }
.s-head h3{ margin:0; font-size:1rem; font-weight:900 }
.x{ height:34px; width:34px; border-radius:10px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); color:#fff }
.s-sub{ margin:.1rem 0 .4rem; color:rgba(255,255,255,.8); font-size:.9rem }
.field{ margin:.6rem 0 }
.lbl{ display:block; font-size:.8rem; color:rgba(255,255,255,.75); margin-bottom:.25rem }
.inp, .area{
  width:100%; border-radius:1rem; padding:.7rem .85rem; color:#fff;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
}
.area{ resize:vertical }
.total{ display:flex; align-items:center; justify-content:space-between; margin-top:.4rem; font-weight:900 }
.warn{ margin-top:.35rem; color:#fecaca }

/* Sheet actions */
.s-actions{ display:flex; gap:.6rem; margin-top:.7rem }
.loader{ display:inline-block }

/* Transitions */
.sheet-enter-active,.sheet-leave-active{ transition: all .25s ease }
.sheet-enter-from,.sheet-leave-to{ opacity:0 }
.sheet-enter-from .sheet,.sheet-leave-to .sheet{ transform: translateY(30px) }

/* Toasts */
.toast{
  position:fixed; left:12px; right:12px; bottom:12px; z-index:50;
  border-radius:1rem; padding:.75rem .9rem; font-size:.9rem; border:1px solid; text-align:center;
}
.toast.ok{ background:rgba(16,185,129,.14); border-color:rgba(16,185,129,.35); color:#b8f3d8 }
.toast.bad{ background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.35); color:#ffc9d2 }
.toast-enter-active,.toast-leave-active{ transition: all .25s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }

/* Utils */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
</style>
