<template>
  <div class="inline-flex items-center gap-2">
    <!-- Segmented control (mobile-first) -->
    <div
      class="seg group"
      role="radiogroup"
      aria-label="Theme"
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        class="seg-btn"
        :class="theme === opt.value && 'seg-btn-on'"
        role="radio"
        :aria-checked="theme === opt.value ? 'true' : 'false'"
        @click="setTheme(opt.value)"
      >
        <span class="text-base">{{ opt.emoji }}</span>
        <span class="text-[11px] font-semibold">{{ opt.label }}</span>
      </button>
    </div>

    <!-- Accessible fallback (screen-readers / keyboards) -->
    <label class="sr-only" :for="cid">Theme</label>
    <select :id="cid" v-model="theme" @change="onSelect" class="select-fallback">
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

/** Config */
const STORAGE_KEY = 'theme_mode'   // 'light' | 'dark' | 'amoled' | 'auto'
const cid = `theme-${Math.random().toString(36).slice(2,8)}`
const options = [
  { value: 'light',  label: 'Light',  emoji: '☀️' },
  { value: 'dark',   label: 'Dark',   emoji: '🌙' },
  { value: 'amoled', label: 'AMOLED', emoji: '🖤' },
  { value: 'auto',   label: 'Auto',   emoji: '🪄' },
]

/** State */
const theme = ref(localStorage.getItem(STORAGE_KEY) || 'auto')
let mql = null

/** Helpers */
function systemPrefersDark(){
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}
function resolveMode(mode){
  if (mode === 'auto') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}
function applyTheme(mode){
  const resolved = resolveMode(mode)
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)          // CSS switches via [data-theme]
  root.classList.add('theme-anim')                   // smoothen transition
  setTimeout(()=> root.classList.remove('theme-anim'), 200)

  // Hint browsers for form controls/overlays
  root.style.colorScheme = resolved === 'light' ? 'light' : 'dark'

  // Mobile address-bar color
  const meta = document.querySelector('meta[name="theme-color"]') || (() => {
    const m = document.createElement('meta')
    m.setAttribute('name', 'theme-color'); document.head.appendChild(m); return m
  })()
  meta.setAttribute('content',
    resolved === 'light' ? '#ffffff' :
    resolved === 'dark'  ? '#0b1020' : '#000000'
  )
}
function persist(mode){
  localStorage.setItem(STORAGE_KEY, mode)
}
function buzz(ms=10){ try{ navigator.vibrate?.(ms) }catch{} }

/** Actions */
function setTheme(mode){
  theme.value = mode
  persist(mode)
  applyTheme(mode)
  buzz(6)
}
function onSelect(){ setTheme(theme.value) }

/** Cross-tab sync */
function onStorage(e){
  if (e.key === STORAGE_KEY && e.newValue){
    theme.value = e.newValue
    applyTheme(theme.value)
  }
}

/** Lifecycle */
onMounted(() => {
  // Apply initial
  applyTheme(theme.value)

  // Observe system changes when on 'auto'
  if (window.matchMedia){
    mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (theme.value === 'auto') applyTheme('auto') }
    mql.addEventListener ? mql.addEventListener('change', onChange) : mql.addListener(onChange)
  }

  // Listen cross-tab
  window.addEventListener('storage', onStorage, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('storage', onStorage)
  if (mql){
    mql.removeEventListener ? mql.removeEventListener('change', applyTheme) : mql.removeListener(applyTheme)
  }
})
</script>

<style scoped>
/* Segmented control */
.seg{
  display: grid;
  grid-auto-flow: column;
  gap: .25rem;
  padding: .25rem;
  border-radius: 1rem;
  background: color-mix(in oklab, var(--card-bg) 85%, transparent);
  border: 1px solid var(--line);
  backdrop-filter: blur(8px);
}
.seg-btn{
  min-width: 70px;
  height: 38px;
  padding: .35rem .6rem;
  border-radius: .9rem;
  display: inline-flex; align-items: center; justify-content: center; gap: .35rem;
  background: transparent;
  color: var(--text-2);
  border: 1px solid transparent;
}
.seg-btn:active{ transform: translateY(1px) }
.seg-btn-on{
  background: var(--accent-weak);
  color: var(--accent-text);
  border-color: color-mix(in oklab, var(--accent) 40%, transparent);
  box-shadow: 0 1px 0 rgba(0,0,0,.06), inset 0 0 0 999px color-mix(in oklab, var(--accent) 6%, transparent);
}

/* Hidden select for accessibility (visible to SR/keyboard) */
.select-fallback{
  position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;
}

/* Smooth theme change */
:global(html.theme-anim), :global(body.theme-anim){
  transition: background-color .2s ease, color .2s ease;
}

/* THEME TOKENS (applied on :root via data-theme) */
:global(:root){
  --bg: #ffffff;
  --text: #0f172a;
  --text-2: #334155;
  --card-bg: #ffffff;
  --line: #e5e7eb;
  --accent: #6366f1;           /* indigo-500 */
  --accent-weak: #eef2ff;      /* indigo-50 */
  --accent-text: #1e1b4b;
  background: var(--bg);
  color: var(--text);
}
:global(:root[data-theme="dark"]){
  --bg: #0b1020;
  --text: #e5e7eb;
  --text-2: #cbd5e1;
  --card-bg: #111729;
  --line: #1f2a44;
  --accent: #818cf8;
  --accent-weak: #1e293b;
  --accent-text: #e5e7eb;
}
:global(:root[data-theme="amoled"]){
  --bg: #000000;
  --text: #e6e6e6;
  --text-2: #c7c7c7;
  --card-bg: #0a0a0a;
  --line: #1a1a1a;
  --accent: #22d3ee;
  --accent-weak: #041014;
  --accent-text: #e6feff;
}

/* Utility */
.sr-only{
  position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
</style>
