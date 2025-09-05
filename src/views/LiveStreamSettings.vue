<!-- src/views/LiveSettingsMobile.vue -->
<template>
  <div class="app">
    <!-- Top App Bar -->
    <header class="appbar">
      <button class="iconbtn" @click="goBack" aria-label="Back">
        <svg viewBox="0 0 24 24" class="ic"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="ttl">
        <h1>📺 Live Stream Settings</h1>
        <p>Sanidi faragha, ratiba, na uthibitishe</p>
      </div>
    </header>

    <!-- Progress -->
    <section class="progress">
      <div class="track">
        <div class="bar" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div class="steps">
        <span :class="['dot', step>=1?'active':'']">1</span>
        <span :class="['dot', step>=2?'active':'']">2</span>
        <span :class="['dot', step>=3?'active':'']">3</span>
      </div>
    </section>

    <!-- Main Card -->
    <main class="content">
      <div class="card">

        <!-- STEP 1 -->
        <template v-if="step === 1">
          <h3 class="card-title">Step 1: Choose Stream Type</h3>
          <div class="switch">
            <input id="privateSwitch" type="checkbox" v-model="isPrivate" />
            <label for="privateSwitch"></label>
            <span class="switch-label">
              {{ isPrivate ? 'Private (Only invited users)' : 'Public (Anyone with the link)' }}
            </span>
          </div>

          <div class="tip">
            <strong>Note:</strong> You can invite users later from your Live Hub.
          </div>
        </template>

        <!-- STEP 2 -->
        <template v-else-if="step === 2">
          <h3 class="card-title">Step 2: Schedule Date & Time</h3>

          <div class="field">
            <label class="lbl">Start Time</label>
            <input class="inp" type="datetime-local" v-model="startTime" :min="minDateTime" />
          </div>

          <div class="field">
            <label class="lbl">End Time</label>
            <input class="inp" type="datetime-local" v-model="endTime" :min="startTime || minDateTime" />
          </div>

          <div class="meta">
            <span>🕒 Timezone: <b>{{ tzName }}</b></span>
            <span v-if="timeError" class="err">{{ timeError }}</span>
          </div>
        </template>

        <!-- STEP 3 -->
        <template v-else-if="step === 3">
          <h3 class="card-title">Step 3: Confirm & Save</h3>
          <ul class="summary">
            <li><b>Type:</b> {{ isPrivate ? 'Private' : 'Public' }}</li>
            <li><b>Start:</b> {{ formatDate(startTime) }}</li>
            <li><b>End:</b> {{ formatDate(endTime) }}</li>
          </ul>

          <div class="tip">
            Make sure your subscription is active to go live immediately after saving.
          </div>
        </template>

        <!-- STEP 4 (Success) -->
        <template v-else>
          <div class="success">
            ✅ Live stream settings saved successfully!
          </div>
          <router-link class="btn link" to="/live-stream">Go to Live Stream Hub</router-link>
        </template>
      </div>
    </main>

    <!-- Sticky Action Bar -->
    <footer class="actionbar" v-if="step <= 3">
      <div class="btns">
        <button v-if="step>1" class="btn ghost" @click="prevStep">Back</button>
        <button
          v-if="step<3"
          class="btn primary"
          @click="nextStep"
          :disabled="step === 2 && !!timeError"
        >
          Next
        </button>
        <button
          v-else
          class="btn success"
          @click="saveSettings"
          :disabled="saving"
        >
          <span v-if="!saving">Save & Continue</span>
          <span v-else class="loader">Saving…</span>
        </button>
      </div>

      <!-- toasts -->
      <transition name="toast">
        <div v-if="msg" class="toast ok">{{ msg }}</div>
      </transition>
      <transition name="toast">
        <div v-if="err" class="toast bad">{{ err }}</div>
      </transition>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// state
const step = ref(1)
const isPrivate = ref(false)
const startTime = ref('')
const endTime = ref('')
const saving = ref(false)
const msg = ref('')
const err = ref('')

// timezone
const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

// minimum datetime: now (rounded to nearest 5 min)
const minDateTime = computed(() => {
  const d = new Date()
  const minStep = 5
  d.setMinutes(d.getMinutes() + (minStep - (d.getMinutes() % minStep)) % minStep)
  d.setSeconds(0, 0)
  return d.toISOString().slice(0,16)
})

// validation
const timeError = computed(() => {
  if (!startTime.value || !endTime.value) return ''
  const s = new Date(startTime.value).getTime()
  const e = new Date(endTime.value).getTime()
  if (e <= s) return 'End Time must be after Start Time.'
  const maxLenHrs = 12
  if ((e - s) / 36e5 > maxLenHrs) return `Live duration cannot exceed ${maxLenHrs} hours.`
  return ''
})

// progress %
const progressPct = computed(() => step.value>=4 ? 100 : step.value * 33.34)

// actions
function nextStep() {
  if (step.value === 2 && timeError.value) {
    err.value = timeError.value
    setTimeout(() => err.value = '', 2500)
    return
  }
  step.value++
}
function prevStep() { step.value-- }
function formatDate(v) {
  if (!v) return 'Not set'
  try { return new Date(v).toLocaleString() } catch { return v }
}
function goBack() {
  if (history.length > 1) history.back()
}

async function saveSettings() {
  saving.value = true
  err.value = ''; msg.value = ''
  try {
    // TODO: post to /api/livestream/settings if needed
    // await axios.post('/api/livestream/settings', { privacy: isPrivate.value?'private':'public', start: startTime.value, end: endTime.value })
    await new Promise(r => setTimeout(r, 900)) // demo delay
    msg.value = 'Settings saved.'
    step.value = 4
  } catch (e) {
    err.value = 'Failed to save settings.'
  } finally {
    saving.value = false
    setTimeout(()=>{ msg.value='' }, 1800)
  }
}

// guards
watch(step, (val)=> {
  if (val === 2 && !startTime.value) startTime.value = minDateTime.value
})
</script>

<style scoped>
/* ========== App Shell ========== */
.app{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  background: radial-gradient(1200px 600px at 80% -10%, #1f2a62 0%, rgba(31,42,98,0) 60%),
              radial-gradient(1000px 500px at -10% 10%, #6328b6 0%, rgba(99,40,182,0) 55%),
              linear-gradient(180deg, #0a1022 0%, #0b1633 100%);
  color:#fff;
}

/* ========== Top App Bar ========== */
.appbar{
  position:sticky; top:0; z-index:20;
  display:flex; align-items:center; gap:.75rem;
  padding:.9rem 1rem .7rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.iconbtn{
  height:40px; width:40px; border-radius:999px;
  display:grid; place-items:center;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
}
.iconbtn:active{ transform:scale(.96); }
.ic{ width:20px; height:20px; opacity:.9 }
.ttl h1{ font-size:1.05rem; font-weight:700; margin:0 }
.ttl p{ margin:2px 0 0; font-size:.72rem; color:rgba(255,255,255,.65) }

/* ========== Progress ========== */
.progress{ padding:.5rem 1rem 0 }
.track{
  height:6px; border-radius:999px; overflow:hidden;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12);
}
.bar{
  height:100%;
  background: linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  box-shadow: 0 0 18px rgba(124,58,237,.35) inset;
  transition:width .35s ease;
}
.steps{ display:flex; gap:.5rem; justify-content:flex-end; margin-top:.35rem }
.dot{
  width:22px; height:22px; border-radius:999px; display:grid; place-items:center;
  font-size:.7rem; color:rgba(255,255,255,.55);
  border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.05)
}
.dot.active{
  background:linear-gradient(135deg,#22d3ee,#6366f1);
  color:#000; border-color:transparent; box-shadow:0 4px 12px rgba(99,102,241,.45)
}

/* ========== Content Card ========== */
.content{ padding:1rem; padding-bottom:8.5rem }
.card{
  border-radius:1.25rem;
  background:linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  backdrop-filter: blur(18px);
  border:1px solid rgba(255,255,255,.12);
  box-shadow: 0 10px 40px rgba(0,0,0,.45);
  padding:1rem;
}
.card-title{ margin:.25rem 0 1rem; font-size:1rem; font-weight:800; letter-spacing:.2px }

/* ========== Switch ========== */
.switch{
  display:flex; align-items:center; gap:.75rem;
  padding:.75rem; border-radius:1rem;
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1);
}
.switch input{ display:none }
.switch label{
  width:48px; height:28px; display:block; position:relative; cursor:pointer;
  background:rgba(255,255,255,.18); border-radius:999px; transition:all .25s ease;
  border:1px solid rgba(255,255,255,.18);
}
.switch label::after{
  content:""; position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:999px;
  background:#fff; transition:all .25s ease; box-shadow:0 2px 10px rgba(0,0,0,.35);
}
.switch input:checked + label{
  background:linear-gradient(90deg,#22d3ee,#6366f1);
  border-color:transparent;
}
.switch input:checked + label::after{ transform:translateX(20px) }
.switch-label{ font-size:.9rem }

/* ========== Fields ========== */
.field{ margin-bottom:.9rem }
.lbl{ display:block; font-size:.78rem; color:rgba(255,255,255,.7); margin-bottom:.35rem }
.inp{
  width:100%; border-radius:1rem; padding:.8rem .95rem; font-size:.95rem; color:#fff;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
  transition:border-color .2s, box-shadow .2s;
}
.inp:focus{
  outline:none; border-color:rgba(99,102,241,.7);
  box-shadow:0 0 0 3px rgba(99,102,241,.25)
}
.meta{
  margin-top:.25rem; display:flex; justify-content:space-between; gap:.5rem; flex-wrap:wrap;
  font-size:.78rem; color:rgba(255,255,255,.75)
}
.err{ color:#fecaca }

/* ========== Summary & Tips ========== */
.summary{
  list-style:none; padding:0; margin:0 0 1rem 0; display:grid; gap:.5rem;
}
.summary li{
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
  border-radius:.9rem; padding:.75rem .85rem; font-size:.92rem;
}
.tip{
  padding:.9rem; border-radius:1rem;
  background:rgba(34,211,238,.12); border:1px solid rgba(34,211,238,.25);
  color:#e0fbff; font-size:.88rem;
}

/* ========== Success ========== */
.success{
  padding:1rem; border-radius:1rem; text-align:center;
  background:rgba(16,185,129,.14); border:1px solid rgba(16,185,129,.35);
  color:#b8f3d8; font-weight:600; margin-bottom:.8rem;
}

/* ========== Sticky Action Bar ========== */
.actionbar{
  position:fixed; inset-inline:0; bottom:0; z-index:30;
  padding:.75rem 1rem 1rem;
  background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.55) 40%, rgba(0,0,0,.75) 100%);
  backdrop-filter: blur(12px);
}
.btns{ display:flex; gap:.75rem; align-items:center; }
.btn{
  flex:1; text-align:center; border-radius:999px; padding:.9rem 1rem; font-weight:800;
  border:1px solid transparent; transition:transform .12s ease, box-shadow .2s ease, opacity .2s ease;
}
.btn:disabled{ opacity:.6; pointer-events:none }
.btn:active{ transform:scale(.98) }
.ghost{
  background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.15); color:#fff;
}
.primary{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  color:#000; box-shadow:0 6px 20px rgba(99,102,241,.35);
}
.success{
  /* (reuse class name above for box); button variant below overrides color */
}
.btn.success{
  background:linear-gradient(90deg,#10b981,#34d399);
  color:#032016; box-shadow:0 6px 20px rgba(16,185,129,.35);
}
.link{
  display:inline-block; width:100%; text-align:center; margin-top:.25rem;
  background:rgba(255,255,255,.08); color:#fff; border:1px solid rgba(255,255,255,.2);
  padding:.85rem 1rem; border-radius:1rem; text-decoration:none; font-weight:700;
}

/* ========== Toasts ========== */
.toast{
  margin-top:.65rem; border-radius:1rem; padding:.75rem .9rem; font-size:.9rem; border:1px solid;
}
.toast.ok{ background:rgba(16,185,129,.14); border-color:rgba(16,185,129,.35); color:#b8f3d8 }
.toast.bad{ background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.35); color:#ffc9d2 }

/* transitions */
.toast-enter-active,.toast-leave-active{ transition: all .25s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }

/* responsive (tablet+) */
@media (min-width: 768px){
  .content{ max-width:720px; margin:0 auto }
}
</style>
