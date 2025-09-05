<template>
  <!-- Floating Action Button -->
  <div class="fixed z-40 right-4 bottom-20 sm:bottom-5" :style="safeArea">
    <div class="flex items-center gap-2">
      <button
        :aria-pressed="active ? 'true' : 'false'"
        :disabled="pending"
        @click="active ? stopShare('button') : startShare()"
        class="h-12 px-5 rounded-full shadow-lg text-sm font-semibold text-white active:translate-y-[1px]
               flex items-center gap-2"
        :class="active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'"
        title="Share Screen"
      >
        <span class="inline-block h-2.5 w-2.5 rounded-full"
              :class="active ? 'bg-emerald-300 animate-ping' : 'bg-white/70'"></span>
        <span>{{ active ? 'Stop Sharing' : 'Share Screen' }}</span>
      </button>

      <!-- Quick options -->
      <label class="hidden xs:flex items-center gap-2 text-xs bg-black/40 text-white px-3 py-2 rounded-full">
        <input type="checkbox" v-model="withAudio" class="accent-white" />
        <span>Include audio</span>
      </label>
    </div>

    <!-- Secondary actions when live -->
    <transition name="fade">
      <div v-if="active" class="mt-2 flex gap-2">
        <button @click="switchShare" class="h-9 px-3 rounded-full bg-black/60 text-white text-xs">Switch Window</button>
        <button v-if="pipSupported" @click="togglePiP" class="h-9 px-3 rounded-full bg-black/60 text-white text-xs">
          {{ pipOn ? 'Exit PiP' : 'PiP Preview' }}
        </button>
      </div>
    </transition>
  </div>

  <!-- Mini preview (draggable) -->
  <transition name="fade">
    <div v-if="active && preview"
         :style="{ left: pos.x+'px', top: pos.y+'px' }"
         class="fixed z-30 w-[140px] h-[88px] rounded-xl overflow-hidden shadow-lg border border-white/20 bg-black/60 backdrop-blur
                touch-none"
         @pointerdown.prevent="onDragStart"
         @pointermove.prevent="onDragMove"
         @pointerup="onDragEnd" @pointercancel="onDragEnd">
      <video ref="videoEl" autoplay playsinline muted class="w-full h-full object-cover"></video>
      <div class="absolute bottom-1 left-1 right-1 flex items-center justify-between px-2">
        <span class="text-[10px] text-white/90 bg-black/40 px-1.5 rounded">Preview</span>
        <button @click="stopShare('preview')" class="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded">Stop</button>
      </div>
    </div>
  </transition>

  <!-- Toast -->
  <transition name="fade">
    <div v-if="toast" class="fixed left-1/2 -translate-x-1/2 bottom-28 sm:bottom-16 z-50
                            bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow">
      {{ toast }}
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch } from 'vue'

/** Props */
const props = defineProps({
  modelValue: { type: Boolean, default: false }, // control externally if needed
  preview:    { type: Boolean, default: true },
  autoStart:  { type: Boolean, default: false },
  chunkHint:  { type: Number, default: 0 },      // reserved for integrations
  attach:     { type: Function, default: null }  // (stream) => void
})
const emit = defineEmits(['update:modelValue','start','stream','stop','error'])

/** State */
const active = ref(false)
const pending = ref(false)
const withAudio = ref(false)
const streamRef = ref(null)
const videoEl = ref(null)
const toast = ref('')

/** PiP */
const pipSupported = 'requestPictureInPicture' in HTMLVideoElement.prototype
const pipOn = ref(false)
async function togglePiP(){
  try {
    if (!videoEl.value) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture(); pipOn.value = false
    } else {
      await videoEl.value.requestPictureInPicture(); pipOn.value = true
    }
  } catch (e) { notify(e.message || 'PiP not available') }
}

/** Start share */
async function startShare(){
  if (!navigator.mediaDevices?.getDisplayMedia) {
    notify('Screen share not supported on this browser')
    emit('error', new Error('getDisplayMedia unsupported')); return
  }
  try {
    pending.value = true
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: withAudio.value // Tab/system audio (browser-dependent)
    })
    streamRef.value = stream
    active.value = true
    emit('start', { withAudio: withAudio.value })
    if (props.attach) props.attach(stream)
    emit('stream', stream)

    // preview
    if (videoEl.value) videoEl.value.srcObject = stream

    // stop when user stops from browser UI
    const vTrack = stream.getVideoTracks()[0]
    vTrack?.addEventListener?.('ended', () => stopShare('native'))

    vibe(10)
  } catch (e) {
    emit('error', e)
    notify(e?.name === 'NotAllowedError' ? 'Permission denied' : 'Failed to start share')
  } finally {
    pending.value = false
  }
}

/** Stop share */
function stopShare(reason='manual'){
  try {
    streamRef.value?.getTracks?.().forEach(t => t.stop())
  } catch {}
  streamRef.value = null
  active.value = false
  emit('stop', { reason })
  emit('update:modelValue', false)
  pipOn.value = false
  vibe(6)
}

/** Switch source */
async function switchShare(){
  if (!active.value) return startShare()
  try {
    const newStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 }, audio: withAudio.value
    })
    // Stop old
    try { streamRef.value?.getTracks?.().forEach(t => t.stop()) } catch {}
    streamRef.value = newStream
    if (videoEl.value) videoEl.value.srcObject = newStream
    if (props.attach) props.attach(newStream)
    emit('stream', newStream)
    notify('✅ Source switched')
  } catch (e) {
    emit('error', e)
    notify('Switch canceled')
  }
}

/** v-model sync */
watch(() => props.modelValue, (v) => {
  if (v && !active.value) startShare()
  if (!v && active.value) stopShare('external')
})
watch(active, v => emit('update:modelValue', v))

/** Draggable preview */
const pos = ref({ x: window.innerWidth - 160, y: window.innerHeight - 220 })
let drag = null
function onDragStart(e){ drag = { x0: e.clientX, y0: e.clientY, px: pos.value.x, py: pos.value.y } }
function onDragMove(e){
  if (!drag) return
  const nx = Math.min(window.innerWidth - 150, Math.max(10, drag.px + (e.clientX - drag.x0)))
  const ny = Math.min(window.innerHeight - 100, Math.max(10, drag.py + (e.clientY - drag.y0)))
  pos.value = { x: nx, y: ny }
}
function onDragEnd(){ drag = null }

/** Utils */
function notify(msg){ toast.value = msg; setTimeout(() => toast.value = '', 1800) }
function vibe(ms){ try { navigator.vibrate?.(ms) } catch {} }

/** Cleanup */
onBeforeUnmount(() => stopShare('unmount'))

/** Safe-area for iOS */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }
/* small breakpoint helper (>=360px) */
@media (min-width: 360px) { .xs\:flex { display: flex } }
</style>
