<template>
  <div class="msg-page">
    <!-- Header -->
    <header class="header">
      <div class="header__title">
        <span class="ico">✉️</span>
        <h1>Messaging Center</h1>
      </div>
      <p class="subtitle">Send messages to customers across platforms. Mobile-first, fast, and friendly.</p>
    </header>

    <!-- Form panel -->
    <section class="panel">
      <form @submit.prevent="sendMessage" novalidate>
        <!-- Row: Customer + Platform -->
        <div class="grid-2">
          <div class="field">
            <label for="cust">Select Customer</label>
            <select id="cust" v-model="form.customerId" required>
              <option value="">-- Select Customer --</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.platform }})
              </option>
            </select>
            <small v-if="selectedCustomer" class="hint">
              Sending to: <strong>{{ selectedCustomer.name }}</strong>
              <span v-if="selectedCustomer.handle">• {{ selectedCustomer.handle }}</span>
            </small>
          </div>

          <div class="field">
            <label for="plat">Select Platform</label>
            <select id="plat" v-model="form.platform" required>
              <option value="">-- Select Platform --</option>
              <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>

        <!-- Subject (Email only) -->
        <div class="field" v-if="form.platform === 'Email'">
          <label for="subj">Subject (Email)</label>
          <input id="subj" v-model.trim="form.subject" type="text" placeholder="Subject line…" />
        </div>

        <!-- Quick templates -->
        <div class="templates" aria-label="Quick templates">
          <button
            v-for="(t, i) in templates"
            :key="i"
            type="button"
            class="chip"
            @click="applyTemplate(t)"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- Message -->
        <div class="field">
          <label for="msg">Message</label>
          <textarea
            id="msg"
            v-model.trim="form.message"
            rows="5"
            placeholder="Type your message here…"
            required
          ></textarea>
          <div class="meter">
            <span class="muted">
              {{ charCount }} chars
              <span v-if="form.platform === 'SMS'">• ~{{ smsSegments }} SMS segment(s)</span>
            </span>
            <span class="muted" v-if="form.message">
              {{ remaining }} left (suggested {{ maxCharsHint }})
            </span>
          </div>
        </div>

        <!-- Options -->
        <div class="options">
          <label class="switch">
            <input type="checkbox" v-model="form.copyBusiness" />
            <span>Send copy to business email <strong>(info@smartbiz.site)</strong></span>
          </label>
        </div>

        <!-- Sticky action bar (mobile) -->
        <div class="actions">
          <button class="btn-primary" :disabled="!canSend || sending">
            <span v-if="!sending">🚀 Send Message</span>
            <span v-else>Sending…</span>
          </button>
        </div>
      </form>
    </section>

    <!-- Success toast -->
    <div v-if="successMessage" class="toast" @click="successMessage = ''">
      ✅ {{ successMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

/* Demo customers (replace with API as needed) */
const customers = ref([])
onMounted(() => {
  const demo = JSON.parse(localStorage.getItem('my_customers')) || [
    { id: 1, name: 'John Doe',  platform: 'WhatsApp', handle: '+255 712 345 678' },
    { id: 2, name: 'Jane Smith',platform: 'Telegram', handle: '@janesmith' },
    { id: 3, name: 'Ali Khan',  platform: 'SMS',      handle: '+255 713 000 111' },
    { id: 4, name: 'Asha M.',   platform: 'Email',    handle: 'asha@example.com' },
  ]
  customers.value = demo
})

const platforms = ['WhatsApp', 'Telegram', 'SMS', 'Email']

const form = ref({
  customerId: '',
  platform: '',
  subject: '',
  message: '',
  copyBusiness: true, // default ON (you can change)
})

const selectedCustomer = computed(() =>
  customers.value.find(c => c.id === form.value.customerId)
)

/* Quick templates (click to append) */
const templates = [
  { label: 'Greetings', text: 'Hello {{name}}, thanks for reaching out! 👋' },
  { label: 'Order Update', text: 'Hi {{name}}, your order is being processed. We will update you shortly.' },
  { label: 'Promo', text: 'Hey {{name}}! 🎉 Enjoy 10% off on your next order with code SMART10.' },
  { label: 'Follow-up', text: 'Hello {{name}}, just checking in—did you receive our previous message?' },
]
function applyTemplate(t){
  const name = selectedCustomer.value?.name || 'there'
  const text = t.text.replaceAll('{{name}}', name)
  form.value.message = form.value.message
    ? `${form.value.message}\n\n${text}`
    : text
}

/* SMS helper */
const charCount = computed(() => (form.value.message || '').length)
const smsSegments = computed(() => {
  const len = charCount.value
  if (!len) return 0
  // Simple estimate: 160 chars segments (no GSM vs UCS-2 nuance for brevity)
  return Math.ceil(len / 160)
})

/* Remaining hint (platform-aware) */
const maxHints = { SMS: 320, WhatsApp: 2000, Telegram: 2000, Email: 5000 }
const maxCharsHint = computed(() => maxHints[form.value.platform] ?? 2000)
const remaining = computed(() => Math.max((maxHints[form.value.platform] ?? 2000) - charCount.value, 0))

/* Validation */
const canSend = computed(() => {
  if (!form.value.customerId || !form.value.platform || !form.value.message) return false
  if (form.value.platform === 'Email' && !(form.value.subject || '').trim()) return false
  return true
})

const sending = ref(false)
const successMessage = ref('')

/* Sending logic:
   - Here we simulate sending. If "copyBusiness" is ON, we also open a mailto: to info@smartbiz.site.
   - When you connect a real API, do it in the try{} block and keep the mailto as optional copy.
*/
async function sendMessage(){
  if (!canSend.value || sending.value) return
  sending.value = true
  try {
    // Simulate API call
    await new Promise(res => setTimeout(res, 800))

    // Optional: send copy to business email
    if (form.value.copyBusiness) {
      const subject = encodeURIComponent(
        `[Copy] ${form.value.subject || `Message to ${selectedCustomer.value?.name || 'Customer'}`}`
      )
      const meta = `Customer: ${selectedCustomer.value?.name ?? ''} (${selectedCustomer.value?.handle ?? ''})
Platform: ${form.value.platform}`
      const body = encodeURIComponent(`${meta}\n\n---\n${form.value.message}`)
      // Open default mail client; harmless if blocked
      window.open(`mailto:info@smartbiz.site?subject=${subject}&body=${body}`, '_blank')
    }

    successMessage.value = 'Message sent successfully!'
    form.value.message = ''
    if (form.value.platform === 'Email') form.value.subject = ''
  } finally {
    sending.value = false
    setTimeout(() => (successMessage.value = ''), 3500)
  }
}
</script>

<style scoped>
:root{
  --bg:#f8fafc;
  --panel:#ffffff;
  --text:#0f172a;
  --muted:#64748b;
  --line:#e2e8f0;
  --brand:#0A1C3D;
  --gold:#ffd700;
}

.msg-page{
  padding:16px;
  background:var(--bg);
  color:var(--text);
}

/* Header */
.header__title{ display:flex; align-items:center; gap:.5rem; }
.header h1{ font-size:1.25rem; font-weight:800; margin:0; color:var(--brand); }
.ico{ font-size:1.2rem; }
.subtitle{ margin:.25rem 0 1rem; color:var(--muted); }

/* Panel */
.panel{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:16px;
  padding:14px;
  box-shadow:0 8px 24px rgba(2,6,23,.04);
}

/* Grid */
.grid-2{ display:grid; grid-template-columns:1fr; gap:10px; }

/* Fields */
.field{ display:flex; flex-direction:column; gap:6px; }
label{ font-weight:700; font-size:.9rem; }
select, input, textarea{
  border:1px solid var(--line);
  border-radius:12px;
  padding:.65rem .8rem;
  background:#fff;
  outline:none;
}
select:focus, input:focus, textarea:focus{
  box-shadow:0 0 0 2px #ffd70066;
  border-color:var(--gold);
}
textarea{ resize:vertical; min-height:120px; }
.hint{ color:var(--muted); }

/* Templates */
.templates{
  display:flex; gap:8px; overflow:auto; padding:6px 0 2px; margin:6px 0;
  -webkit-overflow-scrolling:touch;
}
.chip{
  border:1px solid var(--line);
  background:#fff;
  border-radius:999px;
  padding:.35rem .75rem;
  font-weight:700; font-size:.82rem; white-space:nowrap;
}
.chip:hover{ border-color:#cbd5e1; }

/* Meter */
.meter{ display:flex; justify-content:space-between; margin-top:6px; }
.muted{ color:var(--muted); font-size:.86rem; }

/* Options */
.options{ margin-top:8px; }
.switch{ display:flex; align-items:center; gap:.6rem; user-select:none; }
.switch input{ width:18px; height:18px; }

/* Actions (sticky on mobile) */
.actions{
  position:sticky; bottom:10px;
  padding-top:10px; margin-top:10px;
  background:linear-gradient(#ffffff00, #ffffff);
}
.btn-primary{
  width:100%;
  background:var(--brand);
  color:#fff; border:0;
  padding:.75rem 1rem;
  border-radius:12px;
  font-weight:800;
  box-shadow:0 10px 22px rgba(10,28,61,.18);
}
.btn-primary:disabled{ opacity:.6; }

/* Toast */
.toast{
  position:fixed; left:50%; transform:translateX(-50%);
  bottom:16px; background:#16a34a; color:#fff;
  padding:.6rem 1rem; border-radius:12px;
  box-shadow:0 10px 24px rgba(22,163,74,.35);
  cursor:pointer; z-index:50;
}

/* Desktop */
@media (min-width:768px){
  .msg-page{ padding:24px; }
  .header h1{ font-size:1.5rem; }
  .panel{ padding:18px; }
  .grid-2{ grid-template-columns:1fr 1fr; gap:12px; }
  .actions{ position:static; background:transparent; }
  .btn-primary{ width:auto; }
}
</style>
