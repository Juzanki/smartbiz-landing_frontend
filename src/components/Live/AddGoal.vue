<!-- src/components/Live/AddGoal.vue -->
<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[70] grid place-items-center bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="goal-title"
    @keydown.esc.prevent="emitClose"
  >
    <!-- Card -->
    <div
      class="pointer-events-auto w-[min(92vw,560px)] rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-black/80 shadow-2xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 id="goal-title" class="text-white font-bold text-lg">➕ Add Goal</h2>
        <button class="text-white/80 hover:text-white text-xl" @click="emitClose" aria-label="Close">✖</button>
      </div>

      <!-- Body -->
      <div class="px-4 py-4 space-y-4 text-white">
        <!-- Type selector -->
        <div>
          <label class="block text-xs text-white/70 mb-1">Goal type</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="t in types"
              :key="t.key"
              type="button"
              class="chip"
              :class="{ active: form.type === t.key }"
              @click="form.type = t.key"
            >
              <span class="mr-1">{{ t.icon }}</span>{{ t.label }}
            </button>
          </div>
        </div>

        <!-- Title -->
        <div>
          <label class="block text-xs text-white/70 mb-1">Title</label>
          <input
            ref="titleRef"
            v-model.trim="form.title"
            type="text"
            inputmode="text"
            class="inp"
            placeholder="e.g. New mic for the stream"
            maxlength="80"
          />
          <div class="hint">{{ form.title.length }}/80</div>
        </div>

        <!-- Dynamic fields -->
        <div class="grid grid-cols-2 gap-3" v-if="form.type !== 'custom'">
          <div v-if="form.type === 'likes'">
            <label class="block text-xs text-white/70 mb-1">Target likes</label>
            <input v-model.number="form.amount" type="number" min="1" step="1" class="inp" placeholder="e.g. 500" />
          </div>
          <div v-else-if="form.type === 'coins'">
            <label class="block text-xs text-white/70 mb-1">Target amount</label>
            <input v-model.number="form.amount" type="number" min="1" step="1" class="inp" placeholder="e.g. 2000" />
            <div class="hint">Unit: {{ unitLabel }}</div>
          </div>
          <div v-else-if="form.type === 'sales'">
            <label class="block text-xs text-white/70 mb-1">Target sales</label>
            <input v-model.number="form.amount" type="number" min="1" step="1" class="inp" placeholder="e.g. 10" />
          </div>

          <div>
            <label class="block text-xs text-white/70 mb-1">Deadline (optional)</label>
            <input v-model="form.deadline" type="date" class="inp" />
          </div>
        </div>

        <!-- Custom goal only -->
        <div v-if="form.type === 'custom'">
          <label class="block text-xs text-white/70 mb-1">Describe your goal</label>
          <textarea v-model.trim="form.customText" rows="3" class="inp" placeholder="e.g. Hit trending page today"></textarea>
        </div>

        <!-- Presets -->
        <div>
          <label class="block text-xs text-white/70 mb-1">Quick presets</label>
          <div class="flex gap-2 flex-wrap">
            <button class="preset" @click="applyPreset('likes', 100)">🔥 100 likes</button>
            <button class="preset" @click="applyPreset('likes', 500)">🚀 500 likes</button>
            <button class="preset" @click="applyPreset('coins', 1000)">💎 1,000 {{ unitLabel }}</button>
            <button class="preset" @click="applyPreset('sales', 5)">🛒 5 sales</button>
          </div>
        </div>

        <!-- Live preview -->
        <div class="preview">
          <div class="text-xs text-white/70">Preview</div>
          <div class="text-sm font-semibold mt-1">{{ previewText }}</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-3 border-t border-white/10 flex items-center justify-between">
        <button class="btn-secondary" @click="emitClose">Cancel</button>
        <div class="flex gap-2">
          <button class="btn-secondary" @click="resetForm">Reset</button>
          <button class="btn-primary" :disabled="!isValid" @click="save">Save Goal</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

const emit = defineEmits<{
  (e: 'close'): void
  /** Parent expects a string; we'll also include rich object in the detail event for future use */
  (e: 'set-goal', payload: string): void
  (e: 'set-goal-detail', payload: {
    type: 'likes' | 'coins' | 'sales' | 'custom',
    title: string,
    amount?: number,
    unit?: string,
    deadline?: string,
    text: string
  }): void
}>()

/** Options */
const unitLabel = 'Coins'
const types = [
  { key: 'likes', label: 'Likes', icon: '💗' },
  { key: 'coins', label: unitLabel, icon: '💎' },
  { key: 'sales', label: 'Sales', icon: '🛒' },
  { key: 'custom', label: 'Custom', icon: '📝' },
] as const

/** Form state */
const form = reactive({
  type: 'likes' as 'likes' | 'coins' | 'sales' | 'custom',
  title: '',
  amount: 100 as number | undefined,
  customText: '',
  deadline: '' as string | ''
})

/** Refs */
const titleRef = ref<HTMLInputElement | null>(null)

/** Computeds */
const isValid = computed(() => {
  if (!form.title.trim()) return false
  if (form.type !== 'custom') {
    return !!form.amount && form.amount > 0
  }
  // custom requires either customText or title (title already checked)
  return !!form.customText.trim()
})

const previewText = computed(() => {
  const title = form.title.trim()
  const date = form.deadline ? ` • by ${formatDate(form.deadline)}` : ''
  if (form.type === 'likes') return `🎯 ${title} • Target ${nf(form.amount)} likes${date}`
  if (form.type === 'coins') return `🎯 ${title} • Target ${nf(form.amount)} ${unitLabel}${date}`
  if (form.type === 'sales') return `🎯 ${title} • Target ${nf(form.amount)} sales${date}`
  return `🎯 ${title}${form.customText ? ' • ' + form.customText : ''}${date}`
})

/** Lifecycle */
onMounted(() => {
  // focus title on open
  setTimeout(() => titleRef.value?.focus(), 50)
})

/** Actions */
function applyPreset(type: 'likes'|'coins'|'sales', amount: number) {
  form.type = type
  form.amount = amount
}

function resetForm(){
  form.type = 'likes'
  form.title = ''
  form.amount = 100
  form.customText = ''
  form.deadline = ''
  titleRef.value?.focus()
}

function save(){
  if (!isValid.value) return
  // 1) emit string (backward compatible)
  emit('set-goal', previewText.value)
  // 2) emit detailed object (optional for future)
  emit('set-goal-detail', {
    type: form.type,
    title: form.title.trim(),
    amount: form.type === 'custom' ? undefined : (form.amount ?? 0),
    unit: form.type === 'coins' ? unitLabel : undefined,
    deadline: form.deadline || undefined,
    text: previewText.value
  })
  emitClose()
}

function emitClose(){ emit('close') }

/** Utils */
function nf(n?: number){ return (n ?? 0).toLocaleString() }
function formatDate(iso: string){
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString(undefined, { month:'short', day:'numeric' })
  } catch { return iso }
}
</script>

<style scoped>
/* Inputs & buttons */
.inp{
  width: 100%;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: .75rem;
  padding: .6rem .75rem;
  color: #fff;
  outline: none;
  transition: box-shadow .12s ease, border-color .12s ease, background .12s ease;
}
.inp::placeholder { color: rgba(255,255,255,.45) }
.inp:focus{ box-shadow: 0 0 0 2px rgba(59,130,246,.6); border-color: rgba(255,255,255,.25) }

.hint{ font-size: 11px; color: rgba(255,255,255,.6); margin-top: .25rem; }

.btn-primary{
  background: linear-gradient(135deg,#ef4444,#f97316,#f59e0b);
  color:#fff;
  border: none;
  font-weight: 700;
  padding: .6rem 1rem;
  border-radius: .75rem;
  transition: filter .12s ease, transform .12s ease;
}
.btn-primary:disabled{ filter: grayscale(1) brightness(.6); cursor: not-allowed }
.btn-primary:not(:disabled):active{ transform: translateY(1px) }

.btn-secondary{
  background: rgba(255,255,255,.08);
  color:#fff;
  border: 1px solid rgba(255,255,255,.12);
  padding: .55rem .9rem;
  border-radius: .75rem;
  transition: background .12s ease, border-color .12s ease;
}
.btn-secondary:hover{ background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.2) }

/* Chips */
.chip{
  background: rgba(255,255,255,.08);
  color:#fff;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 999px;
  padding: .45rem .75rem;
  font-size: 12px;
  transition: transform .12s ease, background .12s ease, border-color .12s ease;
}
.chip:hover{ transform: translateY(-1px); background: rgba(255,255,255,.12) }
.chip.active{
  background: linear-gradient(135deg,#06b6d4,#a855f7);
  border-color: rgba(255,255,255,.25);
}

/* Preview box */
.preview{
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: .75rem;
  padding: .6rem .75rem;
}
</style>
