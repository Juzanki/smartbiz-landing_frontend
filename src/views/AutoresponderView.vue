<!-- src/views/SmartAutorespondersMobile.vue -->
<template>
  <div class="app">
    <!-- Sticky App Bar -->
    <header class="appbar">
      <div class="ttl">
        <h1>Smart Autoresponders</h1>
        <p>Create rules per platform and keyword</p>
      </div>
      <button class="pill" @click="openNew">
        <span class="plus">＋</span> New Rule
      </button>
    </header>

    <!-- Tools -->
    <section class="pad">
      <div class="tools">
        <div class="searchbox">
          <svg viewBox="0 0 24 24" class="s-ic"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
          <input v-model.trim="query" class="search" type="search" placeholder="Search keyword or response..." />
          <button v-if="query" class="clear" @click="query=''" aria-label="Clear">✕</button>
        </div>

        <div class="chips no-scrollbar">
          <button
            v-for="p in ['All', ...platforms]"
            :key="p"
            :class="['chip', activePlatform===p ? 'active' : '']"
            @click="activePlatform = p"
          >
            {{ p }}
          </button>

          <div class="right">
            <select v-model="sortBy" class="sortsel" aria-label="Sort rules">
              <option value="recent">Recent</option>
              <option value="active_first">Active First</option>
              <option value="platform_az">Platform A–Z</option>
              <option value="keyword_az">Keyword A–Z</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Empty state -->
    <section v-if="!filtered.length && !loading" class="pad">
      <div class="empty card">
        <h3>No autoresponders</h3>
        <p class="muted">Tap “New Rule” to create your first responder.</p>
        <button class="btn primary" @click="openNew">New Rule</button>
      </div>
    </section>

    <!-- List -->
    <section class="pad">
      <div class="list">
        <!-- Skeletons -->
        <template v-if="loading">
          <div v-for="i in 6" :key="'sk-'+i" class="card sk"></div>
        </template>

        <template v-else>
          <article
            v-for="(rule, i) in ordered"
            :key="i"
            class="card item"
          >
            <div class="top">
              <div class="plx">
                <span class="ic">{{ iconFor(rule.platform) }}</span>
                <span class="pname">{{ rule.platform }}</span>
              </div>

              <div class="status">
                <button class="toggle" :class="{on: rule.active}" @click="toggleActive(i)">
                  <span class="dot"></span>
                  {{ rule.active ? 'Active' : 'Inactive' }}
                </button>
              </div>
            </div>

            <div class="body">
              <div class="kw">
                <span class="kbadge">#{{ rule.keyword }}</span>
              </div>
              <p class="resp" :title="rule.response">{{ rule.response }}</p>
            </div>

            <div class="actions">
              <button class="btn ghost" @click="openEdit(i)">Edit</button>
              <button class="btn danger" @click="removeRule(i)">Delete</button>
              <button class="btn ghost small" @click="testRule(rule)">Test</button>
            </div>
          </article>
        </template>
      </div>
    </section>

    <!-- Bottom Sheet: Create/Edit -->
    <transition name="sheet">
      <div v-if="sheetOpen" class="sheet-wrap" @click.self="closeSheet">
        <div class="sheet">
          <div class="s-head">
            <h3>{{ editIndex !== null ? 'Edit Rule' : 'New Rule' }}</h3>
            <button class="x" @click="closeSheet" aria-label="Close">✕</button>
          </div>
          <form @submit.prevent="saveRule">
            <div class="field">
              <label class="lbl">Platform</label>
              <select class="inp" v-model="form.platform" required>
                <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>

            <div class="field">
              <label class="lbl">Trigger Keyword</label>
              <input class="inp" v-model.trim="form.keyword" required placeholder="e.g., order" @input="validate" />
              <p v-if="v.keyword" class="err">{{ v.keyword }}</p>
            </div>

            <div class="field">
              <label class="lbl">Response Message</label>
              <textarea class="area" rows="3" v-model.trim="form.response" required placeholder="Write the auto-reply..." @input="validate"></textarea>
              <p v-if="v.response" class="err">{{ v.response }}</p>
            </div>

            <div class="row2">
              <label class="switch">
                <input type="checkbox" v-model="form.active"><span></span>
              </label>
              <span class="switch-lbl">{{ form.active ? 'Active' : 'Inactive' }}</span>
            </div>

            <div class="s-actions">
              <button class="btn ghost" type="button" @click="closeSheet">Cancel</button>
              <button class="btn primary" type="submit" :disabled="!canSave">Save</button>
            </div>
          </form>
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

/** Supported platforms (extend freely) */
const platforms = [
  'WhatsApp', 'Telegram', 'SMS', 'Instagram DM', 'Facebook Messenger',
  'Web Chat', 'Email', 'TikTok DM', 'Discord', 'Slack'
]

/** Demo data */
const rules = ref([
  { platform: 'WhatsApp',           keyword: 'price',  response: 'Our price is 50,000 TZS.', active: true  },
  { platform: 'Telegram',           keyword: 'hours',  response: 'We’re open Mon–Sat, 8–6.', active: true  },
  { platform: 'Instagram DM',       keyword: 'promo',  response: 'This week: 10% off baskets.', active: false },
  { platform: 'Facebook Messenger', keyword: 'order',  response: 'Send your address to finalize.', active: true  },
  { platform: 'Email',              keyword: 'quote',  response: 'Attached is your quotation (PDF).', active: false },
])

/** UI state */
const loading = ref(true)
const query = ref('')
const activePlatform = ref('All')
const sortBy = ref('recent')

const sheetOpen = ref(false)
const editIndex = ref(null)
const form = ref({ platform: platforms[0], keyword: '', response: '', active: true })
const v = ref({ keyword: '', response: '' })

const msg = ref('')
const err = ref('')

onMounted(() => setTimeout(()=> loading.value = false, 350))

/** Filters & sort */
const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return rules.value.filter(r => {
    const platOK = activePlatform.value === 'All' ? true : r.platform === activePlatform.value
    const qOK = !q || `${r.keyword} ${r.response} ${r.platform}`.toLowerCase().includes(q)
    return platOK && qOK
  })
})

const ordered = computed(() => {
  const arr = [...filtered.value]
  if (sortBy.value === 'active_first') arr.sort((a,b)=> Number(b.active) - Number(a.active))
  else if (sortBy.value === 'platform_az') arr.sort((a,b)=> a.platform.localeCompare(b.platform))
  else if (sortBy.value === 'keyword_az') arr.sort((a,b)=> a.keyword.localeCompare(b.keyword))
  else arr.reverse() // recent (assumes last added = most recent)
  return arr
})

/** Editor */
function openNew(){ editIndex.value = null; form.value = { platform: platforms[0], keyword: '', response: '', active: true }; v.value={keyword:'',response:''}; sheetOpen.value = true }
function openEdit(i){ editIndex.value = i; form.value = { ...rules.value[i] }; v.value={keyword:'',response:''}; sheetOpen.value = true }
function closeSheet(){ sheetOpen.value = false }

const canSave = computed(() => !v.value.keyword && !v.value.response && !!form.value.keyword && !!form.value.response)

function validate(){
  v.value.keyword = !form.value.keyword ? 'Keyword is required.' : /[^\s]/.test(form.value.keyword) ? '' : 'Keyword cannot be blank.'
  v.value.response = !form.value.response ? 'Response is required.' : form.value.response.length < 3 ? 'Response is too short.' : ''
}

function saveRule(){
  if (!canSave.value) return
  if (editIndex.value === null) rules.value.push({ ...form.value })
  else rules.value[editIndex.value] = { ...form.value }
  msg.value = 'Rule saved.'
  sheetOpen.value = false
  setTimeout(()=> msg.value='', 1500)
}

function removeRule(i){
  if (confirm('Delete this rule?')) {
    rules.value.splice(i,1)
    msg.value = 'Rule deleted.'
    setTimeout(()=> msg.value='', 1400)
  }
}
function toggleActive(i){
  rules.value[i].active = !rules.value[i].active
}

/** Utilities */
function iconFor(p){
  if (p.includes('WhatsApp')) return '📱'
  if (p.includes('Telegram')) return '💬'
  if (p === 'SMS')            return '✉️'
  if (p.includes('Instagram'))return '📸'
  if (p.includes('Facebook')) return '📘'
  if (p.includes('Web'))      return '🌐'
  if (p.includes('Email'))    return '📧'
  if (p.includes('TikTok'))   return '🎵'
  if (p.includes('Discord'))  return '🟣'
  if (p.includes('Slack'))    return '💼'
  return '🤖'
}

function testRule(r){
  msg.value = `Tested ${r.platform} rule for "${r.keyword}".`
  setTimeout(()=> msg.value='', 1400)
}
</script>

<style scoped>
/* ===== App background (digital gradient) ===== */
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
  display:flex; gap:.75rem; align-items:center; padding:1rem .95rem .75rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.ttl h1{ margin:0; font-size:1.05rem; font-weight:900; letter-spacing:.2px }
.ttl p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.75) }
.pill{
  margin-left:auto; display:inline-flex; align-items:center; gap:.35rem;
  border-radius:999px; padding:.5rem .8rem; font-weight:900; color:#000;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  border:1px solid rgba(255,255,255,.14);
  box-shadow:0 6px 18px rgba(99,102,241,.35);
}
.plus{ font-weight:900 }

/* ===== Tools ===== */
.pad{ padding:.75rem .95rem 0 }
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
.chips{ display:flex; gap:.5rem; overflow-x:auto; padding-bottom:.2rem; align-items:center }
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
.right{ margin-left:auto }
.sortsel{
  appearance:none; -webkit-appearance:none; -moz-appearance:none;
  background:rgba(255,255,255,.06); color:#fff; border:1px solid rgba(255,255,255,.12);
  border-radius:.9rem; padding:.5rem .7rem; font-weight:700;
}

/* ===== Cards list ===== */
.list{ display:grid; gap:.8rem }
.card{
  border-radius:1.15rem; padding:1rem;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.14); backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
}
.item .top{ display:flex; align-items:center; justify-content:space-between; gap:.6rem }
.plx{ display:inline-flex; align-items:center; gap:.45rem; font-weight:900 }
.ic{ font-size:1.1rem }
.pname{ font-size:.95rem }
.toggle{
  display:inline-flex; align-items:center; gap:.45rem;
  padding:.35rem .55rem; border-radius:.8rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.16); color:#fff
}
.toggle .dot{
  height:10px; width:10px; border-radius:999px; background:#f43f5e;
}
.toggle.on .dot{ background:#10b981 }

.body{ margin:.45rem 0 .5rem }
.kbadge{
  display:inline-block; font-size:.78rem; padding:.2rem .5rem; border-radius:.6rem;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16);
}
.resp{ margin:.35rem 0 0; color:rgba(255,255,255,.92); overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical }

.actions{ display:flex; gap:.5rem; margin-top:.4rem; flex-wrap:wrap }
.btn{
  flex:1; border-radius:.9rem; padding:.6rem .75rem; font-weight:900; border:1px solid transparent; color:#fff; text-align:center
}
.btn.ghost{ background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.16) }
.btn.danger{ background:rgba(244,63,94,.16); border-color:rgba(244,63,94,.42) }
.btn.primary{ background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000; box-shadow:0 8px 24px rgba(99,102,241,.35) }

/* Skeleton */
.sk{
  height:130px; border-radius:1.15rem;
  background:linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  border:1px solid rgba(255,255,255,.12); animation: shine 1.1s linear infinite;
}
@keyframes shine{ 0%{ background-position:-200px 0 } 100%{ background-position:200px 0 } }

/* ===== Bottom Sheet ===== */
.sheet-wrap{ position:fixed; inset:0; z-index:40; display:grid; align-items:end; background:rgba(0,0,0,.45); backdrop-filter: blur(4px) }
.sheet{
  border-top-left-radius:1.25rem; border-top-right-radius:1.25rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.12); padding:.9rem .95rem 1rem;
}
.s-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:.6rem }
.s-head h3{ margin:0; font-size:1rem; font-weight:900 }
.x{ height:34px; width:34px; border-radius:10px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); color:#fff }
.field{ margin:.6rem 0 }
.lbl{ display:block; font-size:.82rem; color:rgba(255,255,255,.85); margin-bottom:.25rem }
.inp, .area, select.inp{
  width:100%; border-radius:1rem; padding:.7rem .85rem; color:#fff;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
}
.area{ resize:vertical }
.row2{ display:flex; align-items:center; gap:.6rem; margin-top:.2rem }
.switch{ position:relative; display:inline-block; width:44px; height:26px }
.switch input{ display:none }
.switch span{ position:absolute; inset:0; background:rgba(255,255,255,.12); border-radius:999px; transition:.2s }
.switch span::after{
  content:""; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:999px; background:#fff; transition:.2s
}
.switch input:checked + span{ background:#10b981 }
.switch input:checked + span::after{ transform: translateX(18px) }
.switch-lbl{ font-size:.9rem }

.s-actions{ display:flex; gap:.6rem; margin-top:.7rem }
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
