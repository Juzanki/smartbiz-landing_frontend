<template>
  <div class="w-full">
    <!-- Compact trigger (mobile-first) -->
    <button
      type="button"
      class="h-11 px-4 rounded-xl w-full sm:w-auto inline-flex items-center justify-between gap-3
             bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10
             text-sm font-semibold"
      @click="openSheet"
      :aria-haspopup="'dialog'"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="ids.sheet"
    >
      <span class="inline-flex items-center gap-2">
        <span v-if="showFlags" class="text-lg leading-none">{{ current.flag }}</span>
        <span class="truncate">{{ current.native || current.label }}</span>
      </span>
      <span class="text-xs text-slate-500 dark:text-slate-400">⌄</span>
    </button>

    <!-- Bottom Sheet -->
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
        role="dialog"
        :aria-labelledby="ids.title"
        :id="ids.sheet"
        @click.self="closeSheet"
      >
        <div
          class="absolute left-1/2 -translate-x-1/2 w-[96vw] max-w-md
                 bottom-[calc(env(safe-area-inset-bottom,0px)+12px)]
                 bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden"
        >
          <!-- Header -->
          <div class="px-4 pt-3 pb-2">
            <div class="mx-auto h-1.5 w-12 rounded-full bg-slate-300/70 dark:bg-white/20 mb-2"></div>
            <div class="flex items-center justify-between gap-2">
              <h3 :id="ids.title" class="text-sm font-bold">🌍 Choose Language</h3>
              <button class="icon" @click="closeSheet" aria-label="Close">✖️</button>
            </div>

            <!-- Search -->
            <div class="mt-2 relative">
              <input
                v-model.trim="query"
                type="search"
                inputmode="search"
                :placeholder="'Search…'"
                class="w-full h-10 rounded-xl bg-black/5 dark:bg-white/10 px-9 text-sm outline-none
                       border border-black/10 dark:border-white/10"
                @keydown.esc.prevent="closeSheet"
              />
              <span class="absolute left-3 top-1/2 -translate-y-1/2">🔎</span>
              <button
                v-if="query"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] px-2 py-1 rounded bg-black/10 dark:bg-white/10"
                @click="query=''"
              >Clear</button>
            </div>
          </div>

          <!-- Recently used -->
          <div v-if="recentList.length" class="px-4">
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Recent</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="code in recentList"
                :key="'r-'+code"
                class="chip"
                @click="select(code)"
              >
                <span v-if="showFlags" class="mr-1">{{ languagesMap[code]?.flag }}</span>
                {{ languagesMap[code]?.native || languagesMap[code]?.label || code }}
              </button>
            </div>
          </div>

          <!-- List -->
          <div class="max-h-[52vh] overflow-y-auto mt-2 px-2 pb-2">
            <ul class="space-y-1">
              <li
                v-for="item in filtered"
                :key="item.code"
                class="rounded-xl px-2"
              >
                <button
                  class="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-xl
                         active:bg-black/5 dark:active:bg-white/10"
                  @click="select(item.code)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <span v-if="showFlags" class="text-xl leading-none">{{ item.flag }}</span>
                    <div class="min-w-0">
                      <div class="text-sm font-medium truncate">{{ item.native || item.label }}</div>
                      <div class="text-[11px] text-slate-500 dark:text-slate-400">{{ item.code }}</div>
                    </div>
                  </div>
                  <span v-if="item.code === locale.value" class="text-emerald-500">✓</span>
                </button>
              </li>
            </ul>
            <!-- Use system language -->
            <div v-if="useSystem" class="mt-3 px-2">
              <button class="w-full h-10 rounded-xl border border-black/10 dark:border-white/10
                             bg-black/5 dark:bg-white/10 text-sm"
                      @click="select(systemLanguage)">
                Use system: {{ prettySystem }}
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400">
            Changes are saved for this device. Some content may reload.
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

/** PROPS */
const props = defineProps({
  // Optional: override languages or add more. { code: {label, native?, flag?} }
  languages: {
    type: Object,
    default: () => ({
      en: { label: 'English',    native: 'English',   flag: '🇬🇧' },
      sw: { label: 'Kiswahili',  native: 'Kiswahili', flag: '🇹🇿' },
      fr: { label: 'French',     native: 'Français',  flag: '🇫🇷' },
      es: { label: 'Spanish',    native: 'Español',   flag: '🇪🇸' },
      ar: { label: 'Arabic',     native: 'العربية',   flag: '🇸🇦' },
      zh: { label: 'Chinese',    native: '中文',       flag: '🇨🇳' },
      hi: { label: 'Hindi',      native: 'हिन्दी',    flag: '🇮🇳' },
      pt: { label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
      ru: { label: 'Russian',    native: 'Русский',   flag: '🇷🇺' },
      de: { label: 'German',     native: 'Deutsch',   flag: '🇩🇪' },
      ja: { label: 'Japanese',   native: '日本語',     flag: '🇯🇵' },
      tr: { label: 'Turkish',    native: 'Türkçe',    flag: '🇹🇷' },
    })
  },
  storageKey: { type: String, default: 'language' },
  showFlags:  { type: Boolean, default: true },
  useSystem:  { type: Boolean, default: true },
  // Lazy-load loader: async (code) => messages
  asyncLoader: { type: Function, default: null },
})

/** I18n (global) */
const { locale, setLocaleMessage, getLocaleMessage } = useI18n({ useScope: 'global' })

/** STATE */
const open = ref(false)
const query = ref('')
const recent = ref(loadRecent())
const ids = {
  sheet: 'lang-sheet-' + Math.random().toString(36).slice(2,8),
  title: 'lang-title-' + Math.random().toString(36).slice(2,8),
}

/** MAP & LIST */
const languagesMap = computed(() => props.languages)
const list = computed(() =>
  Object.entries(props.languages).map(([code, meta]) => ({ code, ...meta }))
)

/** System language pretty */
const systemLanguage = (navigator.languages?.[0] || navigator.language || 'en').split('-')[0].toLowerCase()
const prettySystem = new Intl.DisplayNames([systemLanguage], { type: 'language' }).of(systemLanguage)

/** CURRENT */
const current = computed(() => languagesMap.value[locale.value] || { label: locale.value, native: locale.value, flag: '🌐' })

/** FILTERED */
const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return list.value
  return list.value.filter(it =>
    it.code.toLowerCase().includes(q) ||
    (it.label||'').toLowerCase().includes(q) ||
    (it.native||'').toLowerCase().includes(q)
  )
})

/** RECENT display (max 6) */
const recentList = computed(() => recent.value.filter(c => c !== locale.value && languagesMap.value[c]).slice(0, 6))

/** OPEN/CLOSE */
function openSheet(){ open.value = true; vibrate(8) }
function closeSheet(){ open.value = false; query.value=''; vibrate(5) }

/** SELECT */
async function select(code){
  if (!languagesMap.value[code]) return
  await applyLanguage(code)
  trackRecent(code)
  closeSheet()
}

/** APPLY LANGUAGE */
async function applyLanguage(code){
  // Lazy load if needed
  if (props.asyncLoader && isEmpty(getLocaleMessage(code))) {
    try {
      const msgs = await props.asyncLoader(code)
      setLocaleMessage(code, msgs?.default || msgs || {})
    } catch(e) { /* ignore, fallback below */ }
  }
  locale.value = code
  localStorage.setItem(props.storageKey, code)
  // html attributes
  const short = code.split('-')[0]
  document.documentElement.lang = code
  document.documentElement.dir = isRTL(short) ? 'rtl' : 'ltr'
  vibrate(12)
}

/** INIT preference: ?lang=, localStorage, navigator.languages */
onMounted(async () => {
  const urlLang = new URL(window.location.href).searchParams.get('lang')
  const stored  = localStorage.getItem(props.storageKey)
  const firstSupported = (c) => languagesMap.value[c] ? c : null
  const pick =
    firstSupported(urlLang?.toLowerCase()) ||
    firstSupported(stored?.toLowerCase())  ||
    navigator.languages?.map(l => l.split('-')[0].toLowerCase()).map(firstSupported).find(Boolean) ||
    'en'
  await applyLanguage(pick)
})

/** UTILS */
function isEmpty(obj){ return !obj || (Object.keys(obj).length === 0 && obj.constructor === Object) }
function isRTL(code){ return ['ar','he','fa','ur'].includes(code) }
function trackRecent(code){
  const arr = [code, ...recent.value.filter(c => c !== code)]
  recent.value = arr.slice(0, 8)
  localStorage.setItem(props.storageKey + '_recent', JSON.stringify(recent.value))
}
function loadRecent(){
  try { return JSON.parse(localStorage.getItem(props.storageKey + '_recent') || '[]') } catch { return [] }
}
function vibrate(ms=10){ try { navigator.vibrate?.(ms) } catch(_){} }
</script>

<style scoped>
.icon {
  @apply h-9 w-9 grid place-items-center rounded-full bg-black/5 dark:bg-white/10
         border border-black/10 dark:border-white/10 text-[14px];
}
.chip {
  @apply h-8 px-3 rounded-full text-xs font-medium
         bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10
         active:bg-black/10 dark:active:bg-white/20;
}
/* Fade */
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
