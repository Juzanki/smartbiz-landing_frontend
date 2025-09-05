<template>
  <!-- Floating container (mobile-first thumb reach) -->
  <div class="fixed bottom-16 right-4 z-50 flex items-center gap-2 pointer-events-auto select-none">
    <!-- Main action: preserves your original behavior -->
    <button
      @click="emit('open')"
      class="h-12 w-12 rounded-full bg-purple-700 text-white shadow-lg active:scale-95 transition
             flex items-center justify-center ring-2 ring-white/10"
      aria-label="Open theme settings"
    >
      <span class="text-xl">🎨</span>
    </button>

    <!-- Quick expand to choose theme -->
    <button
      @click="toggleSheet"
      class="h-12 px-4 rounded-full bg-purple-700 text-white shadow-lg active:scale-95 transition
             hidden sm:flex items-center gap-2 ring-2 ring-white/10"
      aria-expanded="sheetOpen"
      aria-controls="theme-sheet"
      title="Quick Theme"
    >
      <span class="text-lg">{{ iconFor(current) }}</span>
      <span class="text-sm font-medium capitalize hidden md:inline">{{ current }}</span>
      <svg class="w-4 h-4 opacity-80" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"/></svg>
    </button>
  </div>

  <!-- Backdrop -->
  <div
    v-if="sheetOpen"
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
    @click="closeSheet"
  />

  <!-- Bottom sheet -->
  <div
    v-if="sheetOpen"
    id="theme-sheet"
    class="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl bg-white text-gray-900 shadow-2xl
           dark:bg-[#0b0b10] dark:text-white"
  >
    <div class="mx-auto w-full max-w-md p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-base font-semibold">Theme</h3>
        <button @click="closeSheet" class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">
          ✖
        </button>
      </div>

      <p class="text-sm opacity-70 mb-3">Choose how the app looks on your device.</p>

      <div class="grid grid-cols-3 gap-3">
        <button
          :class="optionClass('light')"
          @click="setTheme('light')"
        >
          <span class="text-2xl">☀️</span>
          <span class="text-xs mt-1">Light</span>
        </button>

        <button
          :class="optionClass('dark')"
          @click="setTheme('dark')"
        >
          <span class="text-2xl">🌙</span>
          <span class="text-xs mt-1">Dark</span>
        </button>

        <button
          :class="optionClass('system')"
          @click="setTheme('system')"
        >
          <span class="text-2xl">🖥️</span>
          <span class="text-xs mt-1">System</span>
        </button>
      </div>

      <!-- Extras / Upanuzi zaidi -->
      <div class="mt-4 space-y-2">
        <label class="flex items-center justify-between text-sm">
          <span>Reduce motion</span>
          <input type="checkbox" v-model="reduceMotion" @change="applyMotion()" class="accent-purple-600">
        </label>
        <label class="flex items-center justify-between text-sm">
          <span>High contrast</span>
          <input type="checkbox" v-model="highContrast" @change="applyContrast()" class="accent-purple-600">
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['open'])

const sheetOpen = ref(false)
const current = ref('light')   // 'light' | 'dark' | 'system'
const reduceMotion = ref(false)
const highContrast = ref(false)

let mql = null // matchMedia listener for system theme

const toggleSheet = () => { sheetOpen.value = !sheetOpen.value }
const closeSheet = () => { sheetOpen.value = false }

const iconFor = (mode) => (mode === 'dark' ? '🌙' : mode === 'system' ? '🖥️' : '☀️')

function readStoredBoolean(key, fallback = false) {
  const v = localStorage.getItem(key)
  if (v === 'true') return true
  if (v === 'false') return false
  return fallback
}

function applyTheme(mode) {
  const body = document.body
  // Clear previous classes first (keeps compatibility with your existing theme strategy)
  body.classList.remove('theme-light', 'theme-dark')
  if (mode === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    body.classList.add(prefersDark ? 'theme-dark' : 'theme-light')
  } else {
    body.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light')
  }
}

function setTheme(mode) {
  current.value = mode
  localStorage.setItem('theme', mode)
  applyTheme(mode)
  // manage system listener
  if (mql) {
    mql.removeEventListener?.('change', onSystemChange)
    mql = null
  }
  if (mode === 'system' && window.matchMedia) {
    mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener?.('change', onSystemChange)
  }
  // haptic (mobile)
  try { navigator.vibrate?.(15) } catch (e) {}
  closeSheet()
}

function onSystemChange(e) {
  // Re-apply if on system
  if (current.value === 'system') {
    applyTheme('system')
  }
}

function applyMotion() {
  const body = document.body
  reduceMotion.value ? body.classList.add('reduced-motion') : body.classList.remove('reduced-motion')
  localStorage.setItem('reduce_motion', String(reduceMotion.value))
}

function applyContrast() {
  const body = document.body
  highContrast.value ? body.classList.add('high-contrast') : body.classList.remove('high-contrast')
  localStorage.setItem('high_contrast', String(highContrast.value))
}

onMounted(() => {
  // Load stored
  const stored = localStorage.getItem('theme') || 'light'
  current.value = stored
  reduceMotion.value = readStoredBoolean('reduce_motion', false)
  highContrast.value = readStoredBoolean('high_contrast', false)

  applyTheme(current.value)
  applyMotion()
  applyContrast()

  if (current.value === 'system' && window.matchMedia) {
    mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener?.('change', onSystemChange)
  }
})

onBeforeUnmount(() => {
  if (mql) mql.removeEventListener?.('change', onSystemChange)
})
</script>

<style scoped>
/* Optional helpers for extras */
.reduced-motion * {
  transition: none !important;
  animation: none !important;
}
.high-contrast {
  filter: contrast(1.15);
}
</style>
