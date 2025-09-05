<!-- 📁 src/components/MobileBottomBarPro.vue -->
<template>
  <div
    class="fixed inset-x-0 bottom-0 z-40 bg-black/40 backdrop-blur-md px-2 pt-2 pb-2 flex flex-col gap-2"
    :style="safeArea"
    role="group"
    aria-label="Mobile bottom bar"
  >
    <!-- 🌐 Offline pill -->
    <transition name="fade">
      <div v-if="!online" class="mx-auto text-[11px] px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-100 border border-amber-400/40">
        ⚠️ Offline — messages will queue
      </div>
    </transition>

    <!-- 💬 Smart Replies -->
    <div>
      <div class="flex items-center gap-2">
        <button
          @click="toggleReplies"
          class="text-white text-xs bg-yellow-500/80 px-3 py-1 rounded-full shadow hover:bg-yellow-500 active:scale-[.98]"
          :aria-expanded="showSmartReplies"
        >
          💬 Smart Replies
        </button>
        <button
          v-if="showSmartReplies"
          @click="$emit('refresh-replies')"
          class="text-white/80 text-[11px] px-2 py-1 rounded-full border border-white/20 hover:bg-white/10"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <transition name="fade">
        <div
          v-if="showSmartReplies && replies?.length"
          class="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide"
        >
          <button
            v-for="(reply, i) in replies"
            :key="i"
            @click="quickSend(reply)"
            class="bg-white/20 text-white px-3 py-1 rounded-full text-xs shadow hover:bg-white/30 active:scale-[.98]"
          >
            {{ reply }}
          </button>
        </div>
      </transition>
    </div>

    <!-- 📝 Chat Row -->
    <div class="flex items-end gap-2">
      <!-- Attach -->
      <button
        class="h-11 w-11 rounded-full grid place-items-center text-white bg-white/10 border border-white/20 active:scale-[.98]"
        @click="chooseFiles"
        :title="attCount ? attCount + ' file(s) selected' : 'Attach'"
        aria-label="Attach file"
      >
        <i class="i-tabler-paperclip text-lg"></i>
      </button>
      <input ref="fileEl" type="file" class="hidden" multiple @change="onFiles" accept="image/*,video/*,audio/*,.pdf" />

      <!-- Textarea -->
      <div class="flex-1 min-w-0">
        <div class="relative">
          <textarea
            ref="ta"
            v-model="internal"
            :placeholder="placeholder"
            class="w-full max-h-32 h-11 leading-[1.25] px-4 py-2 pr-12 rounded-full bg-black/55 text-white text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            :maxlength="maxLength"
            rows="1"
            @input="autoGrow"
            @keydown.enter.exact.prevent="trySend"
            @keydown.enter.shift.stop
          ></textarea>

          <!-- Char counter -->
          <span class="absolute right-11 top-1/2 -translate-y-1/2 text-[10px] text-white/50">
            {{ remaining }}
          </span>

          <!-- Emoji -->
          <button
            class="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-full text-white/90 hover:bg-white/10"
            @click="toggleEmoji"
            aria-label="Emoji"
            title="Emoji"
          >
            😊
          </button>

          <!-- Tiny emoji grid -->
          <transition name="fade">
            <div
              v-if="showEmoji"
              class="absolute bottom-full mb-2 right-0 grid grid-cols-6 gap-1 p-2 rounded-xl bg-black/70 border border-white/15 backdrop-blur"
            >
              <button
                v-for="e in emojis"
                :key="e"
                class="h-8 w-8 grid place-items-center rounded hover:bg-white/10"
                @click="addEmoji(e)"
              >{{ e }}</button>
            </div>
          </transition>
        </div>
      </div>

      <!-- Mic / Send -->
      <div class="flex items-center gap-2">
        <!-- Mic (PTT long-press) shows when empty -->
        <button
          v-if="!canSend"
          ref="micBtn"
          class="h-11 w-11 rounded-full grid place-items-center text-white bg-white/10 border border-white/20 relative overflow-hidden active:scale-[.98]"
          @pointerdown="startPTT"
          @pointerup="stopPTT"
          @pointercancel="cancelPTT"
          aria-label="Hold to talk"
          title="Hold to talk"
        >
          <span class="absolute inset-0 rounded-full" :style="{ boxShadow: micShadow }"></span>
          <span class="relative">{{ recording ? '⏺️' : '🎙️' }}</span>
        </button>

        <!-- Send button -->
        <button
          v-else
          @click="trySend"
          class="h-11 px-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm shadow active:scale-[.98]"
          :disabled="sending || !online"
        >
          <span v-if="!sending">Send</span>
          <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Sending</span>
        </button>
      </div>
    </div>

    <!-- ⚡ Bottom Action Bar -->
    <div class="flex items-center gap-4 overflow-x-auto pt-1">
      <button
        v-for="(btn, index) in actionsComputed"
        :key="index"
        @click="$emit('action', btn)"
        class="relative flex flex-col items-center text-white text-[11px] min-w-[56px] active:scale-[.98]"
      >
        <i :class="btn.icon + ' text-lg'"></i>
        <span class="mt-0.5">{{ btn.label }}</span>
        <span v-if="btn.dot" class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-ping"></span>
        <span v-if="btn.badge" class="absolute -top-1 right-2 text-[9px] bg-amber-400 text-black px-1 rounded-full border border-black/10">{{ btn.badge }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

/* PROPS */
const props = defineProps({
  modelValue: { type: String, default: '' },
  replies: { type: Array, default: () => ['Welcome to the stream!','Thanks for your support ❤️','We love your energy!','🔥🔥🔥'] },
  placeholder: { type: String, default: 'Type a short message…' },
  actions: {
    type: Array,
    default: () => ([
      { label: '+Hosts',    icon: 'i-tabler-user-plus' },
      { label: '+Guests',   icon: 'i-tabler-users-group' },
      { label: 'Share',     icon: 'i-tabler-share' },
      { label: 'Gifts',     icon: 'i-tabler-gift' },
      { label: 'SuperChat', icon: 'i-tabler-message-2-star', badge: 'New' },
      { label: 'More',      icon: 'i-tabler-dots-circle-horizontal' },
    ])
  },
  maxLength: { type: Number, default: 280 }
})

/* EMITS */
const emit = defineEmits(['update:modelValue','send','action','attach','voice','refresh-replies'])

/* SAFE-AREA */
const safeArea = { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }

/* STATE */
const showSmartReplies = ref(false)
const internal = ref(props.modelValue)
watch(() => props.modelValue, v => { if (v !== internal.value) internal.value = v })
watch(internal, v => emit('update:modelValue', v))

const sending = ref(false)
const online = ref(navigator.onLine)
const attCount = ref(0)

const fileEl = ref(null)
const ta = ref(null)

/* Smart replies toggle */
function toggleReplies(){ showSmartReplies.value = !showSmartReplies.value; vibrate(8) }
function quickSend(text){ internal.value = text; trySend() }

/* Textarea auto-grow */
function autoGrow(){
  const el = ta.value; if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(160, el.scrollHeight) + 'px'
}

/* Emoji picker (tiny) */
const showEmoji = ref(false)
const emojis = ['😊','😂','🔥','👏','❤️','💯','🎉','🙌','🤝','⭐','✨','⚡','😎','👍','💡','🎁']
function toggleEmoji(){ showEmoji.value = !showEmoji.value }
function addEmoji(e){ internal.value += e; showEmoji.value = false; nextTick(autoGrow) }

/* Send */
const canSend = computed(() => internal.value.trim().length > 0)
const remaining = computed(() => props.maxLength - (internal.value?.length || 0))
async function trySend(){
  if (!canSend.value || sending.value) return
  sending.value = true
  const msg = internal.value.trim().slice(0, props.maxLength)
  emit('send', msg)
  vibrate(12)
  // simulate async success hook; caller can also reset via v-model
  internal.value = ''
  await nextTick(); autoGrow()
  sending.value = false
}

/* Files */
function chooseFiles(){ fileEl.value?.click?.() }
function onFiles(e){
  const files = Array.from(e.target.files || [])
  attCount.value = files.length
  if (files.length) emit('attach', files)
  e.target.value = '' // reset
}

/* Actions */
const actionsComputed = computed(() => props.actions || [])

/* Network */
function onNet(){ online.value = navigator.onLine }
onMounted(() => { window.addEventListener('online', onNet); window.addEventListener('offline', onNet); nextTick(autoGrow) })
onBeforeUnmount(() => { window.removeEventListener('online', onNet); window.removeEventListener('offline', onNet) })

/* Haptics */
function vibrate(ms=10){ try { navigator.vibrate?.(ms) } catch {} }

/* Push-to-talk (long press mic) */
const recording = ref(false)
const micBtn = ref(null)
let mediaRec = null
let recChunks = []
let recStream = null
let rafId = null
const level = ref(0)
const micShadow = computed(() => `0 0 0 ${6 + 12*level.value}px rgba(16,185,129,${0.25 + 0.35*level.value})`)

async function startPTT(e){
  if (recording.value) return
  vibrate(12)
  recording.value = true
  recChunks = []
  try {
    recStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:1 }
    })
    mediaRec = new MediaRecorder(recStream, { mimeType: 'audio/webm' })
    mediaRec.ondataavailable = (ev) => { if (ev.data?.size) recChunks.push(ev.data) }
    mediaRec.onstop = () => {
      const blob = new Blob(recChunks, { type: 'audio/webm' })
      emit('voice', blob)
      cleanupPTT()
    }
    mediaRec.start()

    // VU meter
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    const src = ac.createMediaStreamSource(recStream)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 512
    src.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let sum=0; for (let i=0;i<buf.length;i++){ const v=buf[i]; sum += v*v }
      const rms = Math.sqrt(sum/buf.length)
      level.value = Math.max(0, Math.min(1, rms*6))
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  } catch (err) {
    console.warn('Mic error', err); recording.value = false
  }
}
function stopPTT(){
  if (!recording.value) return
  recording.value = false
  try { mediaRec?.stop?.() } catch {}
}
function cancelPTT(){ stopPTT() }
function cleanupPTT(){
  try { recStream?.getTracks?.().forEach(t => t.stop()) } catch {}
  recStream = null; mediaRec = null
  if (rafId){ cancelAnimationFrame(rafId); rafId = null }
  level.value = 0
}
</script>

<style scoped>
/* Fade */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }

/* Hide scrollbar for chips row */
.scrollbar-hide::-webkit-scrollbar { display: none }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none }

/* Spinner */
.spinner {
  width: 16px; height: 16px; border-radius: 9999px;
  border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
</style>
