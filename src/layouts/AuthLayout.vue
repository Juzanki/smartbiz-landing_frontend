<!-- src/layouts/AuthLayout.vue -->
<template>
  <div :class="['auth-root', effectiveTheme]">
    <!-- connectivity banner -->
    <div
      v-if="!online"
      class="mx-3 mb-3 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm"
      role="status"
      aria-live="polite"
    >
      You’re offline — some features may be limited.
    </div>

    <!-- background -->
    <div class="bg-wrap">
      <div class="bg-gradient" />
      <div class="bg-glow" />
    </div>

    <!-- card -->
    <section
      class="card animate-fade-in"
      role="region"
      aria-label="Authentication"
    >
      <!-- top actions -->
      <div class="top-actions">
        <button
          v-if="showBack"
          class="icon-btn"
          aria-label="Go back"
          @click="$emit('back')"
        >←</button>

        <button
          v-if="canInstall"
          class="chip"
          aria-label="Install App"
          title="Install App"
          @click="installApp"
        >
          ⤵️ Install
        </button>
      </div>

      <!-- logo -->
      <div class="logo-wrap">
        <img
          :src="logoSrc"
          :alt="appName + ' Logo'"
          class="logo"
        />
      </div>

      <!-- headings (optional) -->
      <header v-if="title || subtitle" class="text-center mb-2">
        <h1 v-if="title" class="title">{{ title }}</h1>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      </header>

      <!-- content -->
      <div class="slot-wrap">
        <slot />
      </div>

      <!-- footer slot (optional) -->
      <div v-if="$slots.footer" class="footer-slot">
        <slot name="footer" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

/** Props */
const props = withDefaults(defineProps<{
  logoSrc?: string
  appName?: string
  title?: string
  subtitle?: string
  theme?: 'light' | 'dark' | 'system'
  showBack?: boolean
}>(), {
  logoSrc: '@/assets/logo.svg',
  appName: 'SmartBiz',
  title: '',
  subtitle: '',
  theme: 'system',
  showBack: false
})

defineEmits<{ (e:'back'): void, (e:'install'): void }>()

/** Theme handling (respects prefers-color-scheme) */
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')
const effectiveTheme = computed(() =>
  props.theme === 'system' ? (prefersDark?.matches ? 'theme-dark' : 'theme-light') :
  props.theme === 'dark' ? 'theme-dark' : 'theme-light'
)

/** Connectivity & PWA install */
const online = ref(navigator.onLine)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

let deferredPrompt: any = null
const canInstall = ref(false)
function installApp(){
  try { deferredPrompt?.prompt?.() } catch {}
  canInstall.value = false
}

/** Focus first input inside the slot (mobile-first UX) */
async function focusFirstInput(){
  await nextTick()
  const el = document.querySelector<HTMLElement>('.slot-wrap input, .slot-wrap select, .slot-wrap textarea, .slot-wrap button')
  el?.focus?.()
}

onMounted(() => {
  // theme class on <html> for dark mode utilities
  const html = document.documentElement
  html.classList.toggle('dark', effectiveTheme.value === 'theme-dark')

  focusFirstInput()

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = true
  })

  // react to system theme changes when using system
  prefersDark?.addEventListener?.('change', () => {
    html.classList.toggle('dark', effectiveTheme.value === 'theme-dark')
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
/* ---------- Root & background ---------- */
.auth-root{
  min-height: 100svh; /* mobile keyboard-safe viewport */
  display: grid;
  place-items: center;
  padding: 1rem;
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.bg-wrap{ position: absolute; inset: 0; z-index: -2; }
.bg-gradient{
  position:absolute; inset:0;
  background: linear-gradient(135deg, #000 0%, #0f172a 100%);
}
.bg-glow{
  position:absolute; inset:-20%;
  background:
    radial-gradient(40% 30% at 20% 20%, rgba(255,215,0,.18), transparent 60%),
    radial-gradient(30% 25% at 80% 70%, rgba(99,102,241,.20), transparent 60%);
  filter: blur(40px);
  opacity:.9;
}

/* ---------- Card ---------- */
.card{
  width: 100%;
  max-width: 24rem; /* max-w-md */
  background: rgba(24,24,41, .92);
  color: #fff;
  border-radius: 1.25rem;
  border: 2px solid #ffd700; /* premium gold */
  box-shadow:
    0 10px 30px rgba(0,0,0,.35),
    inset 0 0 0 1px rgba(255,255,255,.05);
  padding: 2rem 1.25rem;
  backdrop-filter: saturate(120%) blur(6px);
  position: relative;
}

/* top actions */
.top-actions{
  position:absolute; inset: .5rem .5rem auto auto;
  display:flex; align-items:center; gap:.5rem;
}
.icon-btn{
  width: 2.25rem; height: 2.25rem; border-radius: .75rem;
  display:grid; place-items:center;
  background: rgba(255,255,255,.1);
  color:#fff; border: 1px solid rgba(255,255,255,.18);
}
.icon-btn:active{ transform: scale(.96) }

.chip{
  height: 2rem; padding: 0 .65rem; border-radius: 9999px;
  display:inline-flex; align-items:center; gap:.35rem;
  background: rgba(255,255,255,.18); color:#fff; font-size:12px; font-weight:700;
  border: 1px solid rgba(255,255,255,.22);
  backdrop-filter: saturate(120%) blur(6px);
}

/* logo */
.logo-wrap{ display:flex; justify-content:center; margin-bottom:.5rem; }
.logo{
  height: 5rem; width: 5rem; border-radius: 9999px; object-fit: contain;
  background: #fff;
  border: 4px solid #ffd700; /* gold ring */
  box-shadow: 0 6px 24px rgba(255,215,0,.25);
}

/* headings */
.title{
  font-size: 1.125rem; /* text-lg */
  font-weight: 800;
  color: #fef08a; /* soft gold */
}
.subtitle{
  font-size: .9rem;
  color: #e5e7eb;
  opacity: .85;
}

/* slot area */
.slot-wrap{ margin-top: .5rem; }

/* footer slot */
.footer-slot{ margin-top: 1rem; color: #cbd5e1; font-size: .8rem; text-align: center; }

/* ---------- Themes ---------- */
.theme-light .bg-gradient{ background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%); }
.theme-light .card{ background: rgba(255,255,255,.9); color:#0f172a; }
.theme-light .icon-btn{ background: rgba(0,0,0,.06); color:#0f172a; border-color: rgba(0,0,0,.08); }
.theme-light .chip{ background: rgba(0,0,0,.06); color:#0f172a; border-color: rgba(0,0,0,.08); }
.theme-light .subtitle{ color:#334155; }

/* ---------- Animations ---------- */
.animate-fade-in { animation: fadeIn .5s cubic-bezier(.4,0,.2,1) both; }
@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(24px) scale(.97); }
  100%{ opacity: 1; transform: translateY(0) scale(1); }
}

/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in { animation: none; }
  .bg-glow{ filter: none; opacity: .5; }
}

/* focus styles (a11y) */
:focus-visible{
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}
</style>
