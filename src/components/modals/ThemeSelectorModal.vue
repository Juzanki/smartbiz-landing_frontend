<!-- ThemePickerSheet.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="theme-title"
    @click.self="close('backdrop')" @keydown.esc.prevent="close('esc')"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-md max-h-[92vh]
             rounded-t-3xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in flex flex-col"
      :style="dragStyle"
      @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
    >
      <!-- Handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <h2 id="theme-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          🎨 Choose Theme
        </h2>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close" @click="close('x')">✕</button>
      </header>

      <!-- Body -->
      <div class="px-5 pb-4 sm:pb-5 space-y-4 overflow-y-auto">

        <!-- Live Preview -->
        <div
          class="rounded-2xl p-4 shadow-lg border relative overflow-hidden"
          :class="isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'"
        >
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold opacity-80">Preview</div>
            <span class="text-xs px-2 py-0.5 rounded-full"
                  :class="isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'">{{ labelFor(selected) }}</span>
          </div>

          <div class="mt-3 grid grid-cols-3 gap-2">
            <div class="rounded-xl p-3 border"
                 :class="isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'">
              <div class="h-3 w-16 rounded mb-2" :class="accentBg"></div>
              <div class="h-2 w-24 rounded mb-1" :class="mutedBg"></div>
              <div class="h-2 w-20 rounded" :class="mutedBg"></div>
            </div>
            <div class="rounded-xl p-3 border"
                 :class="isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'">
              <div class="h-16 rounded-lg" :class="heroBg"></div>
            </div>
            <button
              class="rounded-xl p-3 text-xs font-semibold border"
              :class="isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'"
            >
              Action
            </button>
          </div>

          <!-- Colorful sheen for 'colorful' -->
          <div v-if="selected==='colorful'"
               class="pointer-events-none absolute inset-0 opacity-20"
               style="background: radial-gradient(600px circle at 0 0, #fff, transparent 40%); mix-blend-mode: overlay;">
          </div>
        </div>

        <!-- Theme Options (segmented) -->
        <div class="grid grid-cols-3 gap-2 text-[13px]">
          <button v-for="opt in row1" :key="opt"
                  class="px-3 py-2 rounded-xl border font-semibold"
                  :class="segClass(opt)"
                  @click="select(opt)">
            {{ labelFor(opt) }}
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[13px]">
          <button v-for="opt in row2" :key="opt"
                  class="px-3 py-2 rounded-xl border font-semibold"
                  :class="segClass(opt)"
                  @click="select(opt)">
            {{ labelFor(opt) }}
          </button>
        </div>

        <!-- Accessibility -->
        <div class="grid grid-cols-2 gap-2">
          <label class="flex items-center gap-2 rounded-xl px-3 py-2 border bg-zinc-50 dark:bg-zinc-800/60 dark:border-zinc-700">
            <input type="checkbox" v-model="highContrast" /> High contrast
          </label>
          <label class="flex items-center gap-2 rounded-xl px-3 py-2 border bg-zinc-50 dark:bg-zinc-800/60 dark:border-zinc-700">
            <input type="checkbox" v-model="reduceMotion" /> Reduce motion
          </label>
        </div>

        <!-- Info -->
        <p class="text-[12px] text-zinc-500">
          “Auto (System)” follows your device appearance. AMOLED uses pure black for better battery on OLED screens.
        </p>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" @click="close('cancel')">Cancel</button>
        <button
          class="rounded-full px-4 py-2 text-xs font-semibold text-white
                 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          :disabled="applying"
          @click="apply"
        >
          Apply
        </button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/** Props & Emits */
const props = defineProps({
  open: { type: Boolean, default: true },
  initialTheme: { type: String, default: 'system' }, // system | light | dark | amoled | colorful
})
const emit = defineEmits(['close','apply'])

/** State */
const selected = ref(props.initialTheme)
const highContrast = ref(false)
const reduceMotion = ref(false)
const applying = ref(false)

/** Media query for system theme */
const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
const systemDark = ref(mq ? mq.matches : false)
function onMQ(e){ systemDark.value = !!e.matches }

/** Computed */
const isDark = computed(()=>{
  if (selected.value === 'system') return systemDark.value
  return selected.value === 'dark' || selected.value === 'amoled'
})
const accentBg = computed(()=> selected.value==='colorful'
  ? 'bg-gradient-to-r from-pink-500 to-indigo-500'
  : (isDark.value ? 'bg-indigo-400' : 'bg-indigo-600'))
const mutedBg  = computed(()=> isDark.value ? 'bg-zinc-700' : 'bg-zinc-200')
const heroBg   = computed(()=> {
  if (selected.value==='colorful') return 'bg-gradient-to-br from-fuchsia-500 via-sky-500 to-emerald-400'
  if (selected.value==='amoled')   return 'bg-black'
  return isDark.value ? 'bg-zinc-700' : 'bg-zinc-200'
})

const row1 = ['system','light','dark']
const row2 = ['amoled','colorful']

/** UI helpers */
function labelFor(k){
  return ({
    system: 'Auto (System)',
    light: 'Light',
    dark: 'Dark',
    amoled: 'AMOLED',
    colorful: 'Colorful'
  })[k] || k
}
function segClass(opt){
  const active = selected.value === opt
  const base = 'transition'
  if (active) return `${base} border-indigo-600 text-white bg-indigo-600`
  return `${base} border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60`
}
function select(opt){ selected.value = opt; buzz(8) }

/** Apply theme to <html> */
function applyThemeToDOM(theme){
  const html = document.documentElement
  // reset
  html.classList.remove('dark','amoled')
  html.dataset.theme = theme
  html.dataset.highContrast = highContrast.value ? '1' : '0'
  html.dataset.reduceMotion = reduceMotion.value ? '1' : '0'

  if (theme === 'system'){
    const d = systemDark.value
    if (d) html.classList.add('dark')
  } else if (theme === 'dark'){
    html.classList.add('dark')
  } else if (theme === 'amoled'){
    html.classList.add('dark','amoled') // you can target .amoled in global CSS if needed
  }
  // set theme-color for mobile chrome
  const m = document.querySelector('meta[name="theme-color"]') || (() => {
    const el = document.createElement('meta')
    el.setAttribute('name','theme-color')
    document.head.appendChild(el)
    return el
  })()
  const color = theme==='dark' || theme==='amoled' || (theme==='system' && systemDark.value)
    ? '#0a0a0a' : '#ffffff'
  m.setAttribute('content', color)
}

/** Persist */
function save(){
  try{
    localStorage.setItem('app_theme', JSON.stringify({
      theme: selected.value,
      highContrast: !!highContrast.value,
      reduceMotion: !!reduceMotion.value
    }))
  }catch{}
}
function load(){
  try{
    const s = JSON.parse(localStorage.getItem('app_theme') || 'null')
    if (s){
      selected.value = s.theme || selected.value
      highContrast.value = !!s.highContrast
      reduceMotion.value = !!s.reduceMotion
    }
  }catch{}
}

/** Actions */
async function apply(){
  applying.value = true
  applyThemeToDOM(selected.value)
  save()
  buzz(14)
  emit('apply', { theme: selected.value, highContrast: highContrast.value, reduceMotion: reduceMotion.value, at: Date.now() })
  applying.value = false
  close('apply')
}
function close(reason){ emit('close', { reason }) }
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/** Swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

/** Lifecycle */
onMounted(()=>{
  load()
  applyThemeToDOM(selected.value) // reflect current selection immediately
  mq?.addEventListener?.('change', onMQ)
})
onBeforeUnmount(()=>{
  mq?.removeEventListener?.('change', onMQ)
})
</script>

<style scoped>
/* Entrance */
@keyframes in { from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in { animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
