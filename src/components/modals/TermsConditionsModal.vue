<!-- LiveTermsConsentSheet.vue (EN) -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="ltc-title"
    @click.self="close('backdrop')" @keydown.esc.prevent="close('esc')"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-lg max-h-[92vh]
             rounded-t-3xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in flex flex-col"
      :style="dragStyle"
      @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
    >
      <!-- Handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <div>
          <h2 id="ltc-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            📜 Live Stream Terms & Consent
          </h2>
          <p class="text-[12px] text-zinc-500 dark:text-zinc-400">
            Please read and confirm the agreement before going live.
          </p>
        </div>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close" @click="close('x')">✕</button>
      </header>

      <!-- Body -->
      <div class="px-5 pb-3 sm:pb-4 space-y-3 overflow-hidden">
        <!-- Reading progress + countdown -->
        <div class="flex items-center justify-between text-[12px] text-zinc-500 dark:text-zinc-400">
          <div class="flex items-center gap-2">
            <span>Progress: {{ progress }}%</span>
            <div class="h-1.5 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden" aria-hidden="true">
              <div class="h-full bg-indigo-600 dark:bg-indigo-500 transition-all" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
          <div aria-live="polite">
            ⏱️ {{ countdown > 0 ? `Please review for ${countdown}s` : 'Ready to continue' }}
          </div>
        </div>

        <!-- Terms content -->
        <div
          ref="scrollArea"
          class="overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 max-h-[46vh] text-[13.5px] leading-relaxed space-y-3"
          @scroll.passive="onScroll"
        >
          <p>By proceeding to stream live, you agree to the following:</p>
          <ul class="list-disc pl-5 space-y-2">
            <li><b>Respect & Safety:</b> No harassment, hate speech, bullying, or abusive language.</li>
            <li><b>No Nudity or Sexual Content:</b> Strictly prohibited; violations may result in immediate suspension.</li>
            <li><b>No Illegal Activities:</b> Do not show, promote, or facilitate illegal or harmful actions.</li>
            <li><b>Privacy & Consent:</b> Obtain consent before featuring anyone in your stream.</li>
            <li><b>Honest Commercial Conduct:</b> Advertising and sales must be truthful and transparent.</li>
            <li><b>Moderation Policy:</b> Your stream may be monitored, paused, or terminated if rules are violated.</li>
          </ul>
          <p class="pt-1">
            Read our <a href="#" class="text-indigo-600 underline">Community Guidelines</a> and
            <a href="#" class="text-indigo-600 underline">Privacy Policy</a>.
          </p>

          <hr class="my-2 border-zinc-200 dark:border-zinc-800"/>

          <h3 class="font-semibold text-[14px]">🛡️ Operational Authority</h3>
          <ul class="list-disc pl-5 space-y-2">
            <li>You authorize <b>Moderators</b> and the <b>Platform</b> to mute/kick/ban and to pause or stop the stream upon policy breach.</li>
            <li>You consent to <b>AI-based auto-moderation</b> for risk filtering and to the storage of audit logs.</li>
            <li>You acknowledge a possible <b>Emergency Stop</b> if safety threats or severe violations occur.</li>
            <li>You consent to <b>security telemetry</b> being retained for safety improvements.</li>
          </ul>
        </div>

        <!-- Required toggles -->
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="ageOk" /> I am 18+ years old.
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="agreeGuides" /> I have read and agree to the Terms & Community Guidelines.
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="grantOps" /> I grant operational authority to moderators/platform as outlined above.
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="allowAI" /> I accept AI auto-moderation and audit-log storage.
          </label>
        </div>

        <!-- Signature -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="text-sm font-semibold block mb-1">✍️ Full Name (signature)</label>
            <input
              v-model.trim="fullName"
              type="text" inputmode="text" autocomplete="name"
              placeholder="e.g., Asha Mkumbo"
              class="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
            />
            <p class="text-[11px] text-zinc-500 mt-1">Typed signature; will be saved with a timestamp.</p>
          </div>
          <div>
            <label class="text-sm font-semibold block mb-1">🌍 Country/Region</label>
            <select v-model="region" class="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm">
              <option value="">Select…</option>
              <option value="TZ">Tanzania</option>
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="RW">Rwanda</option>
              <option value="BI">Burundi</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <!-- Inline errors -->
        <div v-if="errorMsg" class="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[12px] px-3 py-2">
          {{ errorMsg }}
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" @click="decline">Decline</button>
        <button
          class="rounded-full px-4 py-2 text-xs font-semibold text-white
                 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canAccept"
          @click="accept"
        >
          Accept & Go Live
        </button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/* Props & Emits */
const props = defineProps({ open: { type: Boolean, default: true } })
const emit  = defineEmits(['accept','decline','close'])

/* State */
const ageOk = ref(false)
const agreeGuides = ref(false)
const grantOps = ref(false)
const allowAI = ref(false)
const fullName = ref('')
const region = ref('')
const countdown = ref(5)
const progress = ref(0)
const errorMsg = ref('')

/* Scroll ref */
const scrollArea = ref(null)

/* Derived */
const scrolledToEnd = ref(false)
const nameValid = computed(()=> fullName.value.trim().split(/\s+/).length >= 2)
const canAccept = computed(()=> ageOk.value && agreeGuides.value && grantOps.value && allowAI.value && nameValid.value && scrolledToEnd.value && countdown.value <= 0)

/* Actions */
function onScroll(){
  if(!scrollArea.value) return
  const el = scrollArea.value
  const pct = Math.round(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100)
  progress.value = Math.min(100, pct)
  scrolledToEnd.value = pct >= 99
}
function validate(){
  errorMsg.value = ''
  if (!ageOk.value || !agreeGuides.value || !grantOps.value || !allowAI.value){
    errorMsg.value = 'Please check all required consent boxes.'
  } else if (!nameValid.value){
    errorMsg.value = 'Enter your full name (at least two words).'
  } else if (!region.value){
    errorMsg.value = 'Select your country/region.'
  } else if (!scrolledToEnd.value){
    errorMsg.value = 'Scroll to the end of the terms before continuing.'
  } else if (countdown.value > 0){
    errorMsg.value = `Please wait ${countdown.value}s before continuing.`
  }
}
function accept(){
  validate()
  if (errorMsg.value) { buzz(12); return }
  const record = {
    accepted: true,
    at: Date.now(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    region: region.value,
    fullName: fullName.value.trim(),
    consents: { ageOk: ageOk.value, agreeGuides: agreeGuides.value, grantOps: grantOps.value, allowAI: allowAI.value },
    version: 1
  }
  try{ localStorage.setItem('live_terms_consent', JSON.stringify(record)) }catch{}
  buzz(16)
  emit('accept', record)
}
function decline(){ buzz(8); emit('decline') }
function close(reason){ emit('close', { reason }) }

/* Countdown */
let timer = null
onMounted(()=>{
  // restore
  try{
    const last = JSON.parse(localStorage.getItem('live_terms_consent')||'null')
    if(last?.fullName){ fullName.value = last.fullName }
    if(last?.region){ region.value = last.region }
  }catch{}
  timer = setInterval(()=>{ countdown.value = Math.max(0, countdown.value - 1) }, 1000)
})
onBeforeUnmount(()=>{ if (timer) clearInterval(timer) })

/* Haptics */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }
</script>

<style scoped>
/* Entrance */
@keyframes in{ from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .30s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Thin scrollbars */
::-webkit-scrollbar{ width: 6px; height: 6px }
::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.15); border-radius: 6px }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
