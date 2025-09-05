<template>
  <div class="inline-flex items-center gap-2" :style="safeArea">
    <button
      :title="active ? 'Stop Sharing' : 'Share Screen'"
      :aria-pressed="active ? 'true' : 'false'"
      :disabled="pending"
      @click="active ? stopShare('button') : startShare()"
      class="icon-btn flex items-center gap-2"
    >
      <span v-if="!active">🖥️ Share</span>
      <span v-else>❌ Stop</span>
    </button>

    <!-- Quick audio toggle (optional) -->
    <label v-if="showAudioToggle" class="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
      <input type="checkbox" v-model="withAudio" class="accent-indigo-600" />
      <span>Audio</span>
    </label>
  </div>

  <!-- 🔎 Mini preview (draggable) -->
  <transition name="fade">
    <div
      v-if="active && preview"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      class="fixed z-40 w-[140px] h-[88px] rounded-xl overflow-hidden shadow-lg border border-white/20 bg-black/60 backdrop-blur touch-none"
      @pointerdown.prevent="onDragStart"
      @pointermove.prevent="onDragMove"
      @pointerup="onDragEnd" @pointercancel="onDragEnd"
    >
      <video ref="previewEl" autoplay playsinline muted class="w-full h-full object-cover"></video>
      <div class="absolute bottom-1 left-1 right-1 flex items-center justify-between px-2">
        <span class="text-[10px] text-white/90 bg-black/40 px-1.5 rounded">Preview</span>
        <button @click="stopShare('preview')" class="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded">Stop</button>
      </div>
    </div>
  </transition>

  <!-- Toast -->
  <transition name="fade">
    <div
      v-if="toast"
      class="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow"
    >{{ toast }}</div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'

/** Props */
const props = defineProps({
  /** CSS selector ya video target ya kuweka stream (default: 'video'). Ukiacha tupu, utumie @stream/attach. */
  target: { type: String, default: 'video' },
  /** Onyesha kidirisha cha podo la skrini */
  preview: { type: Boolean, default: true },
  /** Onyesha swichi ya Audio kando ya kitufe (desktop/landscape inafaa) */
  showAudioToggle: { type: Boolean, default: true },
  /** Audio ya skrini/tab (browser-dependent) */
  defaultWithAudio: { type: Boolean, default: false },
  /** Ruhusu PiP kwenye preview (itafunguliwa ukitumia API kutoka kwa mzazi kama unataka) */
  enablePiP: { type: Boolean, default: false },
  /** Callback ya kuambatisha stream (badala ya target selector) */
  attach: { type: Function, default: null } // (stream) => void
})

/** Emits */
const emit = defineEmits(['start','stream','stop','error'])

/** State */
const active = ref(false)
const pending = ref(false)
const withAudio = ref(!!props.defaultWithAudio)
const streamRef = ref(null)
const previewEl = ref(null)
const toast = ref('')

/** Target video & restore */
let targetEl = null
let prevSrcObject = null

/** Start */
async function startShare(){
  if (!navigator.mediaDevices?.getDisplayMedia) {
    fail('Screen share not supported on this browser'); return
  }
  try {
    pending.value = true

    // Cache target element & previous stream (ikiwa ipo)
    await nextTick()
    if (props.target) {
      targetEl = document.querySelector(props.target)
      if (targetEl && targetEl.srcObject instanceof MediaStream) {
        prevSrcObject = targetEl.srcObject
      }
    }

    // Omba stream
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: withAudio.value
    })
    streamRef.value = stream
    active.value = true
    emit('start', { withAudio: withAudio.value })
    emit('stream', stream)

    // Ambatisha
    if (typeof props.attach === 'function') props.attach(stream)
    else if (targetEl) targetEl.srcObject = stream

    // Preview
    if (previewEl.value) previewEl.value.srcObject = stream

    // Auto-stop tukifungwa kupitia UI ya browser
    const vTrack = stream.getVideoTracks()?.[0]
    vTrack?.addEventListener?.('ended', () => stopShare('native'))

    vibe(10)
    ok('Screen sharing started')
  } catch (e) {
    if (e?.name === 'NotAllowedError') fail('Permission denied')
    else if (e?.name === 'NotFoundError') fail('No window/screen selected')
    else fail('Failed to start share')
    emit('error', e)
  } finally {
    pending.value = false
  }
}

/** Stop */
function stopShare(reason='manual'){
  try { streamRef.value?.getTracks?.().forEach(t => t.stop()) } catch {}
  // Rudisha stream ya awali kwa target ikiwa ipo
  if (targetEl) targetEl.srcObject = prevSrcObject || null
  streamRef.value = null
  active.value = false
  emit('stop', { reason })
  prevSrcObject = null
  targetEl = null
  vibe(6)
  ok('Screen sharing stopped')
}

/** Utils */
function ok(msg){ toast.value = msg; setTimeout(() => toast.value = '', 1200) }
function fail(msg){ toast.value = msg; setTimeout(() => toast.value = '', 1600) }
function vibe(ms){ try { navigator.vibrate?.(ms) } catch {} }

/** Draggable preview */
const pos = ref({ x: 12, y: 12 })
let drag = null
function onDragStart(e){ drag = { x0: e.clientX, y0: e.clientY, px: pos.value.x, py: pos.value.y } }
function onDragMove(e){
  if (!drag) return
  const nx = Math.min(window.innerWidth - 150, Math.max(8, drag.px + (e.clientX - drag.x0)))
  const ny = Math.min(window.innerHeight - 100, Math.max(8, drag.py + (e.clientY - drag.y0)))
  pos.value = { x: nx, y: ny }
}
function onDragEnd(){ drag = null }

/** Cleanup */
onBeforeUnmount(() => stopShare('unmount'))

/** Safe-area (iOS) */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
</script>

<style scoped>
.icon-btn {
  /* Mobile-first tap target & aesthetics (Tailwind-friendly) */
  @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-full shadow active:translate-y-[1px];
}
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
