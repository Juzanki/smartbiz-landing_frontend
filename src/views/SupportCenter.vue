<!-- src/views/SupportCenter.vue -->
<template>
  <div class="page">
    <!-- Header -->
    <header class="head">
      <div class="brand">
        <img :src="logoUrl" alt="SmartBiz" class="logo" width="40" height="40" />
        <div class="brand-text">
          <h1 class="title">Support Center</h1>
          <p class="muted">Submit your ticket — we’ll reply as soon as possible.</p>
        </div>
      </div>
      <a class="mailto" href="mailto:info@smartbiz.site" rel="noopener">✉️ info@smartbiz.site</a>
    </header>

    <!-- Card -->
    <section class="card">
      <form @submit.prevent="submitTicket" novalidate>
        <!-- Subject -->
        <div class="field">
          <label for="subject">Subject</label>
          <input
            id="subject"
            v-model.trim="form.subject"
            type="text"
            class="input"
            placeholder="Brief summary of your issue"
            :maxlength="SUBJECT_MAX"
            autocomplete="off"
            required
            aria-describedby="subject-help"
          />
          <div id="subject-help" class="help tiny">{{ form.subject.length }}/{{ SUBJECT_MAX }}</div>
        </div>

        <!-- Row: Category + Priority -->
        <div class="row-2">
          <div class="field">
            <label for="category">Category</label>
            <select id="category" v-model="form.category" class="select" required>
              <option value="">-- Select --</option>
              <option>Technical Issue</option>
              <option>Billing</option>
              <option>Account</option>
              <option>Feature Request</option>
              <option>Other</option>
            </select>
          </div>

          <div class="field">
            <label for="priority">Priority</label>
            <select id="priority" v-model="form.priority" class="select" required>
              <option>Normal</option>
              <option>High</option>
              <option>Low</option>
            </select>
          </div>
        </div>

        <!-- Email (optional but helpful) -->
        <div class="field">
          <label for="email">Contact Email (optional)</label>
          <input
            id="email"
            v-model.trim="form.email"
            type="email"
            class="input"
            placeholder="your@email.com"
            autocomplete="email"
          />
        </div>

        <!-- Description -->
        <div class="field">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model.trim="form.description"
            class="textarea"
            rows="5"
            placeholder="Describe your issue in detail (steps to reproduce, screenshots, etc.)"
            :maxlength="DESC_MAX"
            required
            aria-describedby="desc-help"
          ></textarea>
          <div id="desc-help" class="help tiny">{{ form.description.length }}/{{ DESC_MAX }}</div>
        </div>

        <!-- Attachment -->
        <div
          class="drop"
          :class="{ 'drop--drag': dragging }"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInput"
            id="file"
            type="file"
            class="file"
            :accept="ACCEPT"
            @change="handleFileUpload"
          />
          <label class="drop__label" for="file" role="button" tabindex="0" @keydown.enter.prevent="fileInput?.click()">
            <span class="icon">📎</span>
            <span>
              Drag & drop or <b>choose a file</b> (max {{ MAX_MB }}MB, {{ ACCEPT_HINT }})
            </span>
          </label>

          <div v-if="form.file" class="file-chip" aria-live="polite">
            <span class="chip-name">{{ form.file.name }}</span>
            <button type="button" class="chip-x" @click="clearFile" aria-label="Remove file">✖️</button>
          </div>

          <p v-if="fileError" class="error tiny" aria-live="assertive">{{ fileError }}</p>
        </div>

        <!-- Submit -->
        <div class="actions">
          <button class="btn" type="submit" :disabled="loading || !canSubmit">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            {{ loading ? 'Sending…' : 'Submit Ticket' }}
          </button>
        </div>

        <!-- Alerts -->
        <p v-if="successMessage" class="alert alert--ok" aria-live="polite">✅ {{ successMessage }}</p>
        <p v-if="errorMessage" class="alert alert--bad" aria-live="assertive">❌ {{ errorMessage }}</p>
      </form>

      <div class="tip">
        <span class="tip-emoji">💡</span>
        <div>
          <b>Tip:</b> Attach a screenshot or PDF to speed up troubleshooting. If you can’t upload now, email us at
          <a href="mailto:info@smartbiz.site">info@smartbiz.site</a>.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import logoUrl from '@/assets/logo.svg' // safe Vite import

/* Config */
const API = import.meta.env.VITE_API_BASE_URL || '/api'
const SUBJECT_MAX = 100
const DESC_MAX = 1200
const MAX_MB = 8
const MAX_BYTES = MAX_MB * 1024 * 1024
const ACCEPT = 'image/*,application/pdf,text/plain'
const ACCEPT_HINT = 'images/PDF/TXT'

/* State */
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const fileError = ref('')
const dragging = ref(false)
const fileInput = ref(null)

const form = ref({
  subject: '',
  category: '',
  priority: 'Normal',
  email: localStorage.getItem('user_email') || '',
  description: '',
  file: null
})

/* Validation */
const canSubmit = computed(() =>
  form.value.subject.length >= 6 &&
  form.value.description.length >= 12 &&
  form.value.category &&
  form.value.priority &&
  !fileError.value
)

function clearAlerts () {
  successMessage.value = ''
  errorMessage.value = ''
  fileError.value = ''
}

function validateFile (file) {
  if (!file) return true
  if (file.size > MAX_BYTES) {
    fileError.value = `File is too large (${(file.size / 1048576).toFixed(1)}MB). Max is ${MAX_MB}MB.`
    return false
  }
  const okTypes = ['image/', 'application/pdf', 'text/plain']
  if (!okTypes.some(t => file.type.startsWith(t))) {
    fileError.value = 'Unsupported file type. Use images, PDF, or TXT.'
    return false
  }
  return true
}

function handleFileUpload (e) {
  clearAlerts()
  const file = e.target.files?.[0]
  if (validateFile(file)) {
    form.value.file = file || null
    fileError.value = ''
  } else {
    form.value.file = null
    if (fileInput.value) fileInput.value.value = ''
  }
}

function onDrop (e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (validateFile(file)) {
    form.value.file = file || null
    fileError.value = ''
  } else {
    form.value.file = null
    if (fileInput.value) fileInput.value.value = ''
  }
}

function clearFile () {
  form.value.file = null
  if (fileInput.value) fileInput.value.value = ''
  fileError.value = ''
}

async function submitTicket () {
  if (!canSubmit.value || loading.value) return
  clearAlerts()
  loading.value = true

  const fd = new FormData()
  fd.append('subject', form.value.subject)
  fd.append('category', form.value.category)
  fd.append('priority', form.value.priority)
  fd.append('email', form.value.email || '')
  fd.append('description', form.value.description)
  if (form.value.file) fd.append('attachment', form.value.file)

  try {
    const token = localStorage.getItem('access_token') || ''
    await axios.post(`${API}/support`, fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      timeout: 20000
    })

    successMessage.value = 'Ticket submitted successfully! We will contact you shortly.'
    // reset
    form.value.subject = ''
    form.value.category = ''
    form.value.priority = 'Normal'
    form.value.description = ''
    clearFile()
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.detail ||
      'Failed to submit ticket. Please try again, or email us: info@smartbiz.site'
  } finally {
    loading.value = false
  }
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
  --gold:#ffd700;
}

.page{ padding:16px; background:var(--bg); color:var(--text); }

/* Header */
.head{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px; }
.brand{ display:flex; gap:10px; align-items:center; min-width:0; }
.logo{ border-radius:50%; border:2px solid var(--gold); background:#fff; flex:0 0 auto; }
.title{ margin:0; font-size:1.25rem; font-weight:800; color:var(--brand); }
.muted{ color:var(--muted); }
.mailto{ color:var(--brand); font-weight:700; text-decoration:none; white-space:nowrap; }
.mailto:hover{ text-decoration:underline; }

/* Card */
.card{
  background:var(--card); border:1px solid var(--line); border-radius:16px;
  padding:14px; box-shadow:0 10px 30px rgba(2,6,23,.05);
  max-width:760px; margin:0 auto;
}

/* Fields */
.field{ display:flex; flex-direction:column; gap:6px; margin:8px 0; }
label{ font-weight:700; font-size:.95rem; }
.input, .select, .textarea{
  width:100%; border:1px solid var(--line); border-radius:12px;
  padding:.7rem .9rem; background:#fff; outline:none;
}
.textarea{ resize:vertical; min-height:120px; }
.input:focus, .select:focus, .textarea:focus{
  border-color:var(--gold); box-shadow:0 0 0 2px #ffd70055;
}
.help{ color:var(--muted); margin-top:2px; }
.tiny{ font-size:.82rem; }

/* Two-column on ≥680px */
.row-2{ display:grid; gap:10px; grid-template-columns:1fr; }
@media (min-width: 680px){
  .row-2{ grid-template-columns:1fr 1fr; }
  .title{ font-size:1.45rem; }
}

/* Dropzone */
.drop{
  border:1px dashed var(--line); border-radius:12px; padding:12px;
  background:#fff; display:flex; flex-direction:column; gap:8px;
}
.drop--drag{ background:#fffbe6; border-color:#fde68a; }
.drop__label{ display:flex; align-items:center; gap:8px; cursor:pointer; }
.icon{ font-size:1.15rem; }
.file{ display:none; }
.file-chip{
  display:flex; align-items:center; gap:8px; background:#f1f5f9; border-radius:999px;
  padding:.25rem .6rem; width:max-content;
}
.chip-name{ font-weight:700; }
.chip-x{ border:none; background:transparent; cursor:pointer; }

/* Actions */
.actions{ display:flex; justify-content:flex-end; margin-top:10px; }
.btn{
  background:var(--brand); color:#fff; border:none; border-radius:10px;
  padding:.7rem 1.1rem; font-weight:800; box-shadow:0 8px 18px rgba(10,28,61,.18);
}
.btn:disabled{ opacity:.6; cursor:not-allowed; }
.spinner{
  width:16px; height:16px; border:2px solid #fff; border-right-color:transparent;
  border-radius:50%; display:inline-block; margin-right:8px; animation:spin .8s linear infinite;
}
@keyframes spin{ to{ transform:rotate(360deg) } }

/* Alerts & Tips */
.alert{
  margin-top:10px; padding:.7rem .9rem; border-radius:12px; font-weight:700;
}
.alert--ok{ background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; }
.alert--bad{ background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }

.tip{
  display:flex; gap:10px; align-items:flex-start; background:#f1f5f9; border-radius:12px;
  padding:.75rem .9rem; color:#0f172a; margin-top:10px;
}
.tip-emoji{ font-size:1.2rem; }

/* Errors */
.error{ color:#b91c1c; }
</style>
