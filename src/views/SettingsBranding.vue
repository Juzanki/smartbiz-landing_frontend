<template>
  <div class="wrap">
    <!-- Header -->
    <header class="head">
      <h2 class="ttl">⚙️ Settings & Branding</h2>
      <small class="muted">{{ today }}</small>
    </header>

    <!-- Live Brand Bar -->
    <div class="brand-bar" :style="{ '--brand': settings.primaryColor }">
      <img v-if="settings.logoUrl" :src="settings.logoUrl" alt="logo" class="brand-logo" />
      <div class="brand-meta">
        <strong>{{ settings.businessName || 'Your Business' }}</strong>
        <span class="muted">{{ settings.tagline || 'Your slogan or mission' }}</span>
      </div>
    </div>

    <div class="grid">
      <!-- Form -->
      <section class="card">
        <form @submit.prevent="saveSettings" novalidate>
          <div class="form-grid">
            <!-- Business Name -->
            <label class="lbl">Business Name
              <input class="inp" v-model.trim="settings.businessName" type="text" required placeholder="SmartBiz" />
            </label>

            <!-- Preferred Language -->
            <label class="lbl">Preferred Language
              <select class="inp" v-model="settings.language" required>
                <option value="en">English</option>
                <option value="sw">Swahili</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </label>

            <!-- Tagline -->
            <label class="lbl span-2">Business Tagline
              <input class="inp" v-model.trim="settings.tagline" type="text" placeholder="AI • E-commerce • Live" />
            </label>

            <!-- Timezone -->
            <label class="lbl">Timezone
              <select class="inp" v-model="settings.timezone">
                <option>Africa/Dar_es_Salaam</option>
                <option>Africa/Nairobi</option>
                <option>UTC</option>
                <option>Asia/Dubai</option>
                <option>America/New_York</option>
              </select>
            </label>

            <!-- Currency -->
            <label class="lbl">Default Currency
              <select class="inp" v-model="settings.currency">
                <option value="TZS">TZS</option>
                <option value="USD">USD</option>
                <option value="KES">KES</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <!-- Logo -->
            <div class="span-2">
              <label class="lbl">Upload Logo
                <div class="logo-row">
                  <input class="inp" v-model.trim="settings.logoUrl" type="url" inputmode="url" placeholder="https://.../logo.png" />
                  <input type="file" accept="image/*" class="file" @change="pickLogo" />
                </div>
              </label>
              <small class="muted">Tip: Unaweza kubonyeza “Choose file” kuchukua picha moja kwa moja kutoka simu.</small>
            </div>

            <!-- Colors -->
            <div class="cols-2">
              <label class="lbl">Primary Color
                <div class="color-row">
                  <input class="color" type="color" v-model="settings.primaryColor" />
                  <input class="inp" v-model="settings.primaryColor" />
                </div>
              </label>

              <label class="lbl">Secondary Color
                <div class="color-row">
                  <input class="color" type="color" v-model="settings.secondaryColor" />
                  <input class="inp" v-model="settings.secondaryColor" />
                </div>
              </label>
            </div>

            <!-- Custom Domain -->
            <div class="span-2">
              <label class="switch">
                <input type="checkbox" v-model="settings.enableCustomDomain" />
                <span class="track"></span>
                <span>Enable Custom Domain (e.g. <b>yourbiz.co.tz</b>)</span>
              </label>

              <transition name="fade">
                <div v-if="settings.enableCustomDomain" class="domain-box">
                  <input class="inp" v-model.trim="settings.customDomain" type="text" placeholder="smartbiz.site" />
                  <button class="btn ghost" type="button" @click="checkDomain">Verify</button>
                  <small :class="domainValid ? 'ok' : 'warn'">
                    {{ domainHint }}
                  </small>
                </div>
              </transition>
            </div>
          </div>

          <div class="actions">
            <button class="btn ghost" type="button" @click="resetSettings">Reset</button>
            <button class="btn primary" type="submit">
              <span v-if="saving" class="spinner"></span>
              💾 Save Changes
            </button>
          </div>
        </form>

        <div v-if="success" class="alert ok">
          ✅ Settings saved successfully!
          <button class="close" @click="success=false">✕</button>
        </div>
      </section>

      <!-- Preview -->
      <aside class="card preview">
        <h5 class="title">Brand Preview</h5>
        <img v-if="settings.logoUrl" :src="settings.logoUrl" alt="Logo preview" class="preview-logo" />
        <div v-else class="preview-placeholder">Logo preview</div>

        <div class="chips">
          <span class="chip" :style="{ backgroundColor: settings.primaryColor }">Primary</span>
          <span class="chip" :style="{ backgroundColor: settings.secondaryColor }">Secondary</span>
        </div>

        <ul class="spec">
          <li><b>Language:</b> {{ codeToLabel(settings.language) }}</li>
          <li><b>Timezone:</b> {{ settings.timezone }}</li>
          <li><b>Currency:</b> {{ settings.currency }}</li>
          <li v-if="settings.enableCustomDomain"><b>Domain:</b> {{ settings.customDomain || '—' }}</li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const today = computed(() =>
  new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
)

const success = ref(false)
const saving = ref(false)
const domainValid = ref(false)
const domainHint = ref('Enter your domain to verify.')

const settings = ref({
  businessName: '',
  tagline: '',
  language: 'en',
  logoUrl: '',
  primaryColor: '#0d6efd',
  secondaryColor: '#6c757d',
  timezone: 'Africa/Dar_es_Salaam',
  currency: 'TZS',
  enableCustomDomain: false,
  customDomain: ''
})

/* Load + apply theme */
onMounted(() => {
  const saved = JSON.parse(localStorage.getItem('user_settings'))
  if (saved) settings.value = { ...settings.value, ...saved }
  applyTheme()
})

watch(() => [settings.value.primaryColor, settings.value.secondaryColor], applyTheme)

function applyTheme () {
  const root = document.documentElement
  root.style.setProperty('--brand', settings.value.primaryColor)
  root.style.setProperty('--brand-2', settings.value.secondaryColor)
}

function pickLogo (e) {
  const file = e.target.files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  settings.value.logoUrl = url
}

function checkDomain () {
  const rgx = /^(?!https?:\/\/)(?!www\.)[a-z0-9-]+(\.[a-z]{2,})+$/i
  domainValid.value = rgx.test(settings.value.customDomain || '')
  domainHint.value = domainValid.value ? 'Looks good! Save to apply.' : 'Invalid domain. Example: yourbiz.co.tz'
}

function resetSettings () {
  localStorage.removeItem('user_settings')
  settings.value = {
    businessName: '',
    tagline: '',
    language: 'en',
    logoUrl: '',
    primaryColor: '#0d6efd',
    secondaryColor: '#6c757d',
    timezone: 'Africa/Dar_es_Salaam',
    currency: 'TZS',
    enableCustomDomain: false,
    customDomain: ''
  }
  applyTheme()
}

function saveSettings () {
  if (settings.value.enableCustomDomain) checkDomain()
  if (settings.value.enableCustomDomain && !domainValid.value) return

  saving.value = true
  setTimeout(() => {
    localStorage.setItem('user_settings', JSON.stringify(settings.value))
    saving.value = false
    success.value = true
  }, 500)
}

function codeToLabel (code) {
  return ({ en: 'English', sw: 'Swahili', fr: 'French', es: 'Spanish' }[code] || code)
}
</script>

<style scoped>
/* Tokens */
:root{
  --bg:#ffffff; --fg:#0f172a; --muted:#64748b;
  --card:#ffffff; --line:#e5e7eb;
  --brand:#0d6efd; --brand-2:#6c757d;
  --shadow:0 10px 25px rgba(0,0,0,.06);
}

/* Layout */
.wrap{ max-width:1100px; margin-inline:auto; padding:16px; color:var(--fg); }
.head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.ttl{ font-weight:800; font-size:1.25rem; margin:0; }
.muted{ color:var(--muted); }

/* Brand bar */
.brand-bar{
  display:flex; gap:12px; align-items:center; margin:12px 0 16px;
  background:linear-gradient(90deg, var(--brand), color-mix(in lab, var(--brand) 40%, #000));
  color:#fff; border-radius:16px; padding:10px 12px;
}
.brand-logo{ width:40px; height:40px; border-radius:50%; background:#fff; object-fit:cover; }
.brand-meta{ display:flex; flex-direction:column; line-height:1.15; }

/* Grid */
.grid{ display:grid; grid-template-columns: 1fr; gap:14px; }
@media (min-width: 820px){ .grid{ grid-template-columns: 2fr 1fr; }}

/* Cards */
.card{
  background:var(--card); border:1px solid var(--line);
  border-radius:16px; padding:16px; box-shadow:var(--shadow);
}

/* Form */
.form-grid{
  display:grid; grid-template-columns: 1fr; gap:12px;
}
@media (min-width: 640px){
  .form-grid{ grid-template-columns: repeat(2, 1fr); }
}
.span-2{ grid-column: 1 / -1; }
.cols-2{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }

.lbl{ font-weight:700; font-size:.92rem; display:grid; gap:6px; }
.inp{
  border:1px solid var(--line); border-radius:12px; min-height:44px;
  padding:0 12px; outline:none; background:#fff;
}
.inp:focus{ border-color:var(--brand); box-shadow:0 0 0 2px color-mix(in lab, var(--brand) 30%, transparent); }

.logo-row{ display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center; }
.file{ padding:10px; border:1px dashed var(--line); border-radius:12px; background:#f8fafc; }

.color-row{ display:grid; grid-template-columns: auto 1fr; gap:8px; align-items:center; }
.color{ width:44px; height:44px; border-radius:12px; border:1px solid var(--line); padding:0; }

/* Switch */
.switch{ display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; margin-top:4px; }
.switch input{ display:none; }
.track{ position:relative; width:46px; height:26px; background:#e2e8f0; border-radius:999px; transition:.2s; }
.track::after{ content:''; position:absolute; top:3px; left:3px; width:20px; height:20px; background:#fff; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,.2); transition:.2s; }
.switch input:checked + .track{ background:var(--brand); }
.switch input:checked + .track::after{ transform:translateX(20px); }

.domain-box{ display:grid; grid-template-columns: 1fr auto; gap:8px; margin-top:8px; align-items:center; }
.ok{ color:#059669; }
.warn{ color:#e11d48; }

/* Buttons */
.actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:14px; }
.btn{
  border:1px solid var(--line); background:#111827; color:#fff;
  padding:.6rem .9rem; border-radius:12px; font-weight:800;
}
.btn.ghost{ background:#fff; color:#111827; }
.btn.primary{ background:var(--brand); border-color:var(--brand); }
.spinner{ display:inline-block; width:16px; height:16px; border-radius:50%; border:2px solid #fff; border-top-color:transparent; margin-right:6px; animation:spin .7s linear infinite; }
@keyframes spin{ to{ transform:rotate(360deg) } }

/* Alert */
.alert{ margin-top:12px; padding:10px 12px; border-radius:10px; position:relative; }
.alert.ok{ background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; }
.close{ position:absolute; right:8px; top:6px; background:transparent; border:none; cursor:pointer; font-size:14px; }

/* Preview */
.preview .title{ margin:0 0 10px; font-weight:800; color:#111827; }
.preview-logo{ width:120px; height:120px; object-fit:cover; border-radius:16px; border:1px solid var(--line); }
.preview-placeholder{
  width:120px; height:120px; display:grid; place-items:center; border-radius:16px;
  border:1px dashed var(--line); color:var(--muted);
}
.chips{ display:flex; gap:8px; margin:12px 0; }
.chip{ color:#fff; padding:.4rem .6rem; border-radius:999px; font-weight:800; font-size:.8rem; }
.spec{ list-style:none; padding:0; margin:0; display:grid; gap:6px; color:#334155; }

/* Transitions */
.fade-enter-active,.fade-leave-active{ transition:opacity .2s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
</style>
