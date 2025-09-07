<template>
  <teleport to="body">
    <transition name="ag-fade">
      <div
        v-if="modelValue"
        ref="overlay"
        class="fixed inset-0 z-[var(--z,70)] grid place-items-center bg-black/60 backdrop-blur-sm"
        role="dialog"
        :aria-modal="true"
        :aria-labelledby="ids.title"
        :aria-describedby="ids.desc"
        @click.self="close('backdrop')"
        @keydown.esc.prevent="close('esc')"
        @keydown.tab.prevent="onTabTrap"
        :style="{ '--z': String(zIndex) }"
      >
        <!-- Card -->
        <section
          ref="card"
          class="pointer-events-auto w-[min(92vw,560px)] rounded-2xl border border-white/10
                 bg-gradient-to-b from-slate-900/80 to-black/80 shadow-2xl overflow-hidden
                 animate-enter"
          @click.stop
        >
          <!-- Header -->
          <header class="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <h2 :id="ids.title" class="text-white font-bold text-lg">➕ Add Goal</h2>
              <p :id="ids.desc" class="text-xs text-white/60">
                Define a clear target for your live — likes, {{ unitLabel.toLowerCase() }}, sales or a custom goal.
              </p>
            </div>
            <button
              class="icon-btn text-white/80 hover:text-white text-xl"
              type="button"
              @click="close('button')"
              aria-label="Close"
              ref="closeBtn"
            >✖</button>
          </header>

          <!-- Body -->
          <form class="px-4 py-4 space-y-4 text-white" @submit.prevent="save">
            <!-- Type selector -->
            <div>
              <label class="block text-xs text-white/70 mb-1">Goal type</label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="t in types"
                  :key="t.key"
                  class="chip"
                  :class="{ active: form.type === t.key }"
                  type="button"
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
                autocomplete="off"
                required
              />
              <div class="hint">{{ form.title.length }}/80</div>
            </div>

            <!-- Dynamic fields -->
            <div class="grid grid-cols-2 gap-3" v-if="form.type !== 'custom'">
              <div v-if="form.type === 'likes'">
                <label class="block text-xs text-white/70 mb-1">Target likes</label>
                <input v-model.number="form.amount" type="number" min="1" step="1" class="inp" placeholder="e.g. 500" required />
              </div>

              <div v-else-if="form.type === 'coins'">
                <label class="block text-xs text-white/70 mb-1">Target amount</label>
                <input v-model.number="form.amount" type="number" min="1" step="1" class="inp" placeholder="e.g. 2000" required />
                <div class="hint">Unit: {{ unitLabel }}</div>
              </div>

              <div v-else-if="form.type === 'sales'">
                <label class="block text-xs text-white/70 mb-1">Target sales</label>
                <input v-model.number="form.amount" type="number" min="1" step="1" class="inp" placeholder="e.g. 10" required />
              </div>

              <div>
                <label class="block text-xs text-white/70 mb-1">Deadline (optional)</label>
                <input v-model="form.deadline" type="date" class="inp" />
              </div>
            </div>

            <!-- Custom -->
            <div v-else>
              <label class="block text-xs text-white/70 mb-1">Describe your goal</label>
              <textarea
                v-model.trim="form.customText"
                rows="3"
                class="inp"
                placeholder="e.g. Hit trending page today"
                required
              ></textarea>
            </div>

            <!-- Presets -->
            <div>
              <label class="block text-xs text-white/70 mb-1">Quick presets</label>
              <div class="flex gap-2 flex-wrap">
                <button class="preset" type="button" @click="applyPreset('likes', 100)">🔥 100 likes</button>
                <button class="preset" type="button" @click="applyPreset('likes', 500)">🚀 500 likes</button>
                <button class="preset" type="button" @click="applyPreset('coins', 1000)">💎 1,000 {{ unitLabel }}</button>
                <button class="preset" type="button" @click="applyPreset('sales', 5)">🛒 5 sales</button>
              </div>
            </div>

            <!-- Preview -->
            <div class="preview">
              <div class="text-xs text-white/70">Preview</div>
              <div class="text-sm font-semibold mt-1">{{ previewText }}</div>
            </div>

            <!-- Footer -->
            <div class="pt-2 border-t border-white/10 flex items-center justify-between">
              <button class="btn-secondary" type="button" @click="close('button')">Cancel</button>
              <div class="flex gap-2">
                <button class="btn-secondary" type="button" @click="resetForm">Reset</button>
                <button class="btn-primary" :disabled="!isValid" type="submit">Save Goal</button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue'

/* ---------- Props / Emits ---------- */
type GoalType = 'likes' | 'coins' | 'sales' | 'custom'
type Detail = {
  type: GoalType
  title: string
  amount?: number
  unit?: string
  deadline?: string
  text: string
}

const props = withDefaults(defineProps<{
  /** On/Off via v-model */
  modelValue?: boolean
  /** Z-index ya overlay */
  zIndex?: number
  /** Iwapo kubofya backdrop kufunge */
  closeOnBackdrop?: boolean
  /** Lebo ya sarafu/coins */
  unitLabel?: string
  /** Prefill (kwa edit mode) */
  prefill?: Partial<Omit<Detail, 'text'>>
}>(), {
  modelValue: true,
  zIndex: 70,
  closeOnBackdrop: true,
  unitLabel: 'Coins',
  prefill: () => ({})
})

const emit = defineEmits<{
  (e:'update:modelValue', v:boolean): void
  (e:'close', reason:'button'|'esc'|'backdrop'): void
  (e:'set-goal', payload:string): void
  (e:'set-goal-detail', payload: Detail): void
}>()

/* ---------- IDs / Refs ---------- */
const ids = {
  title: `goal-title-${Math.random().toString(36).slice(2,8)}`,
  desc:  `goal-desc-${Math.random().toString(36).slice(2,8)}`
}
const overlay = ref<HTMLElement|null>(null)
const card = ref<HTMLElement|null>(null)
const titleRef = ref<HTMLInputElement|null>(null)
const closeBtn = ref<HTMLButtonElement|null>(null)

/* ---------- State ---------- */
const open = computed(()=> props.modelValue)
const unitLabel = computed(()=> props.unitLabel)
const zIndex = computed(()=> props.zIndex)

const types = [
  { key: 'likes',  label: 'Likes',  icon: '💗' },
  { key: 'coins',  label: unitLabel.value, icon: '💎' },
  { key: 'sales',  label: 'Sales',  icon: '🛒' },
  { key: 'custom', label: 'Custom', icon: '📝' },
] as const

const form = reactive({
  type: (props.prefill?.type ?? 'likes') as GoalType,
  title: props.prefill?.title ?? '',
  amount: (props.prefill?.amount ?? 100) as number | undefined,
  customText: props.prefill?.type === 'custom' ? (props.prefill?.title ?? '') : '',
  deadline: props.prefill?.deadline ?? ''
})

/* ---------- Computeds ---------- */
const isValid = computed(() => {
  if (!form.title.trim()) return false
  if (form.type !== 'custom') return !!form.amount && form.amount > 0
  return !!form.customText.trim()
})

const previewText = computed(() => {
  const title = form.title.trim()
  const date = form.deadline ? ` • by ${formatDate(form.deadline)}` : ''
  if (form.type === 'likes') return `🎯 ${title} • Target ${nf(form.amount)} likes${date}`
  if (form.type === 'coins') return `🎯 ${title} • Target ${nf(form.amount)} ${unitLabel.value}${date}`
  if (form.type === 'sales') return `🎯 ${title} • Target ${nf(form.amount)} sales${date}`
  return `🎯 ${title}${form.customText ? ' • ' + form.customText : ''}${date}`
})

/* ---------- Lifecycle ---------- */
watch(open, async (v) => {
  if (v) {
    await nextTick()
    titleRef.value?.focus()
    collectFocusables()
  }
})
onMounted(() => {
  if (open.value) {
    titleRef.value?.focus()
    collectFocusables()
  }
})

/* ---------- Actions ---------- */
function applyPreset(type: Exclude<GoalType,'custom'>, amount: number){
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
  const detail: Detail = {
    type: form.type,
    title: form.title.trim(),
    amount: form.type === 'custom' ? undefined : (form.amount ?? 0),
    unit: form.type === 'coins' ? unitLabel.value : undefined,
    deadline: form.deadline || undefined,
    text: previewText.value
  }
  emit('set-goal', detail.text)
  emit('set-goal-detail', detail)
  close('button')
}

function close(reason:'button'|'esc'|'backdrop'='button'){
  if (reason==='backdrop' && !props.closeOnBackdrop) return
  emit('update:modelValue', false)
  emit('close', reason)
}

/* ---------- Focus trap ---------- */
let focusables: HTMLElement[] = []
function collectFocusables(){
  const root = card.value
  if(!root) return
  focusables = Array.from(root.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
  // initial focus fallback
  if (document.activeElement && focusables.length && !root.contains(document.activeElement)) {
    (focusables[0] as HTMLElement).focus()
  }
}
function onTabTrap(e: KeyboardEvent){
  if(!open.value || !focusables.length) return
  const active = document.activeElement as HTMLElement
  const idx = focusables.indexOf(active)
  const next = e.shiftKey
    ? (idx <= 0 ? focusables.at(-1) : focusables[idx-1])
    : (idx === focusables.length-1 ? focusables[0] : focusables[idx+1])
  next?.focus()
}

/* ---------- Utils ---------- */
function nf(n?: number){ return (n ?? 0).toLocaleString() }
function formatDate(iso: string){
  try {
    const d = new Date(`${iso}T00:00:00`)
    return d.toLocaleDateString(undefined, { month:'short', day:'numeric' })
  } catch { return iso }
}
</script>

<style scoped>
/* Animations */
.ag-fade-enter-active, .ag-fade-leave-active { transition: opacity .22s ease; }
.ag-fade-enter-from, .ag-fade-leave-to { opacity: 0; }
.animate-enter { animation: ag-up .28s cubic-bezier(.22,1,.36,1) both; }
@keyframes ag-up { from{ transform: translateY(18px); opacity:.98 } to{ transform: translateY(0); opacity:1 } }

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
  color:#fff; border: none; font-weight: 700;
  padding: .6rem 1rem; border-radius: .75rem;
  transition: filter .12s ease, transform .12s ease;
}
.btn-primary:disabled{ filter: grayscale(1) brightness(.6); cursor: not-allowed }
.btn-primary:not(:disabled):active{ transform: translateY(1px) }

.btn-secondary{
  background: rgba(255,255,255,.08);
  color:#fff; border: 1px solid rgba(255,255,255,.12);
  padding: .55rem .9rem; border-radius: .75rem;
  transition: background .12s ease, border-color .12s ease;
}
.btn-secondary:hover{ background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.2) }

/* Chips */
.chip{
  background: rgba(255,255,255,.08);
  color:#fff; border: 1px solid rgba(255,255,255,.12);
  border-radius: 999px; padding: .45rem .75rem;
  font-size: 12px; transition: transform .12s ease, background .12s ease, border-color .12s ease;
}
.chip:hover{ transform: translateY(-1px); background: rgba(255,255,255,.12) }
.chip.active{
  background: linear-gradient(135deg,#06b6d4,#a855f7);
  border-color: rgba(255,255,255,.25);
}

/* Presets & preview */
.preset{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  color: #fff; border-radius: .7rem; padding: .45rem .7rem; font-size: .85rem;
  transition: background .12s ease, border-color .12s ease, transform .12s ease;
}
.preset:hover{ background: rgba(255,255,255,.12); transform: translateY(-1px) }

.preview{
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: .75rem; padding: .6rem .75rem;
}

/* Icon button */
.icon-btn{
  border: 1px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  border-radius: 9999px; padding:.35rem .6rem; line-height:1; color:#fff;
  transition: transform .15s ease, background .15s ease;
}
.icon-btn:hover{ transform: translateY(-1px) }
</style>
