<!-- src/views/MyJoinedCampaignsMobile.vue -->
<template>
  <div class="app">
    <!-- Sticky App Bar -->
    <header class="appbar">
      <div class="ttl">
        <h1>My Joined Campaigns</h1>
        <p>Track performance and earnings</p>
      </div>

      <div class="tools-inline">
        <div class="searchbox">
          <svg viewBox="0 0 24 24" class="s-ic"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
          <input v-model.trim="query" class="search" type="search" placeholder="Search campaigns..." />
          <button v-if="query" class="clear" @click="query=''" aria-label="Clear">✕</button>
        </div>
      </div>
    </header>

    <!-- Filters -->
    <section class="pad">
      <div class="chips no-scrollbar">
        <button
          v-for="t in tabs"
          :key="t.value"
          :class="['chip', activeTab===t.value ? 'active' : '']"
          @click="activeTab = t.value"
        >
          {{ t.label }}
        </button>

        <div class="sort">
          <select v-model="sortBy" class="sortsel" aria-label="Sort campaigns">
            <option value="recent">Recent</option>
            <option value="ending_soon">Ending Soon</option>
            <option value="commission_desc">Highest Commission</option>
            <option value="price_desc">Highest Price</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Grid -->
    <section class="pad">
      <div class="grid">
        <!-- Skeletons -->
        <template v-if="loading">
          <div v-for="i in 6" :key="'sk-'+i" class="card sk"></div>
        </template>

        <!-- Error -->
        <div v-else-if="error" class="card err">
          <h3 class="card-title">Couldn’t load campaigns</h3>
          <p class="muted">{{ error }}</p>
          <div class="actions">
            <button class="btn ghost" @click="fetch">Retry</button>
          </div>
        </div>

        <!-- Cards -->
        <template v-else>
          <div
            v-for="c in visible"
            :key="c.id"
            class="card"
          >
            <div class="card-top">
              <div class="thumb" v-if="c.product?.image">
                <img :src="c.product.image" :alt="c.product?.name || 'Product'" loading="lazy" />
              </div>
              <div class="meta">
                <h2 class="name" :title="c.title">{{ c.title }}</h2>
                <p class="sub">
                  <span class="prod">{{ c.product?.name || 'Product' }}</span>
                  •
                  <span class="price">{{ money(c.product?.price || 0) }}</span>
                </p>
              </div>
              <span class="pill">{{ c.commission_rate }}% commission</span>
            </div>

            <!-- Time progress -->
            <div class="time-row">
              <span class="muted">Ends</span>
              <strong class="ends">{{ fmtDate(c.ends_at) }}</strong>
            </div>
            <div class="bar">
              <div class="fill" :style="{ width: progressPct(c)+'%' }"></div>
            </div>
            <div class="bar-meta">
              <span class="muted">{{ daysLeft(c) >= 0 ? daysLeft(c) + ' days left' : 'Ended' }}</span>
              <span class="muted">{{ progressPct(c) }}%</span>
            </div>

            <div class="actions">
              <button class="btn ghost" @click="openDetails(c)">View</button>
              <button class="btn primary" @click="copyLink(c)">Copy Link</button>
            </div>
          </div>

          <div v-if="!visible.length" class="empty">
            <p>No campaigns found. Try another filter or keyword.</p>
          </div>
        </template>
      </div>
    </section>

    <!-- Sticky Footer (optional summary) -->
    <footer class="footerbar" v-if="!loading && joined.length">
      <div class="bar">
        <div class="sum">
          <span class="label">Joined</span>
          <strong class="val">{{ joined.length }}</strong>
        </div>
        <div class="sum">
          <span class="label">Avg Commission</span>
          <strong class="val">{{ avgCommission }}%</strong>
        </div>
        <button class="cta" @click="shareAll">Share All Links</button>
      </div>

      <transition name="toast"><div v-if="msg" class="toast ok">{{ msg }}</div></transition>
      <transition name="toast"><div v-if="errMsg" class="toast bad">{{ errMsg }}</div></transition>
    </footer>
  </div>
</template>

<script setup>
/**
 * Mobile-first "My Joined Campaigns"
 * - Glass + gradient + glow UI
 * - Search, filter chips, sort
 * - Date-aware progress bar (start -> end)
 * - Copy link action, share all shortcut
 * - Robust loading & error handling
 */
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const joined = ref([])
const loading = ref(true)
const error = ref('')

const query = ref('')
const tabs = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'ended', label: 'Ended' },
]
const activeTab = ref('all')
const sortBy = ref('recent') // recent | ending_soon | commission_desc | price_desc

const msg = ref('')
const errMsg = ref('')

/* Fetch campaigns */
async function fetch() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/campaigns/my')
    joined.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Network error. Please try again.'
  } finally {
    loading.value = false
  }
}
onMounted(fetch)

/* Helpers */
function money(v){ return Number(v || 0).toLocaleString('en-KE', { style:'currency', currency:'TZS', maximumFractionDigits:0 }) }
function fmtDate(d){ try{ return new Date(d).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' }) } catch { return d } }
function daysLeft(c){
  const now = Date.now()
  const end = new Date(c.ends_at).getTime()
  return Math.ceil((end - now)/(1000*60*60*24))
}
function progressPct(c){
  const start = c.starts_at ? new Date(c.starts_at).getTime() : null
  const end = new Date(c.ends_at).getTime()
  const now = Date.now()
  if (!start || end <= start) return 100
  const pct = Math.round(((Math.min(now, end) - start) / (end - start)) * 100)
  return Math.max(0, Math.min(100, pct))
}

/* Filtering + sorting */
const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return joined.value.filter(c => {
    const title = `${c.title} ${c.product?.name || ''}`.toLowerCase()
    const tabOK =
      activeTab.value === 'all' ? true :
      activeTab.value === 'active' ? daysLeft(c) >= 0 :
      daysLeft(c) < 0
    const qOK = !q || title.includes(q)
    return tabOK && qOK
  })
})

const ordered = computed(() => {
  const arr = [...filtered.value]
  if (sortBy.value === 'ending_soon') {
    arr.sort((a,b)=> daysLeft(a) - daysLeft(b))
  } else if (sortBy.value === 'commission_desc') {
    arr.sort((a,b)=> (b.commission_rate||0) - (a.commission_rate||0))
  } else if (sortBy.value === 'price_desc') {
    arr.sort((a,b)=> (b.product?.price||0) - (a.product?.price||0))
  } else {
    // recent by ends_at desc
    arr.sort((a,b)=> new Date(b.ends_at) - new Date(a.ends_at))
  }
  return arr
})

const visible = computed(()=> ordered.value)
const avgCommission = computed(() => {
  if (!joined.value.length) return 0
  const s = joined.value.reduce((t,c)=> t + (Number(c.commission_rate)||0), 0)
  return Math.round((s / joined.value.length) * 10) / 10
})

/* Actions */
async function copyLink(c){
  try{
    const link = c.share_url || c.product?.url || window.location.origin + '/campaign/' + c.id
    await navigator.clipboard.writeText(link)
    msg.value = 'Link copied.'
  }catch{
    errMsg.value = 'Copy failed.'
  }finally{
    setTimeout(()=>{ msg.value=''; errMsg.value='' }, 1800)
  }
}
async function shareAll(){
  try{
    const links = visible.value.map(c => c.share_url || c.product?.url || (window.location.origin + '/campaign/' + c.id)).join('\n')
    await navigator.clipboard.writeText(links)
    msg.value = 'All links copied.'
  }catch{
    errMsg.value = 'Copy failed.'
  }finally{
    setTimeout(()=>{ msg.value=''; errMsg.value='' }, 2000)
  }
}
function openDetails(c){
  // Navigate or open modal if needed
  window.location.href = '/campaign/' + c.id
}
</script>

<style scoped>
/* ===== App (digital gradient + glass) ===== */
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
  display:grid; grid-template-columns: 1fr; gap:.6rem;
  padding:1rem .95rem .75rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.ttl h1{ margin:0; font-size:1.05rem; font-weight:900 }
.ttl p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.75) }

.tools-inline{ display:flex; align-items:center }
.searchbox{
  position:relative; display:flex; align-items:center; gap:.5rem; width:100%;
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

/* ===== Filters ===== */
.pad{ padding: .75rem .95rem 0 }
.chips{
  display:flex; gap:.5rem; overflow-x:auto; padding-bottom:.2rem; align-items:center;
}
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
.sort{ margin-left:auto }
.sortsel{
  appearance:none; -webkit-appearance:none; -moz-appearance:none;
  background:rgba(255,255,255,.06); color:#fff; border:1px solid rgba(255,255,255,.12);
  border-radius:.9rem; padding:.5rem .7rem; font-weight:700;
}

/* ===== Grid ===== */
.grid{ display:grid; gap:.8rem; grid-template-columns: repeat(1, minmax(0,1fr)) }
@media (min-width: 640px){ .grid{ grid-template-columns: repeat(2, minmax(0,1fr)) } }
@media (min-width: 1024px){ .grid{ grid-template-columns: repeat(3, minmax(0,1fr)) } }

/* ===== Card ===== */
.card{
  border-radius:1.25rem; padding:1rem;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.14); backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
}
.card.err{ border-color:rgba(244,174,63,.35); box-shadow:0 10px 30px rgba(244,174,63,.18) }
.card-title{ margin:0 0 .3rem 0; font-size:1rem; font-weight:900 }
.muted{ color:rgba(255,255,255,.82) }

.card-top{
  display:grid; grid-template-columns:auto 1fr auto; gap:.75rem; align-items:center; margin-bottom:.4rem;
}
.thumb{
  height:48px; width:48px; border-radius:12px; overflow:hidden;
  border:1px solid rgba(255,255,255,.18); box-shadow: 0 6px 22px rgba(0,0,0,.35);
}
.thumb img{ height:100%; width:100%; object-fit:cover }
.name{ margin:0; font-size:1.02rem; font-weight:900 }
.sub{ margin:.1rem 0 0; font-size:.86rem; color:rgba(255,255,255,.85) }
.pill{
  font-size:.72rem; padding:.25rem .5rem; border-radius:.6rem; border:1px solid rgba(99,102,241,.45);
  background:rgba(99,102,241,.18);
}

/* Progress */
.time-row{ display:flex; align-items:center; justify-content:space-between; margin:.3rem 0 .25rem }
.ends{ font-weight:900 }
.bar{
  height:8px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; border:1px solid rgba(255,255,255,.12)
}
.fill{
  height:100%; background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  width:0%;
}
.bar-meta{ display:flex; align-items:center; justify-content:space-between; margin-top:.25rem; font-size:.82rem; color:rgba(255,255,255,.8) }

/* Actions */
.actions{ display:flex; gap:.5rem; margin-top:.65rem }
.btn{
  flex:1; border-radius:.9rem; padding:.6rem .75rem; font-weight:900; border:1px solid transparent; color:#fff; text-align:center
}
.btn.ghost{ background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.16) }
.btn.primary{ background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000; box-shadow:0 8px 24px rgba(99,102,241,.35) }

/* Skeleton */
.sk{
  height:180px; border-radius:1.25rem;
  background:linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  border:1px solid rgba(255,255,255,.12);
  animation: shine 1.1s linear infinite;
}
@keyframes shine{ 0%{ background-position:-200px 0 } 100%{ background-position:200px 0 } }

/* Empty */
.empty{
  grid-column:1/-1; text-align:center; color:rgba(255,255,255,.8);
  padding:1rem; border-radius:1rem; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05);
}

/* ===== Footer bar ===== */
.footerbar{
  position:sticky; bottom:0; z-index:30; margin-top:auto;
  padding:.75rem .95rem 1rem;
  background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.55) 40%, rgba(0,0,0,.85) 100%);
  backdrop-filter: blur(12px);
}
.bar{
  display:flex; align-items:center; gap:.8rem;
  border-radius:1rem; padding:.7rem .75rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.14);
}
.sum{ display:flex; flex-direction:column }
.label{ font-size:.78rem; color:rgba(255,255,255,.8) }
.val{ font-weight:900 }
.cta{
  margin-left:auto; min-width:140px; border:none; border-radius:999px; padding:.9rem 1rem; font-weight:900;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000;
  box-shadow:0 8px 24px rgba(99,102,241,.35);
}

/* Toasts */
.toast{
  margin-top:.6rem; border-radius:1rem; padding:.75rem .9rem; font-size:.9rem; border:1px solid; text-align:center;
}
.toast.ok{ background:rgba(16,185,129,.14); border-color:rgba(16,185,129,.35); color:#b8f3d8 }
.toast.bad{ background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.35); color:#ffc9d2 }
.toast-enter-active,.toast-leave-active{ transition: all .25s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }

/* Utils */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
</style>
