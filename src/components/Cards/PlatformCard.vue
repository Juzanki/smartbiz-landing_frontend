<template>
  <div
    class="integration-card relative w-full rounded-2xl border transition
           bg-white/80 backdrop-blur p-4 shadow-sm
           active:scale-[0.99] select-none"
    :class="[
      connected ? 'border-emerald-300 shadow-md' : 'border-black/10',
      disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
    ]"
    role="button"
    :aria-pressed="connected ? 'true' : 'false'"
    tabindex="0"
    @click="onTap"
    @keydown.enter.space.prevent="onTap"
    @pointerdown="ripple"
    @pointerup="pressing=false"
    @pointerleave="pressing=false"
  >
    <!-- wings -->
    <span class="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 h-10 w-16 rounded-full blur-2xl bg-emerald-200/30"></span>
    <span class="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 h-10 w-16 rounded-full blur-2xl bg-cyan-200/30"></span>
    <!-- sheen -->
    <span class="sheen pointer-events-none absolute inset-0"></span>

    <!-- header row -->
    <div class="flex items-center gap-3">
      <!-- icon -->
      <div class="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5">
        <span v-if="!iconClass" class="text-2xl" :class="connected ? 'pulse' : ''">{{ icon }}</span>
        <i v-else :class="[iconClass,'text-2xl']"></i>

        <!-- status dot -->
        <span
          class="absolute -right-1 -top-1 h-3 w-3 rounded-full ring-2 ring-white"
          :class="connected ? 'bg-emerald-500' : error ? 'bg-rose-500' : 'bg-gray-300'"
          aria-hidden="true"
        />
      </div>

      <!-- title + meta -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-gray-900 truncate">{{ name }}</h3>
          <span
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            :class="connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'"
          >
            <span class="h-1.5 w-1.5 rounded-full"
                  :class="connected ? 'bg-emerald-500' : 'bg-gray-400'"></span>
            {{ connected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>

        <p v-if="description" class="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {{ description }}
        </p>

        <!-- error -->
        <p v-if="error" class="mt-1 text-[11px] font-semibold text-rose-600">
          {{ error }}
        </p>
      </div>
    </div>

    <!-- actions -->
    <div class="mt-3 flex items-center gap-2">
      <button
        v-if="!connected"
        class="btn-primary"
        :disabled="loading"
        @click.stop="emit('connect')"
      >
        <svg v-if="loading" class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" class="opacity-25" />
          <path d="M21 12a9 9 0 0 1-9 9" class="opacity-90" />
        </svg>
        Connect
      </button>

      <button
        v-else
        class="btn-secondary"
        :disabled="loading"
        @click.stop="emit('manage')"
      >
        Manage
      </button>

      <button
        v-if="connected"
        class="btn-ghost text-rose-600 hover:text-rose-700"
        :disabled="loading"
        @click.stop="emit('disconnect')"
      >
        Disconnect
      </button>

      <button
        v-if="error"
        class="btn-ghost text-amber-600 hover:text-amber-700"
        @click.stop="emit('retry')"
      >
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  icon?: string            // emoji fallback
  iconClass?: string       // optional icon class e.g. "i-tabler-brand-..."
  connected?: boolean
  loading?: boolean
  disabled?: boolean
  description?: string
  error?: string | null
}>(), {
  icon: '🔗',
  connected: false,
  loading: false,
  disabled: false,
  description: '',
  error: null
})

const emit = defineEmits<{
  (e:'connect'): void
  (e:'disconnect'): void
  (e:'manage'): void
  (e:'retry'): void
  (e:'longpress'): void
}>()

/* long-press to open deep settings */
const pressing = ref(false)
let timer: number | null = null

function onTap(){
  // default tap: if connected → manage; else → connect
  if (pressing.value) return
  props.connected ? emit('manage') : emit('connect')
}

function ripple(e: PointerEvent){
  pressing.value = true
  const target = e.currentTarget as HTMLElement
  const span = document.createElement('span')
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.2
  span.className = 'ripple'
  span.style.width = span.style.height = `${size}px`
  span.style.left = `${e.clientX - rect.left - size/2}px`
  span.style.top = `${e.clientY - rect.top - size/2}px`
  target.appendChild(span)
  setTimeout(()=> span.remove(), 600)

  // long press
  timer = window.setTimeout(() => {
    if (pressing.value) emit('longpress')
  }, 500)

  const end = () => { pressing.value = false; if (timer) { clearTimeout(timer); timer = null } }
  target.addEventListener('pointerup', end, { once: true })
  target.addEventListener('pointerleave', end, { once: true })
}
</script>

<style scoped>
.integration-card { min-height: 112px; }

/* Buttons */
.btn-primary{
  @apply inline-flex items-center justify-center px-4 py-2 rounded-2xl text-white text-sm font-semibold;
  background: linear-gradient(100deg, #10b981, #06b6d4);
  box-shadow: 0 6px 16px rgba(16,185,129,.25);
  transition: transform .15s ease, box-shadow .15s ease;
}
.btn-primary:hover{ transform: translateY(-1px); box-shadow: 0 10px 20px rgba(16,185,129,.28) }
.btn-primary:disabled{ opacity:.6; box-shadow:none }

.btn-secondary{
  @apply px-4 py-2 rounded-2xl text-sm font-semibold bg-black/5 hover:bg-black/10;
}
.btn-ghost{
  @apply px-3 py-2 rounded-2xl text-sm font-semibold bg-transparent hover:bg-black/5;
}

/* Sheen */
.sheen::before{
  content:''; position:absolute; inset:0;
  background-image: linear-gradient(115deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,.16) 35%,
    rgba(255,255,255,0) 70%);
  transform: translateX(-120%);
  animation: sheenMove 2.8s linear infinite;
}
@keyframes sheenMove{
  0%{ transform: translateX(-120%) }
  60%{ transform: translateX(120%) }
  100%{ transform: translateX(120%) }
}

/* Pulse on icon when connected */
@keyframes pulse {
  0% { transform: scale(1);   opacity: .85 }
  50%{ transform: scale(1.08); opacity: 1 }
  100%{ transform: scale(1);  opacity: .85 }
}
.pulse { animation: pulse 1.8s ease-in-out infinite }

/* Ripple */
.ripple{
  position:absolute; border-radius:9999px; pointer-events:none;
  background: rgba(16,185,129,.2); transform: scale(0);
  animation: ripple .6s ease-out forwards;
}
@keyframes ripple { to { transform: scale(1); opacity: 0; } }

/* Mobile-first tweaks */
@media (min-width: 640px){
  .integration-card{ padding: 1.25rem; }
}
</style>
