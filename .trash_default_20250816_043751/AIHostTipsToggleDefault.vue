<!-- AITipsSheetMobile.vue -->
<template>
  <!-- Floating Action Button (mobile-first) -->
  <button
    class="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-indigo-600 text-white grid place-items-center shadow-lg
           hover:bg-indigo-500 active:scale-95 transition"
    :aria-expanded="open ? 'true' : 'false'"
    aria-controls="ai-tips-sheet"
    @click="toggle()"
  >
    🤖
    <span class="sr-only">Open AI host tips</span>
  </button>

  <!-- Backdrop -->
  <div
    v-if="open"
    class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
    @click.self="close()"
  />

  <!-- Bottom Sheet -->
  <section
    v-if="open"
    id="ai-tips-sheet"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ai-tips-title"
    class="fixed inset-x-0 bottom-0 z-50 w-full max-h-[92vh] rounded-t-3xl bg-[#0b1220] text-white
           ring-1 ring-white/10 shadow-2xl animate-sheet-in
           md:inset-x-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:rounded-2xl"
    @keydown.esc="close()"
  >
    <!-- Drag handle (mobile) -->
    <div class="sm:hidden pt-2 grid place-items-center">
      <div class="h-1.5 w-12 rounded-full bg-white/20"></div>
    </div>

    <!-- Header -->
    <header class="px-4 pt-2 pb-3 flex items-center justify-between gap-3 border-b border-white/10">
      <div class="min-w-0">
        <h2 id="ai-tips-title" class="text-base font-bold text-cyan-300 truncate">
          AI Tips for Hosts
        </h2>
        <p class="text-[11px] text-white/60">Fast, actionable prompts for higher engagement</p>
      </div>
      <button
        ref="closeBtn"
        class="h-10 w-10 grid place-items-center rounded-xl bg-white/10 border border-white/15 hover:bg-white/15"
        @click="close()"
        aria-label="Close"
      >✕</button>
    </header>

    <!-- Controls -->
    <div class="px-4 py-3 space-y-3 border-b border-white/10">
      <div class="flex gap-2">
        <input
          v-model.trim="query"
          type="text"
          placeholder="Search tips (e.g., gifts, polls, hook)"
          class="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm
                 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
        />
        <button class="btn" @click="shuffle()">🔀 Shuffle</button>
      </div>

      <!-- Category chips (scrollable on mobile) -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          v-for="c in categories"
          :key="c.key"
          class="px-3 py-1.5 rounded-full text-[12px] border whitespace-nowrap transition
                 bg-white/5 border-white/10 text-white/90 hover:bg-white/10"
          :class="active.has(c.key) ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-100' : ''"
          @click="toggleCategory(c.key)"
        >
          {{ c.label }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="px-4 py-4 overflow-y-auto" :style="scrollMax">
      <!-- Tips list -->
      <div v-if="filteredTips.length" class="space-y-3">
        <article
          v-for="(t,i) in filteredTips"
          :key="t.id"
          class="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div class="flex items-start gap-3">
            <div class="text-3xl shrink-0">{{ t.icon }}</div>
            <div class="min-w-0">
              <h3 class="text-base font-semibold">{{ t.title }}</h3>
              <p class="mt-1 text-sm text-white/85 leading-relaxed">{{ t.body }}</p>
              <ul v-if="t.prompts?.length" class="mt-2 space-y-1.5">
                <li v-for="(p,j) in t.prompts" :key="j" class="flex items-start gap-2 text-[13px]">
                  <span class="mt-[2px] text-cyan-300">•</span>
                  <span class="text-white/85">{{ p }}</span>
                </li>
              </ul>

              <!-- Actions -->
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button class="btn primary" @click="copyTip(t)">📋 Copy</button>
                <button class="btn" :class="isSaved(t.id) ? 'bg-emerald-600 border-emerald-600' : ''" @click="toggleSave(t)">
                  <span v-if="!isSaved(t.id)">⭐ Save</span>
                  <span v-else>✅ Saved</span>
                </button>
                <button class="btn ghost" @click="shareTip(t)">🔗 Share</button>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="tg in t.tags"
              :key="tg"
              class="px-2 py-0.5 rounded-full text-[11px] bg-white/10 border border-white/15 text-white/70"
            >#{{ tg }}</span>
          </div>
        </article>
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-10 text-white/70">
        <div class="text-4xl">🔍</div>
        <p class="mt-2 text-sm">No tips match your filters. Try clearing search or categories.</p>
      </div>

      <!-- Saved tips (collapsible) -->
      <details v-if="saved.length" class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <summary class="cursor-pointer text-sm text-white/80">⭐ Saved ({{ saved.length }})</summary>
        <ul class="mt-2 space-y-2">
          <li v-for="s in saved" :key="s.id" class="text-[13px] flex items-start gap-2">
            <span class="text-lg">{{ s.icon }}</span>
            <div class="flex-1">
              <div class="font-semibold">{{ s.title }}</div>
              <div class="text-white/80">{{ s.body }}</div>
            </div>
            <button class="btn danger" @click="removeSaved(s.id)">✖</button>
          </li>
        </ul>
      </details>
    </div>

    <!-- Footer / Safe area -->
    <div class="px-4 py-3 border-t border-white/10 flex items-center justify-between text-[12px] text-white/70">
      <span>{{ statusText }}</span>
      <button class="btn" @click="close()">Done</button>
    </div>
    <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>

    <!-- a11y live region -->
    <span class="sr-only" role="status" aria-live="polite">{{ live }}</span>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

/* Open / close */
const open = ref(false)
const closeBtn = ref(null)
function toggle(){ open.value ? close() : openSheet() }
function openSheet(){ open.value = true; queueMicrotask(()=>closeBtn.value?.focus()); vibrate(8) }
function close(){ open.value = false; vibrate(6) }
function vibrate(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Search & categories */
const query = ref('')
const categories = [
  { key: 'engagement',  label: 'Engagement' },
  { key: 'monetization',label: 'Monetization' },
  { key: 'content',     label: 'Content' },
  { key: 'technical',   label: 'Technical' },
  { key: 'safety',      label: 'Safety' },
  { key: 'growth',      label: 'Growth' }
]
const active = reactive(new Set(['engagement','content']))
function toggleCategory(k){ active.has(k) ? active.delete(k) : active.add(k); vibrate(5) }

/* Tip pool (offline demo) */
const baseTips = ref([
  make('🚀','30-Second Hook','“Stay 30s and I’ll give 2 shortcuts you can use today.”',['engagement','content'],[
    'Pin the promise as a comment','Deliver one shortcut fast']),
  make('🙋','Name + Echo','Say a viewer’s name & echo their point to pull in lurkers.',['engagement']),
  make('⏱️','Segment Switch','Every 6–8 min: demo → Q&A → recap to reduce drop-off.',['content','growth']),
  make('💸','Micro Goal for Gifts','“At 5 gifts I’ll reveal my template.”',['monetization','engagement']),
  make('🛡️','Safety First','Avoid sharing live locations; keep quick-mute handy.',['safety']),
  make('🎤','Audio Wins','Mic 20–25cm; disable auto-gain; avoid backlight hum.',['technical']),
  make('📈','Share to One','“If this helps, share to one friend learning this.”',['growth','engagement']),
])
function make(icon,title,body,tags,prompts=[]){ return { id: hash(title+body), icon, title, body, tags, prompts } }
function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0 } return `t_${Math.abs(h)}` }

/* Filters */
const filteredTips = computed(()=>{
  const q = query.value.toLowerCase().trim()
  const allow = (t)=> t.tags.some(tag => active.has(tag))
  const hit = (t)=> !q || [t.title,t.body,...(t.prompts||[])].join(' ').toLowerCase().includes(q)
  return baseTips.value.filter(t => allow(t) && hit(t))
})

/* Saved tips */
const SAVED_KEY = 'ai_tips_saved_mobile_v1'
const saved = ref([])
onMounted(()=>{
  try{ saved.value = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') }catch{}
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(()=>document.removeEventListener('keydown', onKey))
function onKey(e){ if (open.value && e.key==='Escape') close() }

function isSaved(id){ return !!saved.value.find(s=>s.id===id) }
function toggleSave(t){
  if (!t) return
  if (isSaved(t.id)) return removeSaved(t.id)
  saved.value.unshift(t)
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved.value))
  live.value = 'Saved tip'; vibrate(8)
}
function removeSaved(id){
  saved.value = saved.value.filter(s => s.id !== id)
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved.value))
}

/* Actions */
async function copyTip(t){
  const text = `${t.title}\n${t.body}\n${(t.prompts||[]).map(p=>`• ${p}`).join('\n')}`
  try{ await navigator.clipboard.writeText(text) }catch{}
  toast('Copied to clipboard'); vibrate(8)
}
async function shareTip(t){
  const text = `${t.title} — ${t.body}`
  if (navigator.share){ try{ await navigator.share({ title:t.title, text }) }catch{} }
  else { try{ await navigator.clipboard.writeText(text) }catch{} }
  toast('Shared'); vibrate(8)
}
function shuffle(){
  baseTips.value = [...baseTips.value].sort(()=>Math.random()-0.5)
  toast('Shuffled tips'); vibrate(6)
}

/* UI helpers */
const live = ref('')
const statusText = computed(()=> `${filteredTips.value.length} tips`)
const scrollMax = computed(()=> ({ maxHeight: 'calc(92vh - 190px)' }))
function toast(msg){
  live.value = msg
  const n = document.createElement('div')
  n.textContent = ` ${msg} `
  n.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 bg-white text-black text-sm px-3 py-1.5 rounded-xl shadow-2xl z-[100]'
  document.body.appendChild(n)
  setTimeout(()=>{ n.style.opacity='0'; n.style.transition='opacity .2s'; setTimeout(()=>n.remove(), 220)}, 1400)
}
</script>

<style scoped>
/* Buttons */
.btn{ @apply px-3 py-2 rounded-lg text-sm bg-white/10 border border-white/15 hover:bg-white/15; }
.btn.primary{ @apply bg-cyan-600 border-cyan-600 hover:bg-cyan-700; }
.btn.ghost{ @apply bg-white/10 border-white/15 hover:bg-white/15; }

/* Bottom sheet entrance */
@keyframes sheetIn { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
.animate-sheet-in{ animation: sheetIn .25s ease-out both; }

/* Hide horizontal scrollbar on chips */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none; }

/* iOS tap highlight */
:host, button, input { -webkit-tap-highlight-color: transparent; }
</style>
