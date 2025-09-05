<template>
  <!-- FULLSCREEN CHAT, NO TOP BAR -->
  <div class="chat-wrap">
    <!-- Scrollable thread -->
    <main ref="scroller" class="thread" @scroll.passive="onScroll">
      <!-- Day separators -->
      <div v-for="(group, gi) in grouped" :key="gi" class="day">
        <div class="day-pill">{{ group.day }}</div>

        <div v-for="m in group.items" :key="m.id" class="row" :class="m.sender === 'me' ? 'me' : 'them'">
          <div class="bubble">
            <p class="txt">{{ m.text }}</p>
            <div class="meta">
              <time>{{ timeOnly(m.ts) }}</time>
              <span v-if="m.sender==='me'" class="tick" :class="{ read: !!m.read }">✓✓</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="typing" class="row them">
        <div class="bubble typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>
    </main>

    <!-- Composer -->
    <footer class="composer">
      <button class="icon" @click="attach" aria-label="Attach">📎</button>
      <input
        ref="inputEl"
        v-model.trim="draft"
        :placeholder="t('type_reply','Type a reply…')"
        class="field"
        @keyup.enter="send"
      />
      <button class="send" :disabled="!draft" @click="send" aria-label="Send">➤</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

/* --------- demo data (badilisha na API) --------- */
const thread = ref([
  { id: 1,  sender: 'them', text: 'Can I get this service today?', ts: Date.now() - 1000*60*12, read:true },
  { id: 2,  sender: 'me',   text: 'Yes, we are available.',       ts: Date.now() - 1000*60*10, read:true },
])

/* --------- state --------- */
const scroller = ref(null)
const inputEl  = ref(null)
const draft    = ref('')
const typing   = ref(false)

/* --------- helpers --------- */
function t(key, fallback){ try{ return (/** @type any */(getCurrentInstance()?.proxy))?.$t?.(key) ?? fallback }catch{ return fallback } } // optional i18n
function timeOnly(ts){ return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) }
function dayStr(ts){
  const d = new Date(ts); const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const y = new Date(today); y.setDate(today.getDate()-1)
  const isYest = d.toDateString() === y.toDateString()
  if (isToday) return 'Today'
  if (isYest)  return 'Yesterday'
  return d.toLocaleDateString()
}

/* Group messages by day for separators */
const grouped = computed(() => {
  const map = []
  let cur = null
  for (const m of thread.value) {
    const label = dayStr(m.ts)
    if (!cur || cur.day !== label) {
      cur = { day: label, items: [] }
      map.push(cur)
    }
    cur.items.push(m)
  }
  return map
})

/* --------- actions --------- */
async function send(){
  if (!draft.value) return
  const now = Date.now()
  thread.value.push({ id: now, sender:'me', text: draft.value, ts: now, read:false })
  draft.value = ''
  await nextTick(); scrollToBottom(true)

  // simulate remote typing + reply
  typing.value = true
  setTimeout(() => {
    const replyAt = Date.now()
    thread.value.push({ id: replyAt, sender:'them', text:'Got it! 👍', ts: replyAt, read:true })
    typing.value = false
    nextTick().then(() => scrollToBottom(true))
  }, 900)
}

function attach(){ alert('Attach file… (hook to media picker)') }

function scrollToBottom(force=false){
  const el = scroller.value
  if (!el) return
  const nearBottom = el.scrollTop > el.scrollHeight - el.clientHeight - 120
  if (force || nearBottom) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }
}
function onScroll(){ /* keep for read receipts / lazy load */ }

/* --------- mount --------- */
onMounted(() => {
  nextTick(() => {
    scrollToBottom(true)
    inputEl.value?.focus()
  })
})
</script>

<style scoped>
/* Layout */
.chat-wrap{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  background: radial-gradient(1200px 600px at 10% -10%, #0fd4ff22, transparent),
              radial-gradient(1000px 500px at 110% 0%, #a78bfa22, transparent),
              #0a1f44;
  color:#fff;
}

/* Thread (scroll area) */
.thread{
  flex:1 1 auto;
  overflow:auto;
  padding: 14px 14px 90px; /* leave room for composer */
  scroll-behavior:smooth;
}

/* Day separator */
.day{ margin: 6px 0 10px; }
.day-pill{
  display:inline-block;
  margin: 6px auto 12px;
  padding: 6px 10px;
  background: rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.12);
  border-radius: 999px;
  font-size: 11px; font-weight: 800;
}

/* Message rows */
.row{
  display:flex;
  margin: 6px 0;
}
.row.them{ justify-content:flex-start; }
.row.me  { justify-content:flex-end; }

/* Bubble */
.bubble{
  max-width: 80vw;
  padding: 10px 12px;
  border-radius: 14px;
  line-height: 1.35;
  word-wrap: break-word;
  box-shadow: 0 8px 22px rgba(2,6,23,.18);
  border: 1px solid rgba(255,255,255,.12);
}
.them .bubble{
  background: rgba(255,255,255,.08);
  backdrop-filter: blur(2px);
}
.me .bubble{
  background: #22d3ee; /* cyan-400 */
  color: #0a1f44;
  border-color: #8be9ff;
}

/* Text + meta */
.txt{ margin:0; }
.meta{
  display:flex; gap:8px; align-items:center; justify-content:flex-end;
  font-size: 10px; margin-top: 6px; opacity:.8;
}
.tick{ font-weight:900; opacity:.8 }
.tick.read{ color:#0f766e } /* teal when read */

/* Typing indicator */
.bubble.typing{ display:flex; gap:6px; align-items:center; }
.dot{
  width:6px; height:6px; border-radius:999px; background:#fff; opacity:.7;
  animation: b .9s infinite alternate;
}
.dot:nth-child(2){ animation-delay:.15s }
.dot:nth-child(3){ animation-delay:.3s }
@keyframes b{ from{ transform: translateY(0); opacity:.5 } to{ transform: translateY(-4px); opacity:1 } }

/* Composer */
.composer{
  position: sticky;
  bottom: 0;
  display:flex; align-items:center; gap:8px;
  padding: 10px 12px env(safe-area-inset-bottom);
  background: linear-gradient(to top, rgba(10,31,68,1), rgba(10,31,68,.9));
  border-top:1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(8px);
}
.icon{
  width:40px; height:40px; display:grid; place-items:center; border-radius:12px;
  background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); font-size:18px;
}
.field{
  flex:1 1 auto; min-height:40px; border-radius:14px; padding:10px 12px;
  background:#fff; color:#0a1f44; border:none; outline:none; font-weight:600;
}
.field::placeholder{ color:#64748b }
.send{
  height:40px; padding:0 14px; border-radius:12px; font-weight:900; letter-spacing:.3px;
  background:#22d3ee; color:#0a1f44; border:none;
  box-shadow:0 10px 22px rgba(34,211,238,.25);
}
.send:disabled{ opacity:.5 }
@media (min-width:680px){
  .bubble{ max-width: 520px; }
}
</style>
