<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  msg: { type: String, required: true },
  name: { type: String, default: '' },
  tz: { type: String, default: 'Africa/Dar_es_Salaam' },
  ctaLabel: { type: String, default: 'Start building' },
})

const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const canInstall = ref(false)
let deferredPrompt = null
const now = ref(Date.now())
const toast = ref('')

const hour = computed(() => {
  try {
    return parseInt(
      new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: props.tz })
        .format(new Date(now.value)), 10
    )
  } catch { return new Date().getHours() }
})
const greeting = computed(() =>
  hour.value < 12 ? 'Good morning' : hour.value < 18 ? 'Good afternoon' : 'Good evening'
)
const timeLabel = computed(() =>
  new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: props.tz })
    .format(new Date(now.value))
)

function showToast(m){ toast.value = m; setTimeout(()=> toast.value='', 1300) }
function copyDev(){ navigator.clipboard?.writeText('npm run dev').then(()=> showToast('Copied: npm run dev')) }
async function installApp(){ try{ await deferredPrompt?.prompt?.() }catch{} canInstall.value=false }

onMounted(() => {
  const clock = setInterval(()=> (now.value = Date.now()), 30_000)
  window._greetClock = clock // prevent GC in some HMR cases

  window.addEventListener?.('online', ()=> online.value = true)
  window.addEventListener?.('offline', ()=> online.value = false)
  window.addEventListener?.('beforeinstallprompt', (e)=>{
    e.preventDefault(); deferredPrompt = e; canInstall.value = true
  })
})
onBeforeUnmount(() => {
  clearInterval(window._greetClock)
})
</script>

<template>
  <section
    class="mx-4 mt-safe rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg ring-1 ring-white/10 overflow-hidden"
    role="region"
    aria-label="Project greeting"
  >
    <!-- Top block -->
    <div class="p-5 sm:p-6 flex items-start gap-3">
      <div class="shrink-0 w-12 h-12 rounded-xl bg-white/20 grid place-items-center text-2xl">🚀</div>

      <div class="min-w-0 flex-1">
        <h1 class="text-xl sm:text-2xl font-extrabold leading-tight">
          {{ greeting }}<span v-if="name">, {{ name }}</span>!
        </h1>
        <p class="text-sm text-white/90 mt-0.5">
          {{ msg }}
        </p>

        <p class="text-sm mt-2">
          You’ve successfully created a project with
          <a class="underline font-semibold" href="https://vite.dev/" target="_blank" rel="noopener">Vite</a>
          +
          <a class="underline font-semibold" href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a>.
        </p>

        <!-- Chips -->
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="chip" :class="online ? 'bg-emerald-500/15 text-emerald-100' : 'bg-yellow-500/20 text-yellow-100'">
            {{ online ? 'Online' : 'Offline mode' }}
          </span>
          <span class="chip bg-white/20">EAT • {{ timeLabel }}</span>
          <button
            v-if="canInstall"
            class="chip hover:bg-white/25 active:scale-95"
            @click="installApp"
          >⤵️ Install App</button>
        </div>
      </div>

      <!-- Close/space for future actions -->
      <div class="hidden sm:block w-6 h-6"></div>
    </div>

    <!-- Actions -->
    <div class="px-5 pb-safe flex gap-2">
      <button class="btn-primary flex-1" @click="$emit('start')">{{ ctaLabel }}</button>
      <button class="btn-secondary flex-1" @click="copyDev">Copy <code>npm run dev</code></button>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
      <div class="rounded-xl bg-emerald-600 text-white text-sm px-3 py-2 shadow">{{ toast }}</div>
    </div>
  </section>
</template>

<style scoped>
/* Mobile-first utility wrappers using Tailwind via @apply */
.chip { @apply px-2.5 h-7 rounded-full text-[12px] font-medium bg-white/20 text-white; }
.btn-primary { @apply h-11 px-4 mb-4 rounded-xl bg-white text-blue-700 font-semibold text-sm active:scale-95; }
.btn-secondary { @apply h-11 px-4 mb-4 rounded-xl bg-white/15 text-white font-medium text-sm active:scale-95; }

/* Safe-area helpers for phones with notches */
@supports(padding:max(0px)) {
  .mt-safe { margin-top: max(1rem, env(safe-area-inset-top)); }
  .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}

/* Subtle entrance (reduced-motion aware) */
@keyframes fadeSlide { 0% { opacity:.0; transform: translateY(12px); } 100% { opacity:1; transform: translateY(0); } }
:host, section { animation: fadeSlide .35s ease both; }
@media (prefers-reduced-motion: reduce){ section { animation: none; } }
</style>
