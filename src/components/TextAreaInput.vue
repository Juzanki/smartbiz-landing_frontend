<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" :for="cid" class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
      {{ label }} <span v-if="required" class="text-rose-500">*</span>
    </label>

    <!-- Field -->
    <div class="relative">
      <textarea
        :id="cid"
        v-model="inner"
        :placeholder="placeholder"
        :rows="rowsToUse"
        :maxlength="maxlength || null"
        :disabled="disabled"
        :readonly="readonly"
        :enterkeyhint="enterkeyhint"
        :autocapitalize="autocapitalize"
        :autocorrect="autocorrect ? 'on' : 'off'"
        :spellcheck="spellcheck"
        :aria-invalid="Boolean(error)"
        :aria-describedby="descId"
        class="w-full px-4 py-3 rounded-xl border text-sm
               bg-white dark:bg-gray-900
               border-gray-300 dark:border-gray-700
               text-gray-900 dark:text-gray-100
               placeholder:text-gray-400 dark:placeholder:text-gray-500
               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
               disabled:opacity-60 disabled:cursor-not-allowed"
        @input="onInput"
        @focus="$emit('focus')"
        @blur="onBlur"
        ref="taRef"
        required="required"
      ></textarea>

      <!-- Toolbar (mobile friendly) -->
      <div class="absolute right-2 bottom-2 flex items-center gap-1">
        <button
          v-if="showMic && isSpeechSupported"
          type="button"
          class="h-8 w-8 grid place-items-center rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-xs"
          :title="listening ? 'Stop dictation' : 'Voice dictation'"
          @click="toggleVoice"
        >🎙</button>

        <button
          v-if="showClear && inner"
          type="button"
          class="h-8 px-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-xs"
          title="Clear"
          @click="clearText"
        >✖</button>
      </div>
    </div>

    <!-- Helper / Error + Counter -->
    <div class="mt-1 flex items-center gap-2">
      <p
        v-if="error"
        :id="descId"
        class="text-xs text-rose-600"
      >{{ error }}</p>
      <p
        v-else-if="helper"
        :id="descId"
        class="text-xs text-gray-500 dark:text-gray-400"
      >{{ helper }}</p>

      <span class="ml-auto text-[11px] tabular-nums"
            v-if="showCounter && maxlength">
        {{ inner.length }}/{{ maxlength }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

/* Props */
const props = defineProps({
  label: String,
  placeholder: String,
  modelValue: { type: String, default: '' },
  rows: { type: Number, default: 4 },
  rowsMobile: { type: Number, default: 3 },
  minRows: { type: Number, default: 2 },
  maxRows: { type: Number, default: 12 },
  maxlength: Number,
  helper: String,
  error: String,
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  showCounter: { type: Boolean, default: true },
  showClear: { type: Boolean, default: true },
  autoResize: { type: Boolean, default: true },
  debounceMs: { type: Number, default: 600 },     // autosave debounce
  id: String,
  enterkeyhint: { type: String, default: 'done' },
  autocapitalize: { type: String, default: 'sentences' },
  autocorrect: { type: Boolean, default: true },
  spellcheck: { type: Boolean, default: true },
  showMic: { type: Boolean, default: false }      // Web Speech (optional)
})
const emit = defineEmits(['update:modelValue', 'autosave', 'focus', 'blur'])

/* IDs & State */
const cid = props.id || `ta-${Math.random().toString(36).slice(2, 9)}`
const descId = `desc-${cid}`
const taRef = ref(null)

const inner = ref(props.modelValue ?? '')

/* v-model sync */
watch(() => props.modelValue, v => { if (v !== inner.value) inner.value = v ?? '' })

/* Responsive rows */
const rowsToUse = computed(() => {
  const mql = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)')
  return mql && mql.matches ? props.rowsMobile : props.rows
})

/* Auto-resize */
function autosize() {
  if (!props.autoResize || !taRef.value) return
  const el = taRef.value
  const style = getComputedStyle(el)
  const lh = parseFloat(style.lineHeight) || 20
  el.style.height = 'auto'
  const rowsFromScroll = Math.ceil(el.scrollHeight / lh)
  const clampedRows = Math.max(props.minRows, Math.min(props.maxRows, rowsFromScroll))
  el.style.height = `${clampedRows * lh}px`
}
const onInput = () => {
  emit('update:modelValue', inner.value)
  nextTick(autosize)
  scheduleAutosave()
}
function onBlur() {
  emit('blur')
  // fire autosave on blur too
  emit('autosave', inner.value)
}

/* Debounced autosave */
let t = null
function scheduleAutosave() {
  clearTimeout(t)
  t = setTimeout(() => emit('autosave', inner.value), props.debounceMs)
}

/* Clear */
function clearText() {
  inner.value = ''
  emit('update:modelValue', '')
  nextTick(autosize)
}

/* Voice dictation (optional, best-effort) */
const isSpeechSupported = typeof window !== 'undefined' &&
  ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
let rec = null
const listening = ref(false)
function initSpeech() {
  if (!isSpeechSupported) return
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  rec = new SR()
  rec.lang = 'en-US'
  rec.interimResults = true
  rec.continuous = false
  rec.onresult = (e) => {
    let txt = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      txt += e.results[i][0].transcript
    }
    inner.value = (inner.value + ' ' + txt).trim()
    emit('update:modelValue', inner.value)
  }
  rec.onend = () => { listening.value = false }
}
function toggleVoice() {
  if (!isSpeechSupported) return
  if (!rec) initSpeech()
  if (listening.value) { rec?.stop(); listening.value = false }
  else { rec?.start(); listening.value = true; try { navigator.vibrate?.(8) } catch {} }
}

/* Lifecycle */
onMounted(() => { nextTick(autosize) })
onBeforeUnmount(() => { clearTimeout(t); try { rec?.stop?.() } catch {} })
</script>
