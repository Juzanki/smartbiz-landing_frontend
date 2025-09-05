<!-- src/views/CreateBotMobile.vue -->
<template>
  <div class="app">
    <!-- Sticky App Bar -->
    <header class="appbar">
      <div class="title">
        <h1>Create Your Personal Bot</h1>
        <p>Name it, define its role, and confirm your package</p>
      </div>
    </header>

    <main class="pad">
      <!-- Main Card -->
      <div class="card">
        <!-- Bot Name -->
        <div class="field">
          <label class="lbl">Bot Name</label>
          <div class="rel">
            <input
              class="inp"
              type="text"
              v-model.trim="botName"
              :maxlength="NAME_MAX"
              placeholder="e.g., Assistant Mary"
              @input="validate"
            />
            <span class="count">{{ botName.length }}/{{ NAME_MAX }}</span>
          </div>
          <p v-if="v.name" class="err">{{ v.name }}</p>
        </div>

        <!-- Bot Purpose -->
        <div class="field">
          <label class="lbl">What should this bot do?</label>
          <div class="rel">
            <textarea
              class="area"
              v-model.trim="botPurpose"
              :maxlength="PURPOSE_MAX"
              rows="5"
              placeholder="e.g., Handle WhatsApp inquiries about my products, suggest bundles, and escalate complex issues to a human."
              @input="validate"
            />
            <span class="count">{{ botPurpose.length }}/{{ PURPOSE_MAX }}</span>
          </div>
          <p v-if="v.purpose" class="err">{{ v.purpose }}</p>
        </div>

        <!-- Package -->
        <div class="field">
          <label class="lbl">Selected Package</label>
          <div class="pkg">
            <PackageTag :name="selectedPackage?.name || 'No package selected'" />
            <button class="mini" @click="changePackage">Change</button>
          </div>
          <p class="hint" v-if="selectedPackage?.name">
            You chose <b>{{ selectedPackage.name }}</b>. You can change it before payment.
          </p>
          <p v-else class="err">Please choose a package.</p>
        </div>
      </div>

      <!-- Tips -->
      <div class="tip card">
        <p class="tip-line">• Be specific in purpose (channels, tone, allowed actions).</p>
        <p class="tip-line">• You can teach more knowledge later from the bot page.</p>
      </div>
    </main>

    <!-- Sticky Confirmation Bar -->
    <footer class="actionbar">
      <div class="summary">
        <div class="sum-left">
          <span class="sum-title">Ready to create?</span>
          <span class="sum-sub">{{ selectedPackage?.name || 'No package' }}</span>
        </div>
        <button
          class="cta"
          :disabled="submitting || !canSubmit"
          @click="submitBot"
        >
          <span v-if="!submitting">Confirm & Pay</span>
          <span v-else class="spinner small">Processing…</span>
        </button>
      </div>

      <!-- Toasts -->
      <transition name="toast"><div v-if="msg" class="toast ok">{{ msg }}</div></transition>
      <transition name="toast"><div v-if="err" class="toast bad">{{ err }}</div></transition>
    </footer>
  </div>
</template>

<script setup>
/**
 * Mobile-first “Create Bot” screen.
 * - English-only labels & comments
 * - Live validation, counters, sticky action bar
 * - Pulls selected package from route query (?package=ProBot)
 * - Emits toast messages and navigates to /bots/my on success
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import PackageTag from '@/components/PackageTag.vue'

// Constants
const NAME_MAX = 40
const PURPOSE_MAX = 280

// Router & toast
const route = useRoute()
const router = useRouter()
const toast = useToast()

// State
const botName = ref('')
const botPurpose = ref('')
const selectedPackage = ref({ name: route.query.package || null })

const submitting = ref(false)
const msg = ref('')
const err = ref('')
const v = ref({ name: '', purpose: '' }) // validation messages

// Derived
const canSubmit = computed(() =>
  !v.value.name &&
  !v.value.purpose &&
  !!selectedPackage.value.name &&
  botName.value.trim().length > 1 &&
  botPurpose.value.trim().length > 10
)

// Methods
function validate() {
  v.value.name = !botName.value.trim()
    ? 'Bot name is required.'
    : botName.value.trim().length < 2
      ? 'Please use at least 2 characters.'
      : ''
  v.value.purpose = !botPurpose.value.trim()
    ? 'Bot purpose is required.'
    : botPurpose.value.trim().length < 20
      ? 'Please write at least 20 characters for clarity.'
      : ''
}

function changePackage() {
  // Navigate to package picker
  router.push({ path: '/bots/packages', query: { from: 'create' } })
}

async function submitBot() {
  validate()
  if (!canSubmit.value) {
    err.value = 'Please complete all required fields.'
    setTimeout(() => (err.value = ''), 2200)
    return
  }

  submitting.value = true
  err.value = ''
  msg.value = ''

  try {
    // Example payload — replace with your API call
    const payload = {
      name: botName.value.trim(),
      purpose: botPurpose.value.trim(),
      package: selectedPackage.value.name
    }
    // await axios.post('/api/bots', payload)
    await new Promise(r => setTimeout(r, 900)) // demo delay

    const successText = `Bot "${payload.name}" prepared with package ${payload.package}.`
    toast.success(successText)
    msg.value = successText

    // Navigate to "My Bots"
    setTimeout(() => router.push('/bots/my'), 1200)
  } catch (e) {
    const detail = e?.response?.data?.detail || 'Failed to create the bot. Please try again.'
    toast.error(detail)
    err.value = detail
  } finally {
    submitting.value = false
    setTimeout(() => { msg.value = ''; err.value = '' }, 2600)
  }
}

onMounted(() => {
  // Initial validation to set helper messages
  validate()
})
</script>

<style scoped>
/* ===== App background (digital gradient) ===== */
.app{
  min-height:100vh;
  background:
    radial-gradient(900px 480px at 90% -10%, #2e2a8a 0%, rgba(46,42,138,0) 60%),
    radial-gradient(800px 420px at -10% 0%, #6b21a8 0%, rgba(107,33,168,0) 55%),
    linear-gradient(180deg,#0a0f22 0%, #0b1633 100%);
  color:#fff;
  display:flex; flex-direction:column;
}

/* ===== App Bar ===== */
.appbar{
  position:sticky; top:0; z-index:20;
  padding:1rem .95rem .75rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.title h1{ margin:0; font-size:1.05rem; font-weight:900; letter-spacing:.2px }
.title p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.72) }

/* ===== Layout ===== */
.pad{ padding: .75rem .95rem 7.75rem } /* leave room for sticky footer */

/* ===== Cards ===== */
.card{
  border-radius:1.25rem; padding:1rem; margin-bottom:.8rem;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.14); backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
}

/* ===== Fields ===== */
.field{ margin-bottom:.9rem }
.lbl{ display:block; font-size:.82rem; color:rgba(255,255,255,.85); margin-bottom:.35rem }
.rel{ position:relative }
.inp, .area{
  width:100%; border-radius:1rem; padding:.8rem .95rem; color:#fff; font-size:.95rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.16);
  transition: border-color .2s, box-shadow .2s;
}
.inp:focus, .area:focus{ outline:none; border-color:rgba(99,102,241,.7); box-shadow:0 0 0 3px rgba(99,102,241,.25) }
.count{
  position:absolute; right:.6rem; bottom:.5rem; font-size:.75rem; color:rgba(255,255,255,.6)
}
.err{ margin-top:.35rem; color:#fecaca; font-size:.86rem }
.hint{ margin-top:.35rem; color:rgba(255,255,255,.8); font-size:.86rem }

/* ===== Package row ===== */
.pkg{
  display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
  border-radius:1rem; padding:.55rem .7rem;
}
.mini{
  margin-left:auto; height:34px; padding:0 .8rem;
  border-radius:.8rem; border:1px solid rgba(255,255,255,.16); color:#fff;
  background:rgba(255,255,255,.08);
}

/* ===== Info Card ===== */
.tip .tip-line{ margin:.1rem 0; font-size:.9rem; color:rgba(255,255,255,.86) }

/* ===== Sticky Action Bar ===== */
.actionbar{
  position:fixed; left:0; right:0; bottom:0; z-index:30;
  padding:.75rem .95rem 1rem;
  background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.6) 40%, rgba(0,0,0,.85) 100%);
  backdrop-filter: blur(12px);
}
.summary{
  display:flex; gap:.8rem; align-items:center;
  border-radius:1rem; padding:.7rem .75rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.14);
}
.sum-left{ display:flex; flex-direction:column }
.sum-title{ font-weight:900 }
.sum-sub{ font-size:.85rem; color:rgba(255,255,255,.8) }
.cta{
  margin-left:auto; min-width:150px; border:none; border-radius:999px; padding:.9rem 1rem; font-weight:900;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000;
  box-shadow:0 8px 24px rgba(99,102,241,.35); transition: transform .12s ease, opacity .2s ease;
}
.cta:disabled{ opacity:.6 }
.cta:active{ transform:scale(.98) }
.spinner{
  display:inline-block; position:relative; padding-left:24px;
}
.spinner::before{
  content:""; position:absolute; left:0; top:50%; width:16px; height:16px; border-radius:999px;
  border:2px solid rgba(255,255,255,.35); border-top-color:#fff; transform:translateY(-50%);
  animation: spin 1s linear infinite;
}
.spinner.small::before{ width:14px; height:14px }

/* ===== Toasts ===== */
.toast{
  margin-top:.6rem; border-radius:1rem; padding:.75rem .9rem; font-size:.9rem; border:1px solid; text-align:center;
}
.toast.ok{ background:rgba(16,185,129,.14); border-color:rgba(16,185,129,.35); color:#b8f3d8 }
.toast.bad{ background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.35); color:#ffc9d2 }
.toast-enter-active,.toast-leave-active{ transition: all .25s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }

/* ===== Animations ===== */
@keyframes spin { to { transform: translateY(-50%) rotate(360deg) } }

/* Small devices */
@media (max-width: 380px){
  .cta{ min-width:130px; padding:.8rem .9rem }
}
</style>
