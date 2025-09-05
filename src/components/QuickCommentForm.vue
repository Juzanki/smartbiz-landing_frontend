<!-- 📁 src/components/QuickCommentFormPro.vue -->
<template>
  <form
    @submit.prevent="handleSend"
    :class="containerClass"
    :style="safeArea"
    aria-label="Quick comment form"
  >
    <div class="max-w-xl w-full mx-auto rounded-2xl bg-white/85 dark:bg-black/60 backdrop-blur border border-black/10 dark:border-white/10 p-2 shadow-lg">
      <!-- Smart replies -->
      <transition name="fade">
        <div v-if="suggestions?.length" class="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
          <button
            v-for="(s,i) in suggestions"
            :key="i"
            type="button"
            class="chip"
            @click="applySuggestion(s)"
          >{{ s }}</button>
        </div>
      </transition>

      <!-- Input row -->
      <div class="flex items-end gap-2">
        <!-- Textarea -->
        <div class="flex-1">
          <label :for="ids.ta" class="sr-only">Comment</label>
          <textarea
            :id="ids.ta"
            ref="taRef"
            v-model="text"
            :placeholder="placeholder"
            class="input min-h-[44px] resize-none"
            :rows="minRows"
            :aria-invalid="overLimit ? 'true' : 'false'"
            @input="onInput"
            @keydown="onKeydown"
          />
          <!-- Counter -->
          <div class="mt-1 flex items-center justify-between text-[11px]">
            <span class="text-slate-500 dark:text-slate-400">
              Press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> to send
            </span>
            <span :class="['font-semibold', overLimit ? 'text-rose-600' : remain < 25 ? 'text-amber-600' : 'text-slate-500']">
              {{ remain }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <button v-if="canAttach" type="button" class="icon" title="Attach image" @click="fileEl?.click()">🖼️</button>
          <input ref="fileEl" type="file" accept="image/*" class="hidden" multiple @change="onPick" />
          <button type="button" class="icon" title="Emoji" @click="insertEmoji('😊')">😊</button>
          <button
            type="submit"
            class="btn-primary h-[44px] px-4"
            :disabled="disabled"
          >
            <span v-if="!sending">Send</span>
            <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Sending…</span>
          </button>
        </div>
      </div>

      <!-- Attachments preview -->
      <transition name="fade">
        <div v-if="images.length" class="mt-2 grid grid-cols-4 gap-2">
          <div v-for="img in images" :key="img.id" class="relative group">
            <img :src="img.url" alt="" class="h-20 w-full object-cover rounded-lg border border-black/10 dark:border-white/10" />
            <button type="button" class="abs-del" @click="removeImg(img.id)" aria-label="Remove image">✖</button>
          </div>
        </div>
      </transition>

      <!-- Status -->
      <transition name="fade">
        <p v-if="queued" class="mt-2 text-[12px] rounded-lg px-3 py-2 bg-amber-500/15 text-amber-800 dark:text-amber-100 border border-amber-500/30">
          ⚠️ You’re offline — comment queued and will sync later.
        </p>
      </transition>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

/** Props */
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Write a comment…' },
  maxLen: { type: Number, default: 280 },
  minRows: { type: Number, default: 1 },
  maxRows: { type: Number, default: 6 },
  fixed: { type: Boolean, default: true },             // fixed at bottom like a mobile bar
  canAttach: { type: Boolean, default: true },
  draftKey: { type: String, default: '' },             // if set, autosave draft to localStorage
  suggestions: { type: Array, default: () => ['🔥 Awesome!', '👏 Great point!', 'Thanks for sharing!', 'Love this ❤️'] },
  queueOffline: { type: Boolean, default: true },      // queue sends while offline
  minIntervalMs: { type: Number, default: 2000 },      // rate-limit between sends
  autofocus: { type: Boolean, default: false }
})

/** Emits */
const emit = defineEmits(['update:modelValue', 'submit', 'typing', 'attach'])

/** Refs & state */
const taRef = ref(null)
const fileEl = ref(null)
const text = ref(props.modelValue || '')
const images = ref([]) // [{id,url}]
const sending = ref(false)
const queued = ref(false)
const lastSentAt = ref(0)

/** Safe-area for phones with notch */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** Classes */
const containerClass = computed(() =>
  props.fixed
    ? 'fixed left-0 right-0 bottom-0 z-40 px-3 pb-3'
    : 'w-full'
)

/** Derived */
const length = computed(() => (text.value || '').length)
const remain = computed(() => props.maxLen - length.value)
const overLimit = computed(() => remain.value < 0)
const disabled = computed(() =>
  sending.value || overLimit.value || !text.value.trim() || Date.now() - lastSentAt.value < props.minIntervalMs
)

/** Sync v-model */
watch(() => props.modelValue, v => { if (v !== text.value) text.value = v })
watch(text, v => {
  emit('update:modelValue', v)
  emit('typing', v)
  autosize()
  if (props.draftKey) {
    localStorage.setItem(`qc_draft:${props.draftKey}`, JSON.stringify({ t: Date.now(), text: v, images: images.value }))
  }
})

/** Autosize textarea */
function autosize() {
  const el = taRef.value
  if (!el) return
  el.style.height = 'auto'
  const line = 22 // approx line-height
  const max = props.maxRows * line
  el.style.height = Math.min(el.scrollHeight, max) + 'px'
}

/** Input handlers */
function onInput() { /* handled by watch(text) */ }
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSend()
}

/** Suggestions & emoji */
function applySuggestion(s) {
  text.value = text.value ? `${text.value.trim()} ${s}` : s
  nextTick(() => taRef.value?.focus())
}
function insertEmoji(emo) {
  const el = taRef.value
  const v = text.value || ''
  const start = el?.selectionStart ?? v.length
  const end   = el?.selectionEnd ?? v.length
  text.value = v.slice(0, start) + emo + v.slice(end)
  nextTick(() => {
    try { el.selectionStart = el.selectionEnd = start + emo.length } catch {}
  })
}

/** Attachments */
function onPick(e) {
  const files = Array.from(e.target.files || [])
  addFiles(files)
  e.target.value = ''
}
function addFiles(files) {
  for (const f of files.slice(0, Math.max(0, 3 - images.value.length))) {
    if (!/^image\//.test(f.type)) continue
    const id = Math.random().toString(36).slice(2, 8)
    const reader = new FileReader()
    reader.onload = () => images.value.push({ id, url: reader.result })
    reader.readAsDataURL(f)
  }
  emit('attach', images.value.map(i => i.url))
}
function removeImg(id) { images.value = images.value.filter(i => i.id !== id) }

/** Send */
async function handleSend() {
  if (disabled.value) return
  sending.value = true
  queued.value = false
  const payload = {
    text: text.value.trim(),
    images: images.value.map(i => i.url),
    createdAt: Date.now(),
    queued: false
  }

  try {
    if (!navigator.onLine && props.queueOffline) throw new Error('offline')
    // emit upstream to actually send
    emit('submit', payload)
    successReset()
  } catch (e) {
    if (String(e?.message).includes('offline') && props.queueOffline) {
      const storeKey = 'qc_queue'
      const q = JSON.parse(localStorage.getItem(storeKey) || '[]')
      q.push(payload)
      localStorage.setItem(storeKey, JSON.stringify(q))
      queued.value = true
      payload.queued = true
      emit('submit', payload) // optional optimistic emit
      successReset()
    }
  } finally {
    sending.value = false
    lastSentAt.value = Date.now()
  }
}

function successReset() {
  text.value = ''
  images.value = []
  try { navigator.vibrate?.(8) } catch {}
}

/** Restore draft and autofocus */
onMounted(async () => {
  if (props.draftKey) {
    try {
      const draft = JSON.parse(localStorage.getItem(`qc_draft:${props.draftKey}`) || 'null')
      if (draft?.text) text.value = draft.text
      if (draft?.images?.length) images.value = draft.images.map(u => ({ id: Math.random().toString(36).slice(2,8), url: u }))
    } catch {}
  }
  await nextTick()
  autosize()
  if (props.autofocus) taRef.value?.focus()
})

/** IDs for a11y */
const ids = { ta: 'qc-ta-' + Math.random().toString(36).slice(2,7) }
</script>

<style scoped>
/* Base controls */
.input { @apply w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.btn-primary { @apply rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:translate-y-[1px]; }
.icon { @apply h-11 w-11 grid place-items-center rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10; }
.chip { @apply h-8 px-3 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-white/10; }
.abs-del { @apply absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-black/60 text-white text-xs; }

/* Spinner */
.spinner { width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* Transitions & helpers */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
