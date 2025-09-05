<!-- AddTopicSheet.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="topic-title"
    @click.self="close('backdrop')" @keydown.esc.prevent="close('esc')"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-md max-h-[92vh]
             rounded-t-3xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in flex flex-col"
      :style="dragStyle"
      @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
    >
      <!-- Handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <h2 id="topic-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          🗣️ Add Stream Topic
        </h2>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close" @click="close('x')">✕</button>
      </header>

      <!-- Body -->
      <div class="px-5 pb-4 sm:pb-5 space-y-4 overflow-y-auto">

        <!-- Topic input -->
        <div>
          <label class="text-sm font-semibold block mb-1">Topic</label>
          <div class="relative">
            <input
              ref="inputRef"
              v-model.trim="topic"
              :maxlength="maxLen"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="e.g., Let’s talk business! 💼"
              class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
            />
            <div class="absolute right-2 bottom-1.5 text-[11px]"
                 :class="charsLeft < 0 ? 'text-rose-500' : 'text-zinc-500'">
              {{ topic.length }}/{{ maxLen }}
            </div>
          </div>
          <p v-if="lint" class="mt-1 text-[12px] text-zinc-500">Tip: {{ lint }}</p>
          <p v-if="errors.topic" class="mt-1 text-[12px] text-rose-600">{{ errors.topic }}</p>
        </div>

        <!-- Quick suggestions -->
        <div>
          <div class="text-sm font-semibold mb-2">Quick suggestions</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in suggestions" :key="s"
              class="px-3 py-1.5 rounded-full text-xs border
                     bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              @click="applySuggestion(s)"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Hashtags -->
        <div>
          <div class="text-sm font-semibold mb-2">Hashtags (optional)</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in allTags" :key="t"
              class="px-3 py-1.5 rounded-full text-xs border"
              :class="selectedTags.includes(t)
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'"
              @click="toggleTag(t)"
            >#{{ t }}</button>
          </div>
          <div v-if="selectedTags.length" class="mt-2 text-[12px] text-zinc-500">
            Selected: <span class="font-medium">#{{ selectedTags.join('  #') }}</span>
          </div>
        </div>

        <!-- Preview -->
        <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
          <div class="text-[12px] text-zinc-500 mb-1">Preview</div>
          <div class="text-sm font-medium break-words">
            {{ finalPreview }}
          </div>
        </div>

        <!-- Draft controls -->
        <div class="flex items-center justify-between text-[12px]">
          <span class="text-zinc-500">Draft auto-saves</span>
          <button class="underline text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300" @click="clearDraft">Clear draft</button>
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" @click="close('cancel')">Cancel</button>
        <button
          class="rounded-full px-4 py-2 text-xs font-semibold text-white
                 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canSave"
          @click="save"
        >
          Save
        </button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

/** Props & Emits */
const props = defineProps({
  open: { type: Boolean, default: true },
  maxLen: { type: Number, default: 80 }
})
const emit = defineEmits(['close','save'])

/** State */
const topic = ref('')
const selectedTags = ref([])
const inputRef = ref(null)
const errors = ref({ topic: '' })

/** Suggestions & tags */
const suggestions = [
  "Let’s talk business! 💼",
  "Live Q&A: ask me anything",
  "Content strategy for 2025",
  "Startup funding tips 🚀",
  "Tech & AI trends today",
  "Motivation Monday 🔥"
]
const allTags = ['business','startup','marketing','tech','ai','careers','music','motivation']

/** Computed */
const charsLeft = computed(()=> props.maxLen - topic.value.length)
const lint = computed(()=>{
  const t = topic.value.trim()
  if (t.length && t.length < 8) return 'Make it a bit more descriptive (8+ chars).'
  if (t && !/(let'?s|q&a|how to|tips|live)/i.test(t)) return 'Start with an action: “Let’s…”, “Live Q&A…”, or “How to…”.'
  return ''
})
const finalPreview = computed(()=>{
  const tagPart = selectedTags.value.length ? '  ' + selectedTags.value.map(x=>'#'+x).join(' ') : ''
  return (topic.value || 'Your topic will appear here…') + tagPart
})
const canSave = computed(()=>{
  const t = topic.value.trim()
  return t.length >= 3 && t.length <= props.maxLen
})

/** Actions */
function applySuggestion(s){ topic.value = s; buzz(8) }
function toggleTag(t){
  const i = selectedTags.value.indexOf(t)
  if (i > -1) selectedTags.value.splice(i,1)
  else selectedTags.value.push(t)
  buzz(6)
}

function validate(){
  errors.value.topic = ''
  const t = topic.value.trim()
  if (t.length < 3) errors.value.topic = 'Topic must be at least 3 characters.'
  if (t.length > props.maxLen) errors.value.topic = `Max length is ${props.maxLen} characters.`
}

function save(){
  validate()
  if (errors.value.topic) { buzz(12); return }
  const payload = {
    topic: topic.value.trim(),
    hashtags: [...selectedTags.value],
    final: finalPreview.value,
    at: Date.now()
  }
  try{ localStorage.setItem('live_topic_last', JSON.stringify(payload)) }catch{}
  buzz(14)
  emit('save', payload)
  close('save')
}

function close(reason){ emit('close', { reason }) }

/** Draft autosave */
let timer = null
watch([topic, selectedTags], ()=>{
  clearTimeout(timer)
  timer = setTimeout(()=>{
    try{
      localStorage.setItem('live_topic_draft', JSON.stringify({
        topic: topic.value, tags: selectedTags.value
      }))
    }catch{}
  }, 300)
}, { deep: true })

function clearDraft(){
  topic.value = ''
  selectedTags.value = []
  try{ localStorage.removeItem('live_topic_draft') }catch{}
}

/** Haptics */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/** Autofocus + load draft */
onMounted(async ()=>{
  try{
    const draft = JSON.parse(localStorage.getItem('live_topic_draft') || 'null')
    if (draft){
      topic.value = draft.topic || ''
      selectedTags.value = Array.isArray(draft.tags) ? draft.tags : []
    }
  }catch{}
  await nextTick()
  inputRef.value?.focus?.()
})

/** Swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }
</script>

<style scoped>
/* Entrance */
@keyframes in { from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
