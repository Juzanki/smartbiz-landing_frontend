<template>
  <article
    class="w-full max-w-[720px] mx-auto rounded-2xl border border-black/5 dark:border-white/10
           bg-white dark:bg-[#0c101a] text-slate-900 dark:text-white shadow-sm
           p-3 sm:p-4"
  >
    <!-- Header -->
    <header class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <div class="relative">
          <img
            v-if="message.avatar"
            :src="message.avatar"
            @error="onAvatarError"
            alt=""
            class="h-9 w-9 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
          />
          <div
            v-else
            class="h-9 w-9 grid place-items-center rounded-full bg-indigo-600 text-white text-sm font-bold"
            :title="sender"
          >
            {{ senderInitial }}
          </div>
          <span v-if="isNew" class="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0c101a]" title="New"></span>
        </div>

        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <strong class="truncate">{{ sender }}</strong>
            <span class="px-1.5 py-0.5 text-[10px] rounded-full border"
                  :class="platformBadge.class">
              {{ platformBadge.label }}
            </span>
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400">
            {{ niceTime }} <span v-if="relTime">• {{ relTime }}</span>
          </div>
        </div>
      </div>

      <!-- Row actions -->
      <div class="flex items-center gap-1">
        <button class="icon" title="Copy message" @click="copyMessage">📋</button>
        <button class="icon" title="Translate (open panel)" @click="$emit('translate', message)">🌐</button>
        <button class="icon" title="Mark resolved" @click="$emit('resolve', message)">✅</button>
      </div>
    </header>

    <!-- Body -->
    <section class="mt-3 text-[15px] leading-6 break-words">
      <p class="whitespace-pre-wrap" v-html="safeHtml"></p>
    </section>

    <!-- Quick replies (smart) -->
    <div v-if="suggestions.length" class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="(s, i) in suggestions"
        :key="i"
        class="h-8 px-3 rounded-full text-[12px] font-medium bg-black/5 dark:bg-white/10
               border border-black/10 dark:border-white/10 active:bg-black/10 dark:active:bg-white/20"
        @click="applySuggestion(s)"
      >
        {{ s }}
      </button>
    </div>

    <!-- Reply box -->
    <form class="mt-3" @submit.prevent="sendReply">
      <div
        class="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10
               focus-within:border-indigo-400 dark:focus-within:border-indigo-400 transition"
      >
        <textarea
          ref="ta"
          v-model="replyText"
          class="w-full resize-none bg-transparent outline-none text-[14px] leading-6 px-3.5 py-3"
          rows="1"
          placeholder="Type your reply…"
          :maxlength="maxLen"
          @input="autoResize"
          @keydown.enter.exact.prevent="sendReply"
          @keydown.shift.enter.prevent="newline"
          @keydown.ctrl.enter.prevent="sendReply"
          @keydown.meta.enter.prevent="sendReply"
        ></textarea>

        <div class="px-3.5 pb-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            {{ charsLeft }} chars left
            <span v-if="sending" class="ml-2 inline-flex items-center gap-1"><span class="spinner h-3 w-3"></span> Sending…</span>
            <span v-else-if="status==='sent'" class="ml-2 text-emerald-500">Sent ✓</span>
            <span v-else-if="status==='error'" class="ml-2 text-rose-500">Failed ⚠️</span>
          </span>

          <div class="flex items-center gap-2">
            <button type="button" class="chip" title="Insert greeting" @click="insert('Hi, ')">🙋‍♂️</button>
            <button type="button" class="chip" title="Attach (coming soon)" @click="$emit('attach', message)">📎</button>
            <button
              type="submit"
              class="send"
              :disabled="disabled"
              :aria-disabled="disabled"
              title="Send (Enter)"
            >
              📨 Send
            </button>
          </div>
        </div>
      </div>
    </form>

    <!-- Footer status toast -->
    <transition name="toast">
      <div
        v-if="toast"
        class="mt-2 text-[12px] px-3 py-2 rounded-xl bg-black/80 text-white text-center"
      >
        {{ toast }}
      </div>
    </transition>
  </article>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

/* PROPS */
const props = defineProps({
  message: { type: Object, required: true }, // { sender_name, platform, message, received_at, chat_id, avatar? }
  apiBase: { type: String, default: import.meta.env.VITE_API_URL || '' },
  endpoint: { type: String, default: '/send-reply' },
  tokenKey: { type: String, default: 'access_token' },
  maxLen: { type: Number, default: 1000 }
})

/* EMITS */
const emit = defineEmits(['sent', 'error', 'translate', 'resolve', 'attach'])

/* STATE */
const replyText = ref('')
const sending = ref(false)
const status = ref('')           // '', 'sent', 'error'
const toast = ref('')
const ta = ref(null)

/* DRAFT persistence per chat */
const draftKey = computed(() => `draft_${props.message?.chat_id || 'unknown'}`)
onMounted(() => {
  const saved = localStorage.getItem(draftKey.value)
  if (saved) replyText.value = saved
  autoResize()
})

watch(replyText, (v) => {
  localStorage.setItem(draftKey.value, v || '')
})

/* DERIVED */
const sender = computed(() => props.message?.sender_name || 'Unknown')
const senderInitial = computed(() => (sender.value?.[0] || '?').toUpperCase())

const platformBadge = computed(() => {
  const p = (props.message?.platform || '').toLowerCase()
  const map = {
    whatsapp: { label: 'WhatsApp', class: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/30' },
    telegram: { label: 'Telegram', class: 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-500/30' },
    messenger:{ label: 'Messenger',class: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-500/30' },
    instagram:{ label: 'Instagram',class: 'bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-200/60 dark:border-pink-500/30' },
    sms:      { label: 'SMS',      class: 'bg-zinc-50 dark:bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-500/30' },
    email:    { label: 'Email',    class: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/30' },
    default:  { label: p || 'Platform', class: 'bg-slate-50 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-white/20' }
  }
  return map[p] || map.default
})

const niceTime = computed(() => {
  try {
    const d = new Date(props.message?.received_at)
    return d.toLocaleString()
  } catch { return '' }
})
const relTime = computed(() => {
  try {
    const d = new Date(props.message?.received_at).getTime()
    const diff = Math.round((Date.now() - d) / 1000)
    if (isNaN(diff)) return ''
    if (diff < 60) return `${diff}s ago`
    const m = Math.floor(diff/60); if (m < 60) return `${m}m ago`
    const h = Math.floor(m/60); if (h < 24) return `${h}h ago`
    const day = Math.floor(h/24); return `${day}d ago`
  } catch { return '' }
})
const isNew = computed(() => {
  try {
    const d = new Date(props.message?.received_at).getTime()
    return (Date.now() - d) < 2 * 60 * 1000 // 2 minutes
  } catch { return false }
})

/* Linkify safe HTML */
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]) )}
function linkify(s){
  const urlRe = /\b((?:https?:\/\/|www\.)[^\s<]+)\b/gi
  return s.replace(urlRe, (m) => {
    const href = m.startsWith('http') ? m : `https://${m}`
    return `<a href="${href}" target="_blank" rel="noopener" class="underline decoration-dotted">${m}</a>`
  })
}
const safeHtml = computed(() => linkify(escapeHtml(props.message?.message || '')))

/* Quick reply suggestions (simple heuristics) */
const suggestions = computed(() => {
  const text = (props.message?.message || '').toLowerCase()
  const out = new Set()
  if (/\b(price|bei|how much|gharama)\b/.test(text)) out.add('The price is ...')
  if (/\b(deliver|delivery|peleka|kuleta)\b/.test(text)) out.add('We deliver. Your location?')
  if (/\b(mpesa|tigo|airtel|payment|malipo)\b/.test(text)) out.add('You can pay via M-Pesa/TigoPesa/AirtelMoney.')
  if (/\b(where|wapi|location)\b/.test(text)) out.add('We are located at ...')
  if (!out.size) ['Thanks!','On it ✅','Can we call you?','Noted 🙏'].forEach(x => out.add(x))
  return [...out].slice(0, 4)
})

/* UI helpers */
function newline(){ insert('\n') }
function insert(t){
  const el = ta.value
  const start = el.selectionStart ?? replyText.value.length
  const end = el.selectionEnd ?? replyText.value.length
  replyText.value = replyText.value.slice(0, start) + t + replyText.value.slice(end)
  nextTickResize()
}
function applySuggestion(s){
  if (!replyText.value) replyText.value = s
  else replyText.value = replyText.value.trimEnd() + (replyText.value.endsWith('\n') ? '' : ' ') + s
  haptic(10)
  nextTickResize()
}

const disabled = computed(() => sending.value || !replyText.value.trim())
const charsLeft = computed(() => props.maxLen - (replyText.value?.length || 0))

function haptic(ms=12){ try { navigator.vibrate?.(ms) } catch(_){} }

function showToast(msg){
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1800)
}

/* Avatar fallback */
function onAvatarError(e){
  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" rx="36" fill="%23636AE6"/><text x="50%" y="56%" font-size="28" text-anchor="middle" fill="white" font-family="Arial">👤</text></svg>'
}

/* Auto-resize textarea */
function autoResize(){
  const el = ta.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px' // cap for mobile
}
function nextTickResize(){ requestAnimationFrame(autoResize) }

/* SEND */
async function sendReply(){
  if (disabled.value) return
  const text = replyText.value.trim()
  if (!text) return
  sending.value = true
  status.value = ''
  haptic(15)

  try {
    const payload = {
      chat_id: props.message.chat_id,
      platform: props.message.platform,
      message: text
    }

    const headers = {}
    const tok = localStorage.getItem(props.tokenKey)
    if (tok) headers['Authorization'] = `Bearer ${tok}`

    const url = (props.apiBase || '') + props.endpoint
    const res = await axios.post(url, payload, { headers })

    status.value = 'sent'
    replyText.value = ''
    localStorage.removeItem(draftKey.value)
    emit('sent', { payload, res: res?.data })
    showToast('Sent ✓')
  } catch (err) {
    status.value = 'error'
    emit('error', err)
    showToast('Failed to send')
  } finally {
    sending.value = false
    nextTickResize()
  }
}

/* Clipboard */
async function copyMessage(){
  try {
    await navigator.clipboard?.writeText(props.message?.message || '')
    showToast('Copied to clipboard')
    haptic(8)
  } catch(_) {
    showToast('Copy not available')
  }
}
</script>

<style scoped>
.icon {
  @apply h-8 w-8 grid place-items-center rounded-full bg-black/5 dark:bg-white/10
         border border-black/10 dark:border-white/10 active:bg-black/10 dark:active:bg-white/20;
  font-size: 14px;
}
.chip {
  @apply h-8 w-8 grid place-items-center rounded-full bg-black/5 dark:bg-white/10
         border border-black/10 dark:border-white/10 active:bg-black/10 dark:active:bg-white/20;
}
.send {
  @apply h-9 px-4 rounded-full font-semibold text-white
         bg-gradient-to-b from-indigo-600 to-indigo-700
         disabled:opacity-60 disabled:cursor-not-allowed;
}
/* Spinner */
.spinner {
  box-sizing: border-box;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
  border-radius: 9999px;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

/* Toast transition */
.toast-enter-active, .toast-leave-active { transition: opacity .18s ease, transform .18s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(4px); }
</style>
