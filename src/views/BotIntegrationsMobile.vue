<!-- src/views/BotIntegrationsMobile.vue -->
<template>
  <div class="app">
    <!-- Sticky App Bar -->
    <header class="appbar">
      <div class="title">
        <h1>Bot Integrations</h1>
        <p aria-live="polite">
          Manage channels for: <strong>{{ botName }}</strong>
        </p>
      </div>

      <div class="actions-head">
        <button class="btn small ghost" @click="testAll" :disabled="testingAll">
          {{ testingAll ? 'Testing…' : 'Test All' }}
        </button>
        <a
          class="btn small ghost"
          :href="docsUrl"
          target="_blank"
          rel="noopener"
          aria-label="Open docs in new tab"
        >
          Docs
        </a>
      </div>
    </header>

    <!-- Platform chips -->
    <section class="pad">
      <div class="chips no-scrollbar" role="tablist" aria-label="Platforms">
        <button
          v-for="p in ['All', ...platformOrder]"
          :key="p"
          :class="['chip', activeTab === p && 'active']"
          role="tab"
          :aria-selected="activeTab === p"
          @click="activeTab = p"
        >
          <span class="ic">{{ icon(p) }}</span> {{ p }}
        </button>
      </div>
    </section>

    <main class="pad">
      <!-- WhatsApp -->
      <details
        v-show="showPlatform('WhatsApp')"
        class="card collapsible"
        :open="activeTab === 'WhatsApp' || activeTab === 'All'"
      >
        <summary class="head">
          <h2 class="card-title">
            <span class="ic">{{ icon('WhatsApp') }}</span> WhatsApp Webhook
          </h2>
          <span :class="['pill', validWhatsapp ? 'ok' : 'bad']">
            {{ validWhatsapp ? 'Configured' : 'Not set' }}
          </span>
        </summary>

        <div class="field">
          <label class="lbl" for="wa-url">Webhook URL</label>
          <div class="input-row">
            <input
              id="wa-url"
              class="inp"
              type="url"
              autocomplete="off"
              placeholder="https://yourdomain.com/webhook/whatsapp/:botId"
              v-model.trim="integrations.whatsapp"
              @input="validateDebounced('whatsapp')"
              inputmode="url"
              spellcheck="false"
            />
            <button class="btn small ghost" @click="test('whatsapp')" :disabled="testing === 'whatsapp'">
              <span v-if="testing !== 'whatsapp'">Test</span>
              <span v-else class="loader">Testing…</span>
            </button>
            <button class="btn small ghost" @click="copy(integrations.whatsapp)">Copy</button>
          </div>
          <p v-if="errors.whatsapp" class="err" role="alert">{{ errors.whatsapp }}</p>
          <p class="hint">Use HTTPS and make sure your endpoint returns <code>200 OK</code>.</p>
        </div>
      </details>

      <!-- Instagram -->
      <details
        v-show="showPlatform('Instagram DM')"
        class="card collapsible"
        :open="activeTab === 'Instagram DM'"
      >
        <summary class="head">
          <h2 class="card-title">
            <span class="ic">{{ icon('Instagram DM') }}</span> Instagram DM Token
          </h2>
          <span :class="['pill', validInstagram ? 'ok' : 'bad']">
            {{ validInstagram ? 'Configured' : 'Not set' }}
          </span>
        </summary>

        <div class="field">
          <label class="lbl" for="ig-token">Access Token</label>
          <div class="input-row">
            <input
              id="ig-token"
              :type="reveal.instagram ? 'text' : 'password'"
              class="inp"
              autocomplete="off"
              placeholder="EAABsbCS1iHgBAB..."
              v-model.trim="integrations.instagram"
              @input="validateDebounced('instagram')"
              spellcheck="false"
            />
            <button
              class="btn small ghost"
              @click="reveal.instagram = !reveal.instagram"
              :aria-pressed="reveal.instagram"
            >
              {{ reveal.instagram ? 'Hide' : 'Reveal' }}
            </button>
            <button class="btn small ghost" @click="copy(integrations.instagram)">Copy</button>
          </div>
          <p v-if="errors.instagram" class="err" role="alert">{{ errors.instagram }}</p>
          <p class="hint">Generate from your Meta App (Instagram Graph API permissions).</p>
        </div>
      </details>

      <!-- Telegram -->
      <details
        v-show="showPlatform('Telegram')"
        class="card collapsible"
        :open="activeTab === 'Telegram'"
      >
        <summary class="head">
          <h2 class="card-title">
            <span class="ic">{{ icon('Telegram') }}</span> Telegram Bot Token
          </h2>
          <span :class="['pill', validTelegram ? 'ok' : 'bad']">
            {{ validTelegram ? 'Configured' : 'Not set' }}
          </span>
        </summary>

        <div class="field">
          <label class="lbl" for="tg-token">Bot Token</label>
          <div class="input-row">
            <input
              id="tg-token"
              :type="reveal.telegram ? 'text' : 'password'"
              class="inp"
              autocomplete="off"
              placeholder="123456789:AAHdPxxxxxx"
              v-model.trim="integrations.telegram"
              @input="validateDebounced('telegram')"
              spellcheck="false"
            />
            <button
              class="btn small ghost"
              @click="reveal.telegram = !reveal.telegram"
              :aria-pressed="reveal.telegram"
            >
              {{ reveal.telegram ? 'Hide' : 'Reveal' }}
            </button>
            <button class="btn small ghost" @click="copy(integrations.telegram)">Copy</button>
          </div>
          <p v-if="errors.telegram" class="err" role="alert">{{ errors.telegram }}</p>
          <p class="hint">Create via @BotFather then paste token here.</p>
        </div>
      </details>

      <!-- HTML Widget -->
      <details
        v-show="showPlatform('Web Chat')"
        class="card collapsible"
        :open="activeTab === 'Web Chat'"
      >
        <summary class="head">
          <h2 class="card-title">
            <span class="ic">{{ icon('Web Chat') }}</span> HTML Widget (Embed)
          </h2>
          <span class="pill ok">Available</span>
        </summary>

        <div class="field">
          <label class="lbl" for="embed-code">Embed Code</label>
          <div class="embedbox">
            <textarea id="embed-code" class="area" readonly rows="3">{{ embedCode }}</textarea>
            <button class="btn small ghost copy-embed" @click="copy(embedCode)">Copy</button>
          </div>
          <p class="hint">Place in your site <code>&lt;head&gt;</code> or just before <code>&lt;/body&gt;</code>.</p>
        </div>
      </details>
    </main>

    <!-- Sticky Action Bar -->
    <footer class="actionbar">
      <div class="summary">
        <span class="sum-title">Ready to save integrations?</span>
        <button class="cta" :disabled="submitting || !canSave" @click="saveIntegrations">
          <span v-if="!submitting">Save Changes</span>
          <span v-else class="loader">Saving…</span>
        </button>
      </div>

      <!-- Toasts -->
      <transition name="toast"><div v-if="msg" class="toast ok">{{ msg }}</div></transition>
      <transition name="toast"><div v-if="err" class="toast bad">{{ err }}</div></transition>
    </footer>
  </div>
</template>
<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

/* ===== context ===== */
const route = useRoute()
const toast = useToast()

/* ===== constants ===== */
const botId = route.params.id || 1
const botName = 'Msaidizi Mary' // display label only (keep code in English)
const platformOrder = ['WhatsApp', 'Instagram DM', 'Telegram', 'Web Chat']
const activeTab = ref('All')
const docsUrl = import.meta.env.VITE_INTEGRATIONS_DOCS_URL || 'https://smartbiz.ai/docs/integrations'

/* ===== storage helpers ===== */
const draftKey = `sbz.integrations.${botId}`
const safeGet = (key, fallback) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback }
  catch { return fallback }
}
const safeSet = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }
const safeDel = (key) => { try { localStorage.removeItem(key) } catch {} }

/* ===== state ===== */
const integrations = ref(
  safeGet(draftKey, { whatsapp: '', instagram: '', telegram: '' })
)

const reveal   = ref({ instagram: false, telegram: false })
const errors   = ref({ whatsapp: '', instagram: '', telegram: '' })
const submitting = ref(false)
const testing    = ref('')       // 'whatsapp' | 'instagram' | 'telegram' | ''
const testingAll = ref(false)
const msg = ref('')
const err = ref('')

/* ===== validators ===== */
const isHttpsUrl = (v) => /^https:\/\/.+/i.test(v || '')
const isInstagramToken = (v) => (v || '').length >= 25
const isTelegramToken  = (v) => /^\d+:[A-Za-z0-9_\-]{20,}$/.test(v || '')

/* ===== computed ===== */
// IMPORTANT: escape the closing script tag to avoid SFC parser errors
const embedCode = computed(
  () => `<script src="https://smartbiz.ai/bots/embed/${botId}" async><\\/script>`
)

const validWhatsapp  = computed(() => isHttpsUrl(integrations.value.whatsapp))
const validInstagram = computed(() => isInstagramToken(integrations.value.instagram))
const validTelegram  = computed(() => isTelegramToken(integrations.value.telegram))

// More strict: allow save only if there is at least one filled field AND all filled fields are valid
const canSave = computed(() => {
  const vals = {
    whatsapp: integrations.value.whatsapp,
    instagram: integrations.value.instagram,
    telegram: integrations.value.telegram
  }
  const hasAny = !!(vals.whatsapp || vals.instagram || vals.telegram)
  if (!hasAny) return false

  // only validate fields that are present
  const checks = []
  if (vals.whatsapp)  checks.push(validWhatsapp.value)
  if (vals.instagram) checks.push(validInstagram.value)
  if (vals.telegram)  checks.push(validTelegram.value)

  const allPresentAreValid = checks.every(Boolean)
  const noInlineErrors = !(errors.value.whatsapp || errors.value.instagram || errors.value.telegram)
  return allPresentAreValid && noInlineErrors
})

/* ===== auto-save draft ===== */
watch(integrations, (v) => safeSet(draftKey, v), { deep: true })

/* ===== ui helpers ===== */
function showPlatform(p){ return activeTab.value === 'All' || activeTab.value === p }

function validate(key) {
  if (key === 'whatsapp') {
    const u = integrations.value.whatsapp
    errors.value.whatsapp = !u ? '' : (isHttpsUrl(u) ? '' : 'Webhook must start with https://')
  }
  if (key === 'instagram') {
    const t = integrations.value.instagram
    errors.value.instagram = !t ? '' : (isInstagramToken(t) ? '' : 'Token looks too short.')
  }
  if (key === 'telegram') {
    const t = integrations.value.telegram
    errors.value.telegram = !t ? '' : (isTelegramToken(t) ? '' : 'Invalid Telegram token format.')
  }
}

/* debounce validate (and clean up on unmount) */
let debounceId
function validateDebounced(key){
  clearTimeout(debounceId)
  debounceId = setTimeout(() => validate(key), 160)
}
onBeforeUnmount(() => clearTimeout(debounceId))

/* robust copy (with fallback) */
async function copy(text) {
  const payload = String(text ?? '')
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
    } else {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = payload
      ta.setAttribute('readonly', '')
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    toast.success('Copied to clipboard.')
    msg.value = 'Copied to clipboard.'
  } catch {
    toast.error('Copy failed. Select and copy manually.')
    err.value = 'Copy failed.'
  } finally {
    setTimeout(() => { msg.value = ''; err.value = '' }, 1800)
  }
}

/* fake test endpoints (replace with real API calls) */
async function test(kind) {
  testing.value = kind
  err.value = ''; msg.value = ''
  try {
    // Example real call:
    // await axios.post('/api/integrations/test', { botId, kind, value: integrations.value[kind] })
    await new Promise(r => setTimeout(r, 700))
    msg.value = `${kind === 'whatsapp' ? 'WhatsApp' : kind} is reachable.`
    toast.success(msg.value)
  } catch {
    err.value = 'Test failed. Check credentials or network.'
    toast.error(err.value)
  } finally {
    testing.value = ''
    setTimeout(() => { msg.value = ''; err.value = '' }, 2200)
  }
}

async function testAll(){
  testingAll.value = true
  try {
    const kinds = ['whatsapp', 'instagram', 'telegram']
    let ran = 0
    for (const k of kinds) {
      if (integrations.value[k]) { ran++; await test(k) }
    }
    if (!ran) toast.info('Nothing to test yet.')
  } finally {
    testingAll.value = false
  }
}

async function saveIntegrations() {
  if (!canSave.value) {
    err.value = 'Please fix errors or add at least one integration.'
    toast.error(err.value)
    setTimeout(() => (err.value = ''), 2000)
    return
  }
  submitting.value = true
  err.value = ''; msg.value = ''
  try {
    const payload = { botId, ...integrations.value }
    // await axios.post('/api/bots/integrations', payload)
    await new Promise(r => setTimeout(r, 900))
    msg.value = 'Integrations saved successfully!'
    toast.success(msg.value)
    safeDel(draftKey)
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Failed to save integrations.'
    toast.error(err.value)
  } finally {
    submitting.value = false
    setTimeout(() => { msg.value = ''; err.value = '' }, 2500)
  }
}

/* icons (Unicode escapes only to avoid encoding issues on Windows) */
function icon(p){
  const k = String(p).toLowerCase()
  if (k.includes('whatsapp'))  return '\u{1F7E2}'  // 🟢
  if (k.includes('telegram'))  return '\u{1F4AC}'  // 💬
  if (k.includes('instagram')) return '\u{1F4F8}'  // 📸
  if (k.includes('web'))       return '\u{1F310}'  // 🌐
  return '\u{1F916}'                              // 🤖
}
</script>

<style scoped>
/* ===== App (digital gradient) ===== */
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
  padding:1rem .95rem .6rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
  display:grid; grid-template-columns:1fr auto; gap:.6rem; align-items:center;
}
.title h1{ margin:0; font-size:1.05rem; font-weight:900 }
.title p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.75) }
.actions-head{ display:flex; gap:.4rem }

/* ===== Chips ===== */
.pad{ padding:.75rem .95rem 0 }
.chips{
  display:flex; gap:.5rem; overflow-x:auto; padding-bottom:.2rem;
}
.chips::-webkit-scrollbar{ display:none }
.chip{
  padding:.45rem .7rem; border-radius:999px; white-space:nowrap; font-weight:800; font-size:.86rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff;
  display:inline-flex; align-items:center; gap:.35rem;
}
.chip .ic{ font-size:.95rem }
.chip.active{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  border-color:transparent; color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35);
}

/* ===== Cards / Collapsible ===== */
.card{
  border-radius:1.25rem; padding:1rem; margin-bottom:.9rem;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.14); backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
}
.collapsible .head{ display:flex; align-items:center; justify-content:space-between; list-style:none; cursor:pointer }
.card-title{ margin:0; font-size:1rem; font-weight:900; display:flex; gap:.4rem; align-items:center }
.ic{ display:inline-block }

/* ===== Status pill ===== */
.pill{
  font-size:.72rem; padding:.22rem .5rem; border-radius:.6rem; border:1px solid;
}
.pill.ok{ color:#b8f3d8; border-color:#2dd4bf; background:rgba(45,212,191,.12) }
.pill.bad{ color:#ffc9d2; border-color:#f43f5e; background:rgba(244,63,94,.12) }

/* ===== Fields ===== */
.field{ margin-top:.75rem }
.lbl{ display:block; font-size:.82rem; color:rgba(255,255,255,.85); margin-bottom:.35rem }
.input-row{ display:flex; gap:.45rem; align-items:center }
.inp, .area{
  width:100%; border-radius:1rem; padding:.8rem .95rem; color:#fff; font-size:.95rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.16);
  transition: border-color .2s, box-shadow .2s;
}
.inp:focus, .area:focus{ outline:none; border-color:rgba(99,102,241,.7); box-shadow:0 0 0 3px rgba(99,102,241,.25) }
.area{ resize:none; min-height:90px }
.hint{ margin-top:.25rem; font-size:.82rem; color:rgba(255,255,255,.78) }
.err{ color:#fecaca; font-size:.86rem; margin-top:.25rem }

/* Embed */
.embedbox{ position:relative }
.copy-embed{ position:absolute; right:.35rem; top:.35rem }

/* Buttons */
.btn{
  border-radius:.9rem; padding:.65rem .85rem; font-weight:900; border:1px solid transparent; color:#fff;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); box-shadow:0 6px 18px rgba(99,102,241,.35)
}
.btn.ghost{ background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.16) }
.btn.small{ padding:.45rem .65rem; font-size:.9rem }
.btn:disabled{ opacity:.6 }
.loader{ display:inline-block }

/* Sticky Action Bar */
.actionbar{
  position:fixed; left:0; right:0; bottom:0; z-index:30;
  padding:.75rem .95rem 1rem;
  background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.6) 40%, rgba(0,0,0,.85) 100%);
  backdrop-filter: blur(12px);
}
.summary{
  display:flex; align-items:center; gap:.75rem;
  border-radius:1rem; padding:.7rem .75rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.14);
}
.sum-title{ font-weight:900 }
.cta{
  margin-left:auto; min-width:150px; border:none; border-radius:999px; padding:.9rem 1rem; font-weight:900; color:#000;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
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

/* small devices */
@media (max-width:380px){
  .cta{ min-width:130px; padding:.8rem .9rem }
}
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
</style>
