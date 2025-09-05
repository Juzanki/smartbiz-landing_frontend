<template>
  <div class="help-wrap">
    <!-- Header -->
    <header class="hdr">
      <h1 class="ttl">Help Center</h1>
      <p class="sub">Find quick answers or contact us if you still need help.</p>
    </header>

    <!-- Search -->
    <div class="search">
      <input
        v-model.trim="q"
        type="search"
        inputmode="search"
        placeholder="🔎 Search questions (e.g. password, billing)…"
        aria-label="Search FAQs"
      />
    </div>

    <!-- Quick topics -->
    <div class="chips" role="list">
      <button
        v-for="t in topics"
        :key="t"
        class="chip"
        role="listitem"
        @click="applyTopic(t)"
      >#{{ t }}</button>
      <button class="chip ghost" @click="q = ''">Clear</button>
    </div>

    <!-- FAQ list -->
    <section aria-label="Frequently Asked Questions" class="faqs">
      <details
        v-for="(f, i) in filteredFaqs"
        :key="i"
        :open="i === 0"
        class="faq"
      >
        <summary class="q">
          <span>{{ f.question }}</span>
          <span class="chev" aria-hidden="true">▾</span>
        </summary>
        <div class="a">{{ f.answer }}</div>
      </details>

      <div v-if="!filteredFaqs.length" class="empty">
        <div class="emoji">🧐</div>
        <p>No results for “{{ q }}”. Try a different keyword.</p>
      </div>
    </section>

    <!-- CTA footer -->
    <footer class="cta">
      <button class="btn primary" @click="openSheet = true">✉️ Contact Support</button>
      <a class="btn ghost" :href="mailtoHref" rel="noopener">Email: {{ supportEmail }}</a>
    </footer>

    <!-- Contact Sheet / Modal -->
    <transition name="sheet">
      <div v-if="openSheet" class="sheet-backdrop" @click.self="openSheet=false">
        <section class="sheet" role="dialog" aria-modal="true" aria-label="Contact support form">
          <header class="sheet-head">
            <h3>Contact Support</h3>
            <button class="btn ghost sm" @click="openSheet=false">✖</button>
          </header>

          <form class="sheet-body" @submit.prevent="submit">
            <label class="lbl">Your Email
              <input class="inp" v-model.trim="form.email" type="email" placeholder="you@domain.com" required />
            </label>

            <label class="lbl">Subject
              <input class="inp" v-model.trim="form.subject" type="text" placeholder="Short subject" required />
            </label>

            <label class="lbl">Message
              <textarea class="inp" v-model.trim="form.message" rows="5" placeholder="Describe your issue…" required />
            </label>

            <div class="row">
              <label class="check">
                <input type="checkbox" v-model="form.copyMe" />
                <span>Send me a copy</span>
              </label>
              <small class="muted">Avg. response &lt; 24h</small>
            </div>

            <div class="sheet-foot">
              <button type="button" class="btn ghost" @click="openSheet=false">Cancel</button>
              <button type="submit" class="btn primary" :disabled="loading">
                <span v-if="loading">Sending…</span><span v-else>Send</span>
              </button>
            </div>

            <p v-if="ok" class="ok">✅ Message sent. We’ll get back to you shortly.</p>
          </form>
        </section>
      </div>
    </transition>

    <div class="safe-bottom" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const supportEmail = 'info@smartbiz.site'
const mailtoHref = computed(() => `mailto:${supportEmail}`)

const q = ref('')
const topics = ['account', 'password', 'billing', 'subscription', 'support']

const faqs = ref([
  {
    question: 'How can I reset my password?',
    answer:
      'Go to Login → “Forgot Password”, enter your email, then follow the code sent to you.'
  },
  {
    question: 'How do I contact support?',
    answer:
      `Use the “Contact Support” button below or email us directly at ${supportEmail}.`
  },
  {
    question: 'Can I upgrade my subscription?',
    answer:
      'Yes. Open Settings → Billing and choose a higher plan. Your balance is prorated automatically.'
  },
  {
    question: 'How to change my business logo?',
    answer:
      'Open Settings & Branding → paste a direct logo URL (PNG/SVG). Save and refresh to see changes.'
  }
])

const filteredFaqs = computed(() => {
  const s = q.value.toLowerCase().trim()
  if (!s) return faqs.value
  return faqs.value.filter(
    f =>
      f.question.toLowerCase().includes(s) ||
      f.answer.toLowerCase().includes(s)
  )
})

function applyTopic(t) {
  q.value = t
}

/* Contact sheet */
const openSheet = ref(false)
const loading = ref(false)
const ok = ref(false)
const form = ref({
  email: '',
  subject: '',
  message: '',
  copyMe: true
})

onMounted(() => {
  const saved = localStorage.getItem('help_form_draft')
  if (saved) Object.assign(form.value, JSON.parse(saved))
})

function persistDraft() {
  localStorage.setItem('help_form_draft', JSON.stringify(form.value))
}

async function submit() {
  loading.value = true
  ok.value = false
  // Simulate API send
  await new Promise(r => setTimeout(r, 900))
  loading.value = false
  ok.value = true
  persistDraft()

  // Optional: open mail client as a fallback
  const body = encodeURIComponent(
    `${form.value.message}\n\n— From: ${form.value.email}`
  )
  window.open(
    `mailto:${supportEmail}?subject=${encodeURIComponent(
      form.value.subject
    )}&body=${body}`,
    '_blank'
  )
}
</script>

<style scoped>
:root{
  --fg:#0f172a; --muted:#64748b; --line:#e5e7eb;
  --brand:#2563eb; --warn:#ef4444; --bg:#ffffff; --card:#ffffff;
  --shadow:0 10px 24px rgba(0,0,0,.06);
}

.help-wrap{ max-width:880px; margin-inline:auto; padding:12px; color:var(--fg); }
.hdr{ text-align:center; margin:6px 0 14px; }
.ttl{ font-size:1.4rem; font-weight:900; margin:0 0 4px; }
.sub{ color:var(--muted); margin:0; }

.search input{
  width:100%; border:1px solid var(--line); border-radius:14px; padding:.8rem 1rem;
  outline:none;
}
.search input:focus{ border-color:#9ec1ff; box-shadow:0 0 0 3px #9ec1ff40; }

.chips{ display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 14px; }
.chip{
  border:1px solid var(--line); background:#fff; color:var(--fg);
  padding:.35rem .7rem; border-radius:999px; font-weight:800;
}
.chip.ghost{ background:#f8fafc; }

.faqs{ display:grid; gap:10px; }
.faq{
  border:1px solid var(--line); border-radius:16px; background:var(--card); box-shadow:var(--shadow);
  overflow:hidden;
}
.q{
  list-style:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between;
  gap:10px; padding:12px 14px; font-weight:800; background:#eff6ff;
}
.q::-webkit-details-marker{ display:none }
.faq[open] .q{ background:#dbeafe; }
.chev{ transform:rotate(0deg); transition:transform .2s ease; }
.faq[open] .chev{ transform:rotate(180deg) }

.a{ padding:12px 14px; color:#334155; background:#ffffff; }

.empty{ text-align:center; color:var(--muted); padding:28px 8px; }
.empty .emoji{ font-size:2rem; margin-bottom:6px; }

.cta{
  position:sticky; bottom:10px; display:flex; gap:8px; justify-content:center; margin-top:16px;
  background:linear-gradient(180deg, transparent, #fff 55%); padding-top:10px;
}
.btn{
  border:1px solid var(--line); border-radius:12px; padding:.7rem 1rem; font-weight:900;
  background:#111827; color:#fff;
}
.btn.ghost{ background:#fff; color:#111827; }
.btn.primary{ background:var(--brand); border-color:var(--brand); }
.btn.sm{ padding:.35rem .55rem; border-radius:10px; }

/* Sheet */
.sheet-backdrop{
  position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:30; display:flex; align-items:flex-end; justify-content:center;
}
.sheet{
  width:100%; max-width:520px; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px;
  box-shadow:0 -12px 28px rgba(0,0,0,.35); max-height:85vh; overflow:auto;
}
.sheet-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid var(--line); }
.sheet-body{ padding:12px; display:grid; gap:10px; }
.sheet-foot{ display:flex; justify-content:flex-end; gap:8px; padding:6px 12px 12px; }

.lbl{ display:grid; gap:6px; font-weight:700; font-size:.95rem; }
.inp{
  border:1px solid var(--line); border-radius:12px; min-height:44px; padding:0 12px; outline:none; width:100%;
}
textarea.inp{ padding:10px 12px; resize:vertical; }
.inp:focus{ border-color:#9ec1ff; box-shadow:0 0 0 3px #9ec1ff40; }
.row{ display:flex; align-items:center; justify-content:space-between; }
.check{ display:flex; align-items:center; gap:8px; }
.muted{ color:var(--muted); }
.ok{ color:#16a34a; font-weight:700; margin:6px 2px 0; }

.sheet-enter-active,.sheet-leave-active{ transition: opacity .22s ease, transform .22s ease; }
.sheet-enter-from,.sheet-leave-to{ opacity:0; transform:translateY(14px); }

.safe-bottom{ height:max(env(safe-area-inset-bottom), 10px); }

@media (min-width:768px){
  .help-wrap{ padding:16px; }
  .sheet-backdrop{ align-items:center; }
  .sheet{ border-radius:16px; }
}
</style>
