<!-- 📁 src/components/SmartAssistantPro.vue -->
<template>
  <div class="relative min-h-screen flex flex-col bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100">
    <!-- Top Bar -->
    <header class="sticky top-0 z-30 px-4 py-3 flex items-center justify-between bg-white/80 dark:bg-[#121212]/80 backdrop-blur border-b border-black/10 dark:border-white/10">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 grid place-items-center shadow">
          🤖
        </div>
        <div class="leading-tight">
          <h2 class="text-base font-extrabold">SmartAssistant</h2>
          <div class="flex items-center gap-2 text-xs">
            <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                           online ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500']">
              <span class="w-1.5 h-1.5 rounded-full" :class="online ? 'bg-emerald-500' : 'bg-rose-500'"></span>
              {{ online ? 'Online' : 'Offline' }}
            </span>
            <span class="text-[11px] opacity-70">Mobile-first</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn-soft h-9 px-3" @click="ttsEnabled = !ttsEnabled" :aria-pressed="ttsEnabled" title="Read replies">
          🔈 <span class="ml-1 text-xs">{{ ttsEnabled ? 'On' : 'Off' }}</span>
        </button>
        <button class="btn-soft h-9 px-3 md:hidden" @click="showTools = !showTools" aria-controls="tools" :aria-expanded="showTools">
          ⚡ Tools
        </button>
      </div>
    </header>

    <!-- Suggestions (chips) -->
    <section class="px-4 pt-3">
      <div class="flex gap-2 overflow-x-auto no-scrollbar">
        <button v-for="(s,i) in suggestions" :key="i" class="chip" @click="useSuggestion(s)">
          {{ s }}
        </button>
      </div>
    </section>

    <!-- Messages -->
    <main ref="listRef" class="flex-1 px-3 pb-40 pt-3 overflow-y-auto">
      <ul class="space-y-3">
        <li v-for="m in messages" :key="m.id" class="flex" :class="m.role==='user' ? 'justify-end' : 'justify-start'">
          <div
            class="max-w-[80%] rounded-2xl px-3 py-2 shadow text-sm leading-relaxed"
            :class="m.role==='user' ? 'bg-yellow-400 text-black rounded-tr-sm' : 'bg-black/5 dark:bg-white/10 rounded-tl-sm'"
          >
            <p v-html="formatText(m.text)"></p>
            <div v-if="m.streaming" class="flex gap-1 mt-1">
              <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
            </div>
            <div class="mt-1 text-[10px] opacity-60 flex items-center gap-2">
              <span>{{ timeOf(m.ts) }}</span>
              <button class="underline" @click="copy(m.text)">Copy</button>
            </div>
          </div>
        </li>
      </ul>
    </main>

    <!-- Attachments preview -->
    <transition name="fade">
      <div v-if="attachments.length" class="fixed left-0 right-0 bottom-28 px-4">
        <div class="flex gap-2 overflow-x-auto no-scrollbar">
          <div v-for="(a,idx) in attachments" :key="idx" class="px-2 py-1 bg-black/5 dark:bg-white/10 rounded-lg text-xs flex items-center gap-2">
            <span>📎 {{ a.name }}</span>
            <button class="text-rose-500" @click="removeAttachment(idx)">✖</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Tools drawer -->
    <transition name="slide-up">
      <section
        v-if="showTools"
        id="tools"
        class="fixed bottom-20 left-0 right-0 z-30 mx-3 p-3 rounded-2xl bg-white/95 dark:bg-[#1b1b1b]/95 border border-black/10 dark:border-white/10 shadow-2xl"
      >
        <h3 class="text-xs font-bold mb-2 opacity-70">Quick Tools</h3>
        <div class="grid grid-cols-4 gap-2 text-sm">
          <button class="tool" @click="fill('/orders today')">📦 Orders</button>
          <button class="tool" @click="fill('/analytics weekly')">📊 Analytics</button>
          <button class="tool" @click="fill('/pricing help')">💵 Pricing</button>
          <button class="tool" @click="fill('/agent call')">👩🏾‍💼 Agent</button>
        </div>
      </section>
    </transition>

    <!-- Input bar -->
    <footer :style="safeBottom" class="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2 bg-gradient-to-t from-white/95 via-white/90 to-transparent dark:from-[#121212]/95 dark:via-[#121212]/90 border-t border-black/10 dark:border-white/10">
      <!-- Slash menu -->
      <transition name="fade">
        <div v-if="showSlash" class="mb-2 mx-1 p-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs shadow">
          <div class="flex gap-2 overflow-x-auto no-scrollbar">
            <button v-for="cmd in slashCommands" :key="cmd" class="chip" @click="applyCommand(cmd)">{{ cmd }}</button>
          </div>
        </div>
      </transition>

      <div class="flex items-end gap-2">
        <button class="btn-ghost h-11 w-11" @click="toggleTools" aria-label="Tools">⚡</button>

        <div class="flex-1 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1b1b1b] px-3 py-2 shadow focus-within:ring-2 focus-within:ring-yellow-400">
          <textarea
            v-model="draft"
            ref="inputRef"
            rows="1"
            @input="autogrow"
            @keydown.enter.exact.prevent="send"
            @input.passive="onDraftInput"
            class="w-full bg-transparent outline-none text-sm resize-none max-h-28"
            placeholder="Ask anything… /help"
          />
          <div class="flex items-center justify-between mt-1">
            <div class="flex items-center gap-2">
              <label class="btn-ghost h-8 w-8 cursor-pointer" title="Attach">
                📎
                <input type="file" class="hidden" multiple @change="onAttach" />
              </label>
              <button class="btn-ghost h-8 w-8" :class="listening ? 'animate-pulse' : ''"
                      @mousedown.prevent="startVoice" @mouseup.prevent="stopVoice"
                      @touchstart.prevent="startVoice" @touchend.prevent="stopVoice"
                      :title="listening ? 'Listening… release to stop' : 'Hold to talk'">
                🎙️
              </button>
            </div>
            <button class="btn-send" :disabled="!canSend" @click="send" aria-label="Send">➤</button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <transition name="fade">
        <div v-if="toast" class="absolute left-1/2 -translate-x-1/2 -top-8 bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow">
          {{ toast }}
        </div>
      </transition>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

/* ---------- connection state ---------- */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

/* ---------- messages ---------- */
const messages = reactive([])
const listRef = ref(null)
const inputRef = ref(null)

function addMessage(role, text, streaming=false){
  const m = { id: Date.now() + Math.random(), role, text, streaming, ts: new Date() }
  messages.push(m)
  nextTick(() => scrollToBottom())
  return m
}
function scrollToBottom(){
  const el = listRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

/* ---------- suggestions & slash ---------- */
const suggestions = [
  'Summarize today’s sales',
  'Create a promo caption in Swahili',
  'Draft a thank-you message',
  'Ideas: launch day live stream'
]
function useSuggestion(s){ draft.value = s; focusInput() }

const slashCommands = ['/help','/orders today','/analytics weekly','/pricing help','/translate sw']
const showSlash = computed(() => draft.value.startsWith('/'))
function applyCommand(cmd){ draft.value = cmd + ' '; focusInput() }

/* ---------- input & draft ---------- */
const DRAFT_KEY = 'sb_sa_draft_v1'
const draft = ref(localStorage.getItem(DRAFT_KEY) || '')
function onDraftInput(){ localStorage.setItem(DRAFT_KEY, draft.value) }
function focusInput(){ nextTick(() => inputRef.value?.focus?.()) }
function autogrow(e){ const el = e?.target || inputRef.value; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px' }

/* ---------- attachments ---------- */
const attachments = reactive([])
function onAttach(e){
  const files = Array.from(e.target.files || [])
  files.forEach(f => attachments.push({ name: f.name, file: f }))
  e.target.value = ''
}
function removeAttachment(i){ attachments.splice(i,1) }

/* ---------- voice (Web Speech API) ---------- */
const listening = ref(false)
let recognition = null
const canSpeech = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

if (canSpeech){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SR()
  recognition.lang = 'en-US'
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  recognition.onresult = (e) => {
    let final = ''
    for (let i=0; i<e.results.length; i++){
      const res = e.results[i]
      if (res.isFinal) final += res[0].transcript
    }
    if (final) draft.value = (draft.value ? draft.value + ' ' : '') + final
  }
  recognition.onend = () => { listening.value = false }
}
function startVoice(){
  if (!canSpeech){ toastMsg('Voice not supported'); return }
  try { recognition.start(); listening.value = true; navigator.vibrate?.(8) } catch {}
}
function stopVoice(){ if (listening.value){ try { recognition.stop() } catch {} } }

/* ---------- send & fake streaming ---------- */
const ttsEnabled = ref(false)
const canSend = computed(() => draft.value.trim().length || attachments.length)

function send(){
  if (!canSend.value) return
  const text = draft.value.trim()
  addMessage('user', text)
  draft.value = ''
  localStorage.setItem(DRAFT_KEY, '')
  if (attachments.length){ attachments.splice(0) }

  // Placeholder: call your backend here and stream chunks back
  const a = addMessage('assistant', '', true)
  simulateStream(a, replyFor(text))
}

function simulateStream(msg, full){
  let i = 0
  const timer = setInterval(() => {
    msg.text += full.slice(i, i+Math.max(2, Math.floor(Math.random()*6)))
    i += 4
    if (i >= full.length){
      clearInterval(timer)
      msg.streaming = false
      if (ttsEnabled.value) speak(msg.text)
    }
    scrollToBottom()
  }, 30)
}

function replyFor(text){
  // Very simple placeholder; replace with real API result
  if (text.startsWith('/help')){
    return `Here are a few things I can do:
• /orders today — summarize today’s orders
• /analytics weekly — weekly KPIs
• /pricing help — suggest pricing strategy
• /translate sw — translate to Kiswahili

Ask me anything else too.`
  }
  if (/swahili|kiswahili/i.test(text)){
    return 'Habari! Naweza kutafsiri, kuandika miswada ya matangazo, na kutoa ripoti za mauzo papo hapo.'
  }
  return `Got it! I’ll process: “${text}”.
In a real integration I’d call your SmartBiz backend, analyze data, then return insights with next steps.`
}

/* ---------- TTS ---------- */
function speak(t){
  try{
    const u = new SpeechSynthesisUtterance(t)
    u.rate = 1
    u.pitch = 1
    speechSynthesis.speak(u)
  }catch{}
}

/* ---------- tools ---------- */
const showTools = ref(false)
function toggleTools(){ showTools.value = !showTools.value }
function fill(text){ draft.value = text; showTools.value = false; focusInput() }

/* ---------- utils ---------- */
const toast = ref('')
function toastMsg(m){ toast.value = m; setTimeout(() => toast.value = '', 1500) }
function copy(t){
  try{ navigator.clipboard.writeText(t); toastMsg('Copied') }catch{ toastMsg('Copy failed') }
}
function timeOf(ts){ return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) }
function formatText(t){ return (t || '').replace(/\n/g,'<br>') }

/* ---------- lifecycle ---------- */
onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
/* Buttons */
.btn-soft{ @apply rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-sm; }
.btn-ghost{ @apply rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/10; }
.btn-send{ @apply h-10 w-10 rounded-full bg-yellow-400 text-black font-bold shadow hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed; }

/* Chips & tools */
.chip{ @apply px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs hover:bg-black/10 dark:hover:bg-white/15 whitespace-nowrap; }
.tool{ @apply rounded-xl px-2 py-3 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-center; }

/* Animations */
.no-scrollbar::-webkit-scrollbar{ display:none }
.typing-dot{ width:4px; height:4px; background:currentColor; border-radius:9999px; animation: bounce .9s infinite; opacity:.8 }
.typing-dot:nth-child(2){ animation-delay:.15s }
.typing-dot:nth-child(3){ animation-delay:.3s }
@keyframes bounce{ 0%,80%,100%{ transform: translateY(0) } 40%{ transform: translateY(-4px) } }

.fade-enter-active,.fade-leave-active{ transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
.slide-up-enter-active,.slide-up-leave-active{ transition: transform .22s ease, opacity .18s ease }
.slide-up-enter-from,.slide-up-leave-to{ transform: translateY(12px); opacity:0 }
</style>
