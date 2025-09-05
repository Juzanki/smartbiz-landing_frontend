<!-- AIHostTips.vue -->
<template>
  <!-- Backdrop -->
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <!-- Bottom Sheet (mobile-first) -->
    <section
      class="absolute inset-x-0 bottom-0 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
             w-full sm:w-[560px] max-h-[92vh] overflow-hidden
             rounded-t-3xl sm:rounded-2xl bg-[#0b1220] text-white ring-1 ring-white/10 shadow-2xl animate-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tips-title"
    >
      <!-- Drag handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-white/20"></div>
      </div>

      <!-- Header -->
      <header class="px-4 sm:px-5 pt-2 pb-3 border-b border-white/10 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h2 id="tips-title" class="text-base sm:text-lg font-bold text-cyan-300 truncate">
            🤖 AI Host Tips
          </h2>
          <p class="text-[11px] text-white/60">Real-time prompts to boost engagement</p>
        </div>
        <button
          class="h-10 w-10 grid place-items-center rounded-xl bg-white/10 border border-white/15
                 hover:bg-white/15 focus:outline-none focus:ring-2 ring-cyan-400"
          aria-label="Close"
          @click="emit('close')"
        >✕</button>
      </header>

      <!-- Content -->
      <div class="px-4 sm:px-5 py-4 space-y-4 overflow-y-auto" :style="contentMax">
        <!-- Topic + generate -->
        <div class="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 space-y-3">
          <div class="flex gap-2">
            <input
              v-model.trim="topic"
              type="text"
              :placeholder="placeholder"
              class="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm
                     placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              @keyup.enter="generate"
            />
            <button
              class="min-w-[96px] rounded-xl px-3 py-2 text-sm font-semibold
                     bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
              :disabled="generating"
              @click="generate"
            >
              <span v-if="!generating">Generate</span>
              <span v-else class="inline-flex items-center gap-2">
                <span class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                Thinking…
              </span>
            </button>
          </div>

          <!-- Filter chips (scrollable on mobile) -->
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <button
              v-for="c in categories"
              :key="c.key"
              class="px-3 py-1 rounded-full text-[12px] border transition
                     bg-white/5 border-white/10 text-white/90 hover:bg-white/10 whitespace-nowrap"
              :class="active.has(c.key) ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-100' : ''"
              @click="toggleCategory(c.key)"
            >
              {{ c.label }}
            </button>
          </div>
        </div>

        <!-- Tips Carousel -->
        <section
          v-if="tips.length"
          class="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
        >
          <!-- Pager -->
          <div class="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <span class="text-xs text-white/70">Tip {{ index+1 }} of {{ tips.length }}</span>
            <div class="flex items-center gap-2">
              <button class="pill" @click="prev" :disabled="index===0">◀</button>
              <button class="pill" @click="next" :disabled="index===tips.length-1">▶</button>
            </div>
          </div>

          <!-- Card (swipeable) -->
          <article
            class="p-4 sm:p-5 select-none"
            role="article"
            :aria-label="current?.title"
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend.passive="onTouchEnd"
          >
            <div class="text-4xl mb-2">{{ current?.icon }}</div>
            <h3 class="text-lg font-semibold">{{ current?.title }}</h3>
            <p class="mt-1 text-sm text-white/80 leading-relaxed">
              {{ current?.body }}
            </p>

            <!-- Micro prompts -->
            <ul class="mt-3 space-y-1.5">
              <li v-for="(p, i) in current?.prompts || []" :key="i" class="flex items-start gap-2 text-[13px]">
                <span class="mt-[2px] text-cyan-300">•</span>
                <span class="text-white/85">{{ p }}</span>
              </li>
            </ul>

            <!-- Actions -->
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <button class="act primary" @click="saveTip(current)">⭐ Save</button>
              <button class="act" @click="copyTip(current)">📋 Copy</button>
              <button class="act" @click="shareTip(current)">🔗 Share</button>
              <button class="act danger" @click="dismissTip(current)">🗑 Dismiss</button>
            </div>
          </article>

          <!-- Dots -->
          <div class="px-4 pb-4 flex items-center justify-center gap-1.5">
            <span
              v-for="(t,i) in tips"
              :key="t.id"
              class="h-1.5 w-1.5 rounded-full transition"
              :class="i===index ? 'bg-cyan-400 w-6' : 'bg-white/30'"
              @click="go(i)"
            />
          </div>
        </section>

        <!-- Skeleton -->
        <div v-else-if="generating" class="space-y-3">
          <div class="skeleton h-24 rounded-xl"></div>
          <div class="skeleton h-6 rounded-xl w-2/3"></div>
          <div class="skeleton h-6 rounded-xl w-1/2"></div>
        </div>

        <!-- Empty state -->
        <div v-else class="text-center py-10 text-white/70">
          <div class="text-4xl">💡</div>
          <p class="mt-2 text-sm">Enter a topic and pick categories to get tailored tips.</p>
        </div>

        <!-- Saved tips -->
        <details class="rounded-2xl border border-white/10 bg-white/5 p-3" v-if="saved.length">
          <summary class="cursor-pointer text-sm text-white/80">⭐ Saved ({{ saved.length }})</summary>
          <ul class="mt-2 space-y-2">
            <li v-for="s in saved" :key="s.id" class="text-[13px] flex items-start gap-2">
              <span class="text-lg">{{ s.icon }}</span>
              <div class="flex-1">
                <div class="font-semibold">{{ s.title }}</div>
                <div class="text-white/80">{{ s.body }}</div>
              </div>
              <button class="act danger" @click="removeSaved(s.id)">✖</button>
            </li>
          </ul>
        </details>
      </div>

      <!-- Safe area for iOS -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>

      <!-- Live region (a11y) -->
      <span class="sr-only" role="status" aria-live="polite">{{ live }}</span>
    </section>
  </div>
</template>

<script setup>
/**
 * AIHostTips.vue — Mobile-first bottom sheet with AI-style host prompts
 * Features:
 * - Topic field + category chips → generate tailored tips (client-side pool demo)
 * - Swipeable carousel with Save / Copy / Share / Dismiss
 * - LocalStorage for saved/dismissed tips
 * - Haptics on tap (navigator.vibrate), a11y live region, safe-area padding
 */
import { ref, reactive, computed, onMounted } from 'vue'

/* Props & emits */
const props = defineProps({
  open: { type: Boolean, default: true },
  initialTopic: { type: String, default: '' }
})
const emit = defineEmits(['close','generated','saved','copied','shared','dismissed'])

/* UI state */
const topic = ref(props.initialTopic)
const generating = ref(false)
const tips = ref([])
const index = ref(0)
const live = ref('')

/* Filters */
const categories = [
  { key: 'engagement',  label: 'Engagement' },
  { key: 'monetization',label: 'Monetization' },
  { key: 'content',     label: 'Content' },
  { key: 'technical',   label: 'Technical' },
  { key: 'safety',      label: 'Safety' },
  { key: 'growth',      label: 'Growth' }
]
const active = reactive(new Set(['engagement', 'content']))

/* Saved & dismissed (localStorage) */
const SAVED_KEY = 'ai_host_tips_saved'
const DIS_KEY   = 'ai_host_tips_dismissed'
const saved = ref([])
const dismissedIds = ref(new Set())

onMounted(() => {
  try {
    saved.value = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')
    dismissedIds.value = new Set(JSON.parse(localStorage.getItem(DIS_KEY) || '[]'))
  } catch {}
})

/* Computed */
const placeholder = computed(() =>
  'What are you hosting? (e.g., Startup Q&A, Gospel Live, Music Night)'
)
const current = computed(() => tips.value[index.value] || null)
const contentMax = computed(() => ({ maxHeight: 'calc(92vh - 104px)' }))

/* Haptics */
function vibrate(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Generate (mock) */
async function generate(){
  generating.value = true
  vibrate(8)
  await new Promise(r => setTimeout(r, 420)) // simulate latency

  const t = (topic.value || 'your live').trim()
  const acts = [...active]
  const pool = basePool(t)

  // Filter by categories and exclude dismissed
  let out = pool.filter(p => p.tags.some(x => acts.includes(x))).filter(p => !dismissedIds.value.has(p.fingerprint))
  if (out.length < 5) out = pool.slice(0, 7) // ensure enough
  tips.value = out.slice(0, 7).map(p => ({ ...p, id: p.fingerprint }))
  index.value = 0
  generating.value = false
  live.value = `Generated ${tips.value.length} tips`
  emit('generated', tips.value)
}

/* Tip pool (replace with real AI if needed) */
function basePool(topicText){
  const niched = (s) => s.replaceAll('{topic}', topicText)
  const items = [
    tip('👋', 'Hook in the First 10s', niched('Open with: “If you care about {topic}, stay—two gems in under a minute.”'), ['engagement','content'], [
      'Ask a yes/no to warm chat: “Should we go deeper?”',
      'Pin a comment with your promise (deliver later)'
    ]),
    tip('❤️', 'Name + Echo', niched('Say a viewer’s name & echo their point: “Asha said {topic} is tough—agree?”'), ['engagement'], [
      'Reward first helpful comment with a shoutout',
      'Use a quick poll: 👍 or 👎'
    ]),
    tip('💸', 'Micro-CTA for Gifts', niched('“When the counter hits 5 gifts, I’ll reveal the shortcut to {topic}.”'), ['monetization','engagement'], [
      'Start tiny targets (e.g., 3 gifts) to spark momentum',
      'Thank with specifics: what the gift unlocks'
    ]),
    tip('🧱', '3-Block Story', niched('Teach in 3 blocks: Mistake → Method → Micro-task (for {topic}).'), ['content'], [
      'Keep each block under 40s',
      'End with an action viewers can try now'
    ]),
    tip('🎛️', 'Segment Switch', niched('Every 6–8 minutes switch format: demo → Q&A → recap on {topic}.'), ['content','engagement'], [
      'Use a timer on screen if possible',
      'Announce the next segment to reduce drop-off'
    ]),
    tip('🔐', 'Safety First', 'Avoid personal addresses, minors’ faces, or sharing private DMs. Keep reports ready.', ['safety'], [
      'Delay location reveals',
      'Keep a “ban” phrase ready for mods'
    ]),
    tip('⚙️', 'Zero-Noise Tech Check', 'Mic within 20–25cm, auto-gain off, reduce room echo with soft surfaces.', ['technical'], [
      'Test clap to see decay (<0.5s good)',
      'Lock phone focus; avoid backlight'
    ]),
    tip('📈', 'Compounding CTA', niched('“If this helped, share to 1 friend learning {topic}.”'), ['growth','engagement'], [
      'Use the mobile share sheet',
      'Pair with a memorable line'
    ]),
    tip('⏱️', '90-Second Loop', niched('Repeat the core promise every ~90s for scrollers joining {topic}.'), ['content','growth'], [
      '“In case you just joined…” refresher',
      'Drop the best nugget every 2–3 minutes'
    ]),
  ]
  return items.map(i => ({ ...i, fingerprint: hash(i.title + i.body) }))
}

function tip(icon, title, body, tags, prompts){ return { icon, title, body, tags, prompts } }
function hash(s){ let h=0; for (let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0 } return `t_${Math.abs(h)}` }

/* Carousel controls */
function next(){ if (index.value < tips.value.length-1) { index.value++; vibrate(6) } }
function prev(){ if (index.value > 0) { index.value--; vibrate(6) } }
function go(i){ index.value = i; vibrate(3) }

/* Actions */
function saveTip(t){
  if (!t) return
  if (!saved.value.find(x => x.id === t.id)) {
    saved.value.unshift(t)
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved.value))
    emit('saved', t)
    live.value = 'Saved tip'
    vibrate(8)
  }
}
function removeSaved(id){
  saved.value = saved.value.filter(s => s.id !== id)
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved.value))
}
async function copyTip(t){
  if (!t) return
  const txt = `${t.title}\n${t.body}\n- ${t.prompts?.join('\n- ') || ''}`
  try { await navigator.clipboard.writeText(txt) } catch {}
  emit('copied', t); live.value = 'Copied to clipboard'; vibrate(8)
}
async function shareTip(t){
  if (!t) return copyTip(t)
  const text = `${t.title} — ${t.body}`
  if (navigator.share) {
    try { await navigator.share({ title: t.title, text }) } catch {}
  } else {
    await copyTip(t)
  }
  emit('shared', t); live.value = 'Shared'; vibrate(8)
}
function dismissTip(t){
  if (!t) return
  dismissedIds.value.add(t.id)
  localStorage.setItem(DIS_KEY, JSON.stringify([...dismissedIds.value]))
  tips.value = tips.value.filter(x => x.id !== t.id)
  index.value = Math.max(0, Math.min(index.value, tips.value.length - 1))
  emit('dismissed', t)
  live.value = 'Dismissed'
}

/* Filters */
function toggleCategory(k){
  active.has(k) ? active.delete(k) : active.add(k)
  vibrate(5)
}

/* Swipe gestures */
let startX = 0, dx = 0
function onTouchStart(e){ startX = e.touches[0].clientX; dx = 0 }
function onTouchMove(e){ dx = e.touches[0].clientX - startX }
function onTouchEnd(){ if (Math.abs(dx) > 40) { dx < 0 ? next() : prev() } startX = 0; dx = 0 }
</script>

<style scoped>
/* Buttons */
.pill{
  @apply h-8 px-3 rounded-lg text-sm bg-white/10 border border-white/15 disabled:opacity-40;
}
.act{
  @apply px-3 py-1.5 rounded-lg text-sm bg-white/10 border border-white/15 hover:bg-white/15;
}
.act.primary{ @apply bg-cyan-600 border-cyan-600 hover:bg-cyan-700; }
.act.danger{ @apply bg-rose-600 border-rose-600 hover:bg-rose-700; }

/* Skeleton shimmer */
.skeleton{
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 37%, rgba(255,255,255,0.06) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer{ 0%{background-position:100% 0} 100%{background-position:0 0} }

/* Sheet entrance */
@keyframes in{ from{ opacity:0; transform: translateY(24px) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .25s ease-out both }

/* Hide horizontal scrollbar on chips */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* iOS tap highlight */
:host, button { -webkit-tap-highlight-color: transparent; }
</style>
