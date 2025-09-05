<!-- HostCardMobile.vue -->
<template>
  <div
    ref="card"
    class="group relative w-full max-w-full rounded-2xl p-4 bg-gradient-to-br from-white to-zinc-50
           dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200/70 dark:border-zinc-800/70
           shadow-sm hover:shadow-md transition will-change-transform select-none"
    :class="[compact ? 'p-3' : 'p-4']"
    role="group"
    @pointerdown="onPressStart"
    @pointerup="onPressEnd"
    @pointercancel="onPressEnd"
    @mouseleave="onPressEnd"
  >
    <!-- Top row: role + menu -->
    <div class="flex items-start justify-between gap-2 mb-3">
      <!-- Role / Main badge -->
      <div class="flex items-center gap-1.5">
        <span
          v-if="host.role || host.isMain"
          class="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide
                 bg-indigo-600/90 text-white shadow"
          :title="host.isMain ? 'Main host' : host.role"
        >
          {{ host.isMain ? 'Main' : host.role }}
        </span>

        <!-- Connection quality chip -->
        <span
          v-if="connectionLabel"
          class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          :title="`Network: ${connectionLabel}${host.latency ? ` • ${host.latency}ms` : ''}`"
        >
          <span
            class="inline-block rounded-full mr-1 align-middle"
            :class="dotClass"
            style="width:8px;height:8px"
          />
          {{ connectionLabel }}
        </span>
      </div>

      <!-- Menu -->
      <div class="relative">
        <button
          class="h-9 w-9 grid place-items-center rounded-xl bg-zinc-100 dark:bg-zinc-800
                 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700
                 focus:outline-none focus:ring-2 ring-indigo-400"
          aria-label="Open actions menu"
          @click.stop="toggleMenu"
        >
          ⋮
        </button>

        <transition name="fade-pop">
          <div
            v-if="menuOpen"
            class="absolute right-0 mt-2 w-44 rounded-2xl overflow-hidden bg-white/95 dark:bg-zinc-900/95
                   ring-1 ring-black/10 dark:ring-white/10 shadow-2xl z-10 backdrop-blur"
            role="menu"
          >
            <button class="menu-row" @click="emitBoth('swap', host.id)">🔁 Swap to Main</button>
            <button class="menu-row" @click="emitBoth('pin', host.id)">{{ pinned ? '📌 Unpin' : '📌 Pin' }}</button>
            <button class="menu-row danger" @click="emitBoth('remove', host.id)">🗑 Remove</button>
          </div>
        </transition>
      </div>
    </div>

    <!-- Middle: avatar + name -->
    <div class="flex items-center gap-3">
      <!-- Avatar with speaking ring -->
      <div class="relative">
        <div
          class="grid place-items-center rounded-full shadow-inner overflow-hidden
                 ring-2"
          :class="[
            host.speaking ? 'ring-emerald-400 animate-talk' : 'ring-transparent',
            compact ? 'h-12 w-12' : 'h-16 w-16'
          ]"
        >
          <img
            :src="host.avatar"
            :alt="`${host.name} avatar`"
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            @load="imgLoaded = true"
            @error="imgError = true"
          />
          <div v-if="!imgLoaded && !imgError" class="skeleton absolute inset-0" />
          <span v-if="imgError" class="text-xl">👤</span>
        </div>

        <!-- Network dot (bottom-right) -->
        <span
          v-if="connectionLabel"
          class="absolute rounded-full border border-white dark:border-zinc-900"
          :class="compact ? 'h-2.5 w-2.5 -bottom-0.5 -right-0.5' : 'h-3 w-3 -bottom-1 -right-1'"
          :style="{ backgroundColor: dotColor }"
        />
      </div>

      <!-- Name + latency -->
      <div class="min-w-0 flex-1">
        <div class="font-semibold text-zinc-800 dark:text-zinc-100 truncate">
          {{ host.name }}
        </div>
        <div class="text-[12px] text-zinc-500 dark:text-zinc-400">
          <span v-if="host.latency">⏱ {{ host.latency }}ms</span>
          <span v-else>Ready</span>
        </div>
      </div>
    </div>

    <!-- Controls: mic/cam -->
    <div class="mt-3 flex items-center justify-center gap-3">
      <button
        class="ctl-btn"
        :aria-pressed="host.mic ? 'true' : 'false'"
        :title="host.mic ? 'Mute mic' : 'Unmute mic'"
        @click="toggleMic"
      >
        <i :class="host.mic ? 'i-tabler-microphone' : 'i-tabler-microphone-off'" />
        <span class="ctl-text">{{ host.mic ? 'Mic On' : 'Mic Off' }}</span>
      </button>

      <button
        class="ctl-btn"
        :aria-pressed="host.cam ? 'true' : 'false'"
        :title="host.cam ? 'Turn camera off' : 'Turn camera on'"
        @click="toggleCam"
      >
        <i :class="host.cam ? 'i-tabler-camera' : 'i-tabler-camera-off'" />
        <span class="ctl-text">{{ host.cam ? 'Cam On' : 'Cam Off' }}</span>
      </button>
    </div>

    <!-- Actions -->
    <div class="mt-3 flex items-center justify-center gap-2">
      <button class="pill-btn pill-primary" @click="emitBoth('swap', host.id)">⤴ Make Main</button>
      <button class="pill-btn pill-danger" @click="emitBoth('remove', host.id)">🗑 Remove</button>
    </div>

    <!-- Ripple -->
    <span class="ripple pointer-events-none" aria-hidden="true"></span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  host: {
    type: Object,
    required: true // { id, name, avatar, mic, cam, speaking?, role?, isMain?, latency?, connection? }
  },
  compact: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false }
})

/* Emit compatibility:
   Parent previously used camelCase (@toggleMic, @toggleCam).
   We'll emit both kebab and camel to be safe. */
const emit = defineEmits([
  'toggle-mic','toggleMic',
  'toggle-cam','toggleCam',
  'swap','remove','pin',
  'longpress','menu'
])

function emitBoth(evt, payload){
  emit(evt, payload)
  // also emit camelCase variant for historical usage
  const map = { 'toggle-mic':'toggleMic', 'toggle-cam':'toggleCam' }
  if (map[evt]) emit(map[evt], payload)
}

/* UI state */
const imgLoaded = ref(false)
const imgError = ref(false)
const menuOpen = ref(false)

/* Connection label/color */
const connectionLabel = computed(()=>{
  // host.connection can be 'good' | 'fair' | 'poor'
  const c = (props.host.connection || '').toLowerCase()
  if (c === 'good') return 'Good'
  if (c === 'fair') return 'Fair'
  if (c === 'poor') return 'Poor'
  return ''
})
const dotColor = computed(()=>{
  switch (connectionLabel.value){
    case 'Good': return '#22c55e'
    case 'Fair': return '#f59e0b'
    case 'Poor': return '#ef4444'
    default: return '#9ca3af'
  }
})
const dotClass = computed(()=> 'inline-block')

/* Actions */
function toggleMic(){
  buzz(10)
  emitBoth('toggle-mic', props.host.id)
}
function toggleCam(){
  buzz(10)
  emitBoth('toggle-cam', props.host.id)
}
function toggleMenu(){
  menuOpen.value = !menuOpen.value
  emit('menu', { id: props.host.id, open: menuOpen.value })
}

/* Long-press (mobile quick access) */
let pressTimer = null
function onPressStart(){
  clearTimeout(pressTimer)
  pressTimer = setTimeout(()=>{
    buzz(16)
    emit('longpress', props.host.id)
    menuOpen.value = true
  }, 480)
}
function onPressEnd(){ clearTimeout(pressTimer) }

/* Haptics */
function buzz(ms=8){ try{ navigator?.vibrate?.(ms) }catch{} }
</script>

<style scoped>
/* Controls buttons */
.ctl-btn{
  @apply min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border
         bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100
         border-zinc-200 dark:border-zinc-700
         flex items-center gap-2 text-sm
         hover:bg-zinc-50 dark:hover:bg-zinc-800 transition;
}
.ctl-text{ font-size: 12px }

/* Pills */
.pill-btn{
  @apply min-h-[40px] px-3 py-2 rounded-full text-sm font-semibold
         border transition;
}
.pill-primary{
  @apply bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700;
}
.pill-danger{
  @apply bg-rose-600 text-white border-rose-600 hover:bg-rose-700;
}

/* Skeleton shimmer */
.skeleton{
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent);
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer{
  from{ transform: translateX(-100%) }
  to{ transform: translateX(100%) }
}

/* Speaking ring */
@keyframes talk{
  0%,100%{ box-shadow: 0 0 0 2px rgba(16,185,129,.55) }
  50%{ box-shadow: 0 0 0 10px rgba(16,185,129,.25) }
}
.animate-talk{ animation: talk 1.6s ease-in-out infinite }

/* Menu pop */
.menu-row{
  @apply w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition;
}
.menu-row.danger{
  @apply text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20;
}

/* Pop transition */
.fade-pop-enter-active,.fade-pop-leave-active{ transition: opacity .15s ease, transform .15s ease }
.fade-pop-enter-from,.fade-pop-leave-to{ opacity:0; transform: translateY(6px) }

/* Ripple */
.ripple::after{
  content:'';
  position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background: radial-gradient( circle at var(--rx,50%) var(--ry,50%), rgba(0,0,0,.06), transparent 40% );
  opacity:0; transform: scale(0.96);
}
.group:active .ripple::after{ opacity:1; transition: opacity .25s, transform .25s; transform: scale(1) }

/* Reduce iOS tap highlight */
:host, button{ -webkit-tap-highlight-color: transparent; }
</style>
