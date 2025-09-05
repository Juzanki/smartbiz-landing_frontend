<template>
  <section class="p-4 sm:p-6">
    <!-- Card -->
    <div
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-[#0b0b10] dark:to-[#0b0b10] border border-black/5 dark:border-white/10 shadow-sm"
    >
      <!-- Confetti (first visit today) -->
      <div v-if="confetti" class="pointer-events-none absolute inset-0 z-10">
        <span v-for="n in 14" :key="n" class="confetti" :style="confettiStyle(n)"></span>
      </div>

      <!-- Top row -->
      <div class="flex items-start gap-3 p-4">
        <!-- Avatar -->
        <button
          class="relative shrink-0 w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10 ring-2 ring-white/50 dark:ring-white/10"
          @click="$emit('avatar')"
          :aria-label="t('editProfile')"
        >
          <img
            v-if="avatarLoaded"
            :src="avatarSrc"
            :alt="name ? name + ' avatar' : 'User avatar'"
            class="w-full h-full object-cover"
            @error="avatarError"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-sm font-semibold text-white"
               :style="{ background: avatarBg }">
            {{ initials }}
          </div>

          <!-- Online status -->
          <span
            class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#0b0b10]"
            :class="online ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'"
            aria-hidden="true"
          />
        </button>

        <!-- Greeting -->
        <div class="min-w-0 flex-1">
          <h1 class="text-xl sm:text-2xl font-bold leading-snug">
            <span class="text-blue-900 dark:text-white">{{ greeting }}</span>
            <template v-if="displayName">
              <span class="text-blue-700 dark:text-blue-300">, {{ displayName }}</span>
              <span class="ml-1">{{ greetEmoji }}</span>
            </template>
          </h1>
          <p class="text-xs text-gray-600 dark:text-white/70 mt-1">
            {{ dayTitle }} • {{ timeLabel }} • {{ tzLabel }}
          </p>

          <!-- Badges -->
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <span class="badge">
              🔥 {{ t('streak') }}: <strong>{{ streak }}</strong> {{ t('days') }}
            </span>
            <span class="badge" :class="online ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : ''">
              {{ online ? 'Online' : 'Offline' }}
            </span>
            <button v-if="canInstall" class="badge bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                    @click="install">
              ⤵️ {{ t('installApp') }}
            </button>
          </div>
        </div>

        <!-- Preferences -->
        <button
          class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Open preferences"
          @click="openSheet"
        >⚙️</button>
      </div>

      <!-- Quick actions (mobile rail) -->
      <div class="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3 -mb-1">
        <button class="chip-action" @click="$emit('action','continue')">▶️ {{ t('continue') }}</button>
        <button class="chip-action" @click="$emit('action','tasks')">✅ {{ t('myTasks') }}</button>
        <button class="chip-action" @click="$emit('action','new')">✨ {{ t('createNew') }}</button>
        <button class="chip-action" @click="$emit('action','help')">❓ {{ t('help') }}</button>
      </div>

      <!-- Tip -->
      <div class="px-4 pb-4">
        <div class="rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3 text-sm text-gray-700 dark:text-white/80">
          💡 <strong>{{ t('tip') }}:</strong> {{ currentTip }}
        </div>
      </div>
    </div>

    <!-- Preferences Bottom Sheet -->
    <div v-if="sheet" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeSheet"></div>
      <div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] shadow-2xl">
        <div class="mx-auto w-full max-w-2xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <button @click="closeSheet" class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">✖</button>
            <h4 class="text-sm font-semibold">{{ t('preferences') }}</h4>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <!-- Language -->
            <label class="pref">
              <span class="pref-title">{{ t('language') }}</span>
              <select v-model="lang" class="pref-input">
                <option value="sw">Kiswahili</option>
                <option value="en">English</option>
              </select>
            </label>

            <!-- Theme -->
            <label class="pref">
              <span class="pref-title">{{ t('theme') }}</span>
              <select v-model="theme" class="pref-input" @change="applyTheme">
                <option value="system">{{ t('system') }}</option>
                <option value="light">{{ t('light') }}</option>
                <option value="dark">{{ t('dark') }}</option>
              </select>
            </label>

            <!-- Motion -->
            <label class="pref">
              <span class="pref-title">{{ t('reduceMotion') }}</span>
              <input type="checkbox" v-model="reduceMotion" @change="applyMotion" class="accent-blue-700">
            </label>

            <!-- High contrast -->
            <label class="pref">
              <span class="pref-title">{{ t('highContrast') }}</span>
              <input type="checkbox" v-model="highContrast" @change="applyContrast" class="accent-blue-700">
            </label>
          </div>

          <div class="mt-3 flex items-center justify-end gap-2">
            <button class="btn-secondary" @click="resetPrefs">{{ t('reset') }}</button>
            <button class="btn-primary" @click="closeSheet">{{ t('done') }}</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

/* Props */
const props = defineProps({
  name: String,
  avatar: String,
  tz: { type: String, default: 'Africa/Dar_es_Salaam' }, // EAT by default
  initialLang: { type: String, default: '' }, // 'sw' | 'en' | ''
  enableConfetti: { type: Boolean, default: true }
})

/* Emits */
defineEmits(['action','avatar'])

/* Reactive state */
const lang = ref(pickLang(props.initialLang))
const theme = ref(localStorage.getItem('ug_theme') || 'system')
const reduceMotion = ref(readBool('ug_reduce_motion'))
const highContrast = ref(readBool('ug_high_contrast'))

const name = computed(() => props.name || '')
const displayName = computed(() => name.value?.trim() || t('friend'))
const tzLabel = computed(() => props.tz.replace('_',' '))
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

const now = ref(Date.now())
let tick
const sheet = ref(false)
const streak = ref(0)
const confetti = ref(false)

const canInstall = ref(false)
let deferredPrompt = null

/* Avatar handling */
const avatarSrc = ref(props.avatar || '')
const avatarLoaded = ref(Boolean(props.avatar))
function avatarError(){
  avatarLoaded.value = false
}
watch(() => props.avatar, v => {
  avatarSrc.value = v || ''
  avatarLoaded.value = Boolean(v)
})

/* Time & greeting */
onMounted(() => {
  startClock()
  hydrateStreak()
  maybeConfetti()
  applyTheme()
  applyMotion()
  applyContrast()
  listenConnectivity()
  listenInstallPrompt()
})
onBeforeUnmount(() => {
  if (tick) clearInterval(tick)
  window.removeEventListener?.('online', onOnline)
  window.removeEventListener?.('offline', onOffline)
  window.removeEventListener?.('beforeinstallprompt', onBip)
})

function startClock(){
  tick = setInterval(()=> now.value = Date.now(), 1000)
}
const hourInTZ = computed(() => new Date().toLocaleString('en-US', { timeZone: props.tz, hour: '2-digit', hour12: false }).slice(0,2) * 1)
const greeting = computed(() => lang.value==='sw'
  ? (hourInTZ.value < 12 ? 'Habari asubuhi' : hourInTZ.value < 18 ? 'Habari mchana' : 'Habari jioni')
  : (hourInTZ.value < 12 ? 'Good morning' : hourInTZ.value < 18 ? 'Good afternoon' : 'Good evening')
)
const greetEmoji = computed(() => hourInTZ.value < 12 ? '☀️' : hourInTZ.value < 18 ? '🌤️' : '🌙')
const timeLabel = computed(() => new Intl.DateTimeFormat(undefined, { timeStyle: 'medium', timeZone: props.tz }).format(new Date(now.value)))
const dayTitle  = computed(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: props.tz }).format(new Date(now.value)))

/* Tips (rotates) */
const tips = computed(() => lang.value==='sw'
  ? [
      'Bofya ⚙️ kubinafsisha mandhari na lugha.',
      'Ongeza App kwenye kifaa chako kupitia ⤵️ Install App.',
      'Punguza mitetemo kwa kuwasha “Reduce motion”.',
      'Bonyeza avatar kubadili picha ya wasifu.'
    ]
  : [
      'Tap ⚙️ to personalize theme and language.',
      'Install this app to your phone via ⤵️ Install App.',
      'Enable “Reduce motion” for smoother battery life.',
      'Tap the avatar to change your profile picture.'
    ])
const tipIndex = ref(0)
const currentTip = computed(() => tips.value[tipIndex.value % tips.value.length])
setInterval(() => tipIndex.value++, 8000)

/* Streak */
function hydrateStreak() {
  const k = 'ug_last_seen'
  const today = new Date().toLocaleDateString('en-CA', { timeZone: props.tz })
  const last = localStorage.getItem(k)
  const sKey = 'ug_streak'
  if (!last) {
    localStorage.setItem(k, today)
    localStorage.setItem(sKey, '1')
    streak.value = 1
    return
  }
  if (last === today) {
    streak.value = parseInt(localStorage.getItem(sKey) || '1')
    return
  }
  const d1 = new Date(last), d2 = new Date(today)
  const diff = (d2 - d1) / 86_400_000
  if (diff === 1) {
    const next = (parseInt(localStorage.getItem(sKey) || '0') + 1)
    localStorage.setItem(sKey, String(next))
    streak.value = next
  } else {
    localStorage.setItem(sKey, '1')
    streak.value = 1
  }
  localStorage.setItem(k, today)
}
function maybeConfetti(){
  if (!props.enableConfetti) return
  const key = 'ug_confetti_day'
  const today = new Date().toLocaleDateString('en-CA', { timeZone: props.tz })
  const last = localStorage.getItem(key)
  if (last !== today) { confetti.value = true; setTimeout(()=> confetti.value = false, reduceMotion.value ? 800 : 1600); localStorage.setItem(key, today) }
}

/* Connectivity */
function listenConnectivity(){
  window.addEventListener?.('online', onOnline)
  window.addEventListener?.('offline', onOffline)
}
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

/* Install (PWA) */
function listenInstallPrompt(){
  window.addEventListener?.('beforeinstallprompt', onBip)
}
function onBip(e){
  e.preventDefault()
  deferredPrompt = e
  canInstall.value = true
}
async function install(){
  try {
    await deferredPrompt?.prompt?.()
  } catch {}
  canInstall.value = false
}

/* Preferences */
function openSheet(){ sheet.value = true }
function closeSheet(){ sheet.value = false }
watch(lang, v => { localStorage.setItem('ug_lang', v) })
function applyTheme(){
  localStorage.setItem('ug_theme', theme.value)
  const b = document.documentElement
  b.classList.remove('theme-light','theme-dark')
  if (theme.value === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    b.classList.add(prefersDark ? 'theme-dark' : 'theme-light')
  } else {
    b.classList.add(theme.value === 'dark' ? 'theme-dark' : 'theme-light')
  }
}
function applyMotion(){
  localStorage.setItem('ug_reduce_motion', String(reduceMotion.value))
  document.documentElement.classList.toggle('reduced-motion', reduceMotion.value)
}
function applyContrast(){
  localStorage.setItem('ug_high_contrast', String(highContrast.value))
  document.documentElement.classList.toggle('high-contrast', highContrast.value)
}
function resetPrefs(){
  theme.value = 'system'; applyTheme()
  reduceMotion.value = false; applyMotion()
  highContrast.value = false; applyContrast()
}

/* Utils */
function readBool(k){ return localStorage.getItem(k) === 'true' }
function pickLang(initial){
  if (initial) return initial
  const saved = localStorage.getItem('ug_lang')
  if (saved) return saved
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase()
  return nav.startsWith('sw') ? 'sw' : 'en'
}
const initials = computed(() => (displayName.value || 'U').split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join(''))
const avatarBg = `linear-gradient(135deg,#1e40af,#3b82f6)`

/* i18n mini */
function t(key){
  const dict = {
    sw: {
      friend:'rafiki', editProfile:'Badili wasifu', streak:'mfululizo', days:'siku', installApp:'Weka App',
      continue:'Endelea', myTasks:'Majukumu', createNew:'Unda Mpya', help:'Msaada',
      preferences:'Mipangilio', language:'Lugha', theme:'Mandhari', system:'Mfumo', light:'Nyeupe', dark:'Giza',
      reduceMotion:'Punguza mwendo', highContrast:'Ukontrasti juu', reset:'Rudisha', done:'Hifadhi', tip:'Ushauri'
    },
    en: {
      friend:'friend', editProfile:'Edit profile', streak:'streak', days:'days', installApp:'Install App',
      continue:'Continue', myTasks:'My Tasks', createNew:'Create New', help:'Help',
      preferences:'Preferences', language:'Language', theme:'Theme', system:'System', light:'Light', dark:'Dark',
      reduceMotion:'Reduce motion', highContrast:'High contrast', reset:'Reset', done:'Save', tip:'Tip'
    }
  }
  return (dict[lang.value] || dict.en)[key] || key
}

/* Confetti styling per piece */
function confettiStyle(n){
  const left = Math.random()*100
  const delay = (Math.random()*0.4).toFixed(2)
  const dur = reduceMotion.value ? 0.6 : (1.4 + Math.random()*0.6)
  const colors = ['#1e3a8a','#2563eb','#7c3aed','#0ea5e9','#f59e0b','#10b981']
  const color = colors[n % colors.length]
  return `
    --x:${left}%;
    --delay:${delay}s;
    --dur:${dur}s;
    --color:${color};
  `
}
</script>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* Badges & buttons */
.badge {
  @apply text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70 font-semibold;
}
.chip-action {
  @apply px-3 h-9 rounded-full text-sm bg-white/80 text-blue-900
         dark:bg-white/10 dark:text-white
         border border-black/5 dark:border-white/10
         active:scale-95;
}
.btn-primary {
  @apply h-10 px-4 rounded-xl bg-blue-700 text-white text-sm font-medium active:scale-95;
}
.btn-secondary {
  @apply h-10 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-sm text-gray-800 dark:text-white active:scale-95;
}

/* Pref rows */
.pref { @apply flex items-center justify-between gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2; }
.pref-title { @apply text-gray-700 dark:text-white/80; }
.pref-input { @apply rounded-lg bg-white dark:bg-[#0b0b10] text-gray-900 dark:text-white px-2 py-1 border border-black/5 dark:border-white/10; }

/* Theme helpers applied on <html> (documentElement) */
.reduced-motion * { transition: none !important; animation: none !important; }
.high-contrast { filter: contrast(1.15); }

/* Confetti */
.confetti{
  position:absolute; top:-8px; left:var(--x);
  width:6px; height:10px; background:var(--color);
  border-radius:2px; opacity:.9;
  transform:translateY(-20px) rotate(0deg);
  animation: fall var(--dur) ease-out var(--delay) forwards;
}
@keyframes fall{
  0%{ transform: translateY(-20px) rotate(0) }
  100%{ transform: translateY(120%) rotate(270deg); opacity: 0 }
}

/* Safe-area for phones with notches */
@supports(padding:max(0px)) {
  section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}
</style>
