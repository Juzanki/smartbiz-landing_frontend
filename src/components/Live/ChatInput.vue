<!-- src/components/Live/ChatInput.vue -->
<template>
  <div
    class="w-full bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-2 sm:p-3 shadow-lg"
    :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px))' }"
  >
    <!-- Smart Replies -->
    <div v-if="suggestions?.length" class="mb-2 flex flex-wrap gap-2">
      <button
        v-for="(s,i) in (suggestions || []).slice(0,6)"
        :key="i" type="button"
        class="px-3 py-1 rounded-full text-xs sm:text-sm bg-white/10 text-white hover:bg-white/20 active:scale-95"
        @click="quickReply(s)"
      >{{ s }}</button>
    </div>

    <form class="flex items-end gap-2" @submit.prevent="onSend">
      <!-- Attach + Emoji -->
      <div class="flex items-center gap-1 sm:gap-2">
        <button type="button" class="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-lg" @click="openPicker">📎</button>
        <input ref="fileInput" type="file" class="hidden" :accept="accept" multiple capture="environment" @change="onFilesPicked" />
        <button type="button" class="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-lg" @click="toggleEmoji">😊</button>
      </div>

      <!-- Textarea -->
      <div class="relative flex-1">
        <textarea
          ref="ta"
          v-model="inner"
          :placeholder="placeholder"
          :disabled="disabled || sending"
          class="w-full resize-none leading-relaxed px-3 py-2 rounded-xl bg-white/10 text-white placeholder:text-white/50 outline-none border border-white/10 focus:border-cyan-400 min-h-[42px] sm:min-h-[46px]"
          rows="1" :maxlength="maxLength"
          @keydown.enter.exact.prevent="onSend"
          @keydown.shift.enter.exact.stop
          @input="autoSize"
          @paste="onPaste"
        />
        <div v-if="showCounter" class="absolute -bottom-5 right-2 text-[10px] text-white/60">
          {{ inner.length }}/{{ maxLength }}
        </div>
      </div>

      <!-- Send -->
      <button
        type="submit"
        class="h-10 sm:h-11 px-4 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="disabled || sending || !canSend"
      >
        <span v-if="!sending">Send</span>
        <span v-else class="animate-pulse">Sending…</span>
      </button>
    </form>

    <!-- Emoji Panel -->
    <div v-if="showEmoji" class="mt-2 p-2 rounded-xl bg-black/40 border border-white/10 grid grid-cols-8 sm:grid-cols-10 gap-2 text-xl">
      <button v-for="(e,i) in emojiList" :key="i" type="button" class="h-10 w-10 rounded-lg hover:bg-white/10 active:scale-95" @click="appendEmoji(e)">{{ e }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

/* Props (incl. v-model) */
const props = defineProps({
  modelValue: { type: String, default: '' },           // for v-model
  placeholder: { type: String, default: 'Type a message…' },
  disabled: { type: Boolean, default: false },
  maxLength: { type: Number, default: 500 },
  suggestions: { type: Array, default: () => [] },
  accept: { type: String, default: 'image/*,video/*' },
})
const emit = defineEmits(['update:modelValue','send','attach','typing'])

/* State */
const inner = ref(props.modelValue)
watch(() => props.modelValue, v => { if (v !== inner.value) inner.value = v })
watch(inner, v => emit('update:modelValue', v))

const sending = ref(false)
const showEmoji = ref(false)
const fileInput = ref(null)
const ta = ref(null)

const emojiList = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤗','🤔','🙏','👍','👏','🔥','✨','✅','💯','🫶','🎉','🥳','💡','📌','🕒','💬','📷','🎥','🛒','💎']

/* Computeds */
const canSend = computed(() => inner.value.trim().length > 0)
const showCounter = computed(() => props.maxLength - inner.value.length <= 50)

/* Typing indicator (debounced) */
let tmr = null
watch(inner, () => {
  if (tmr) clearTimeout(tmr)
  emit('typing', true)
  tmr = setTimeout(() => emit('typing', false), 1200)
})

/* Methods */
function toggleEmoji(){ showEmoji.value = !showEmoji.value }
function appendEmoji(e){ inner.value += e; nextTick(autoSize) }
function quickReply(s){ inner.value = (inner.value ? inner.value + ' ' : '') + s; nextTick(autoSize) }
function openPicker(){ fileInput.value?.click() }
function onFilesPicked(e){
  const files = Array.from(e.target.files || [])
  if (files.length) emit('attach', files)
  e.target.value = ''
}
function onPaste(e){
  const items = e.clipboardData?.items; if (!items) return
  const files = []
  for (const it of items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f) }
  if (files.length) emit('attach', files)
}
async function onSend(){
  const msg = inner.value.trim()
  if (!msg || sending.value) return
  sending.value = true
  try {
    emit('send', { text: msg })
    inner.value = ''
    await nextTick(); autoSize()
  } finally { sending.value = false }
}

/* Autosize */
function autoSize(){
  const el = ta.value; if (!el) return
  el.style.height = 'auto'
  const maxRows = window.innerWidth < 640 ? 5 : 8
  const line = parseFloat(getComputedStyle(el).lineHeight || '20')
  el.style.height = Math.min(el.scrollHeight, maxRows * line + 12) + 'px'
}
onMounted(autoSize)
</script>

<style scoped>
button { touch-action: manipulation; }
</style>
