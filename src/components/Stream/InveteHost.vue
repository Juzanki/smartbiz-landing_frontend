<!-- InviteEmailMobile.vue -->
<template>
  <form
    class="w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
    @submit.prevent="onSubmit"
    novalidate
  >
    <!-- Label (visually hidden on mobile, accessible for SR) -->
    <label :for="inputId" class="sr-only">Invite by email</label>

    <!-- Input field -->
    <div
      class="flex items-center w-full rounded-2xl border bg-white dark:bg-zinc-900
             min-h-[48px] px-3 focus-within:ring-2 transition"
      :class="error
        ? 'border-rose-400 ring-rose-300'
        : 'border-zinc-300 dark:border-zinc-700 focus-within:ring-indigo-400 dark:focus-within:ring-indigo-500'"
    >
      <!-- Prefix icon -->
      <span class="mr-2 shrink-0 text-zinc-500">📧</span>

      <input
        :id="inputId"
        ref="inputRef"
        v-model.trim="local"
        type="email"
        name="invite-email"
        inputmode="email"
        autocomplete="email"
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
        :placeholder="placeholder"
        :disabled="disabled || pending"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
        enterkeyhint="send"
        class="w-full bg-transparent outline-none text-[15px] text-zinc-900 dark:text-zinc-100
               placeholder:text-zinc-400 dark:placeholder:text-zinc-500 py-2"
        @input="onInput"
        @keydown.enter.prevent="onSubmit"
        @paste="onPaste"
      />

      <!-- Clear -->
      <button
        v-if="clearable && !pending && local.length"
        type="button"
        class="ml-1 shrink-0 h-9 w-9 grid place-items-center rounded-full
               text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white
               hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition"
        aria-label="Clear email"
        @click="clear"
      >
        ×
      </button>

      <!-- Spinner -->
      <span v-if="pending" class="ml-2 shrink-0 h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"></span>
    </div>

    <!-- Suggestions (domain autocompletion) -->
    <div v-if="suggestionsToShow.length && !pending"
         class="flex flex-wrap gap-1.5 pl-1">
      <button
        v-for="dom in suggestionsToShow"
        :key="dom"
        type="button"
        class="px-2 py-1 rounded-full text-[12px] font-medium
               bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200
               hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
        @click="applyDomain(dom)"
      >
        {{ chipText(dom) }}
      </button>
    </div>

    <!-- Error / hint row -->
    <div class="flex items-center justify-between">
      <p v-if="hint && !error" :id="hintId" class="text-[12px] text-zinc-500 mt-0.5">
        {{ hint }}
      </p>
      <p v-if="error" :id="errorId" class="text-[12px] text-rose-600 mt-0.5 animate-shake">
        {{ error }}
      </p>
    </div>

    <!-- Submit button (full-width on mobile) -->
    <div class="mt-1 sm:mt-0">
      <button
        type="submit"
        class="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl font-semibold
               bg-indigo-600 text-white hover:bg-indigo-700
               disabled:opacity-50 disabled:cursor-not-allowed transition button-press"
        :disabled="disabled || pending"
        @click.prevent="onSubmit"
      >
        <span v-if="!pending">➕ Invite</span>
        <span v-else>Sending…</span>
      </button>
    </div>

    <!-- SR-only live region for announcements -->
    <span class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</span>
  </form>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

/* Props */
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Enter host email…' },
  hint: { type: String, default: 'Press Enter to send' },
  pending: { type: Boolean, default: false },   // external loading state
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  autofocus: { type: Boolean, default: false },
  domains: {
    type: Array,
    default: () => ['gmail.com','outlook.com','icloud.com','yahoo.com','hotmail.com']
  }
})

/* Emits */
const emit = defineEmits(['update:modelValue','invite','error','input'])

/* State */
const inputRef = ref(null)
const local = ref(props.modelValue || '')
const error = ref('')
const liveMessage = ref('')
const uid = Math.random().toString(36).slice(2, 8)
const inputId = `invite-${uid}`
const hintId = `hint-${uid}`
const errorId = `err-${uid}`
const describedBy = computed(() => error.value ? errorId : (props.hint ? hintId : undefined))

/* v-model sync */
watch(() => props.modelValue, v => { if (v !== local.value) local.value = v || '' })
watch(local, v => emit('update:modelValue', v))

/* Autofocus (mobile-safe) */
if (props.autofocus) {
  nextTick(() => inputRef.value?.focus?.())
}

/* Helpers */
function vibrate(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }
function cleanEmail(str){
  return (str || '')
    .replace(/\s+/g, '')         // remove spaces
    .replace(/[;,]+/g, ',')      // normalize separators if pasted list
    .toLowerCase()
}
function fixTypos(str){
  return str
    .replace('@gamil.', '@gmail.')
    .replace('@gmial.', '@gmail.')
    .replace('@hotnail.', '@hotmail.')
}
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/* Suggestions logic */
const suggestionsToShow = computed(() => {
  const val = local.value
  const at = val.indexOf('@')
  if (at === -1) return []
  const part = val.slice(at + 1).toLowerCase()
  if (!part) return props.domains
  return props.domains.filter(d => d.startsWith(part))
})
function applyDomain(domain){
  const val = local.value
  const at = val.indexOf('@')
  if (at === -1) {
    local.value = `${val}@${domain}`
  } else {
    local.value = `${val.slice(0, at + 1)}${domain}`
  }
  vibrate(8)
}

/* Chip text helper */
function chipText(d){
  const at = local.value.includes('@') ? '' : '@'
  return `${at}${d}`
}

/* Events */
function onInput(e){
  error.value = ''
  const raw = e?.target?.value ?? local.value
  const cleaned = fixTypos(cleanEmail(raw))
  if (cleaned !== raw) local.value = cleaned
  emit('input', local.value)
}
function onPaste(e){
  // Keep only first email if a list is pasted
  const txt = (e.clipboardData?.getData('text') || '').trim()
  if (txt.includes(',')) {
    e.preventDefault()
    local.value = cleanEmail(txt.split(',')[0])
  }
}

/* Submit */
function onSubmit(){
  if (props.disabled || props.pending) return
  const email = cleanEmail(local.value)
  if (!email || !emailRe.test(email)){
    error.value = 'Please enter a valid email address.'
    liveMessage.value = error.value
    vibrate(20)
    return
  }
  error.value = ''
  liveMessage.value = `Sending invite to ${email}`
  vibrate(12)
  emit('invite', email)
  // leave value as-is so parent can decide to clear; default clear here:
  local.value = ''
}

/* Clear */
function clear(){
  local.value = ''
  error.value = ''
  liveMessage.value = 'Cleared'
  vibrate(6)
}
</script>

<style scoped>
/* Tap feedback */
.button-press { transition: transform .15s ease }
.button-press:active { transform: scale(.97) }

/* Error shake */
@keyframes shake {
  10%, 90% { transform: translateX(-1px) }
  20%, 80% { transform: translateX(2px) }
  30%, 50%, 70% { transform: translateX(-4px) }
  40%, 60% { transform: translateX(4px) }
}
.animate-shake { animation: shake .35s both }

/* Reduce iOS tap highlight */
:host, input, button { -webkit-tap-highlight-color: transparent; }
</style>
