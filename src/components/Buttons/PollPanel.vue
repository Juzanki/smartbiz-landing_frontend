<!-- src/components/Buttons/PollPanel.vue -->
<template>
  <div class="poll-panel" role="dialog" aria-modal="false" aria-label="Live Poll">
    <!-- Header -->
    <div class="hdr">
      <div class="title">
        <span>📊 Live Poll</span>
        <span v-if="phase==='running'" class="badge running">LIVE</span>
        <span v-else-if="phase==='ended'" class="badge ended">ENDED</span>
      </div>

      <div class="tools">
        <button class="ico" type="button" title="Close" @click="emit('close')">✖</button>
      </div>
    </div>

    <!-- Timer / progress -->
    <div class="timer" v-if="durationSec > 0">
      <div class="bar">
        <div class="fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div class="ttext">
        <span v-if="phase==='idle'">Duration: {{ durationSec }}s</span>
        <span v-else-if="phase==='running'">{{ remaining }}s left</span>
        <span v-else>Finished</span>
      </div>
    </div>

    <!-- Options -->
    <div class="opts" role="group" aria-label="Poll options">
      <div
        v-for="opt in localOptions"
        :key="opt.id"
        class="opt"
        :aria-pressed="hasVotedFor(opt.id)"
      >
        <button
          class="vote-btn"
          type="button"
          :disabled="phase!=='running' || isLockedVote"
          @click="vote(opt.id)"
        >
          <span class="t">{{ opt.text }}</span>
          <span class="v">{{ opt.votes }}</span>
        </button>
        <div class="meter" aria-hidden="true">
          <div class="mfill" :style="{ width: percent(opt)+'%' }"></div>
        </div>
        <div class="pct">{{ percent(opt).toFixed(0) }}%</div>

        <button
          v-if="canEdit"
          class="trash"
          title="Remove option"
          type="button"
          @click="removeOption(opt.id)"
        >🗑️</button>
      </div>
    </div>

    <!-- Add option -->
    <form v-if="canEdit && canAddOptions" class="adder" @submit.prevent="addNewOption">
      <input
        v-model.trim="newText"
        class="in"
        type="text"
        maxlength="60"
        placeholder="Add option..."
        :disabled="phase==='ended'"
      />
      <button class="add" type="submit" :disabled="!newText">Add</button>
    </form>

    <!-- Actions -->
    <div class="actions">
      <button v-if="phase==='idle'" class="act green" type="button" @click="start">Start</button>
      <button v-else-if="phase==='running'" class="act warn" type="button" @click="end">End</button>
      <button v-if="phase!=='running'" class="act ghost" type="button" @click="reset">Reset</button>
      <button class="act ghost" type="button" @click="emit('close')">Close</button>
    </div>

    <!-- SR announcements -->
    <div class="sr-only" aria-live="polite">
      <span v-if="announce">{{ announce }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, withDefaults } from 'vue'

type PollOption = { id: string; text: string; votes: number }
type Phase = 'idle' | 'running' | 'ended'

const props = withDefaults(defineProps<{
  /** chaguo za kuanzia */
  options?: PollOption[]
  /** sekunde za muda wa poll (0 = hakuna timer) */
  durationSec?: number
  /** ruhusu kura nyingi kwa mtu mmoja (local) */
  allowMulti?: boolean
  /** ruhusu kuongeza options wakati wa poll */
  canAddOptions?: boolean
  /** unaweza kuhariri (ongeza/futa) */
  canEdit?: boolean
  /** kitambulisho cha poll (kwa localStorage lock) */
  pollId?: string
}>(), {
  options: () => ([
    { id: 'a', text: 'Option A', votes: 0 },
    { id: 'b', text: 'Option B', votes: 0 },
  ]),
  durationSec: 60,
  allowMulti: false,
  canAddOptions: true,
  canEdit: true,
  pollId: 'default-poll'
})

const emit = defineEmits<{
  (e: 'update:options', v: PollOption[]): void
  (e: 'vote', payload: { id: string; optionId: string }): void
  (e: 'start'): void
  (e: 'end', summary: { total: number; options: PollOption[] }): void
  (e: 'reset'): void
  (e: 'close'): void
  (e: 'add-option', option: PollOption): void
  (e: 'remove-option', id: string): void
}>()

const canEdit = computed(() => props.canEdit !== false)
const canAddOptions = computed(() => props.canAddOptions !== false)

const localOptions = ref<PollOption[]>(structuredClone(props.options))
watch(() => props.options, v => {
  localOptions.value = structuredClone(v || [])
}, { deep: true })

/* ===== voting state ===== */
const phase = ref<Phase>('idle')
const votedKey = computed(() => `poll:voted:${props.pollId}`)
const votedIds = ref<Set<string>>(new Set())
if (typeof window !== 'undefined') {
  const raw = localStorage.getItem(votedKey.value)
  if (raw) try { votedIds.value = new Set(JSON.parse(raw)) } catch {}
}
const isLockedVote = computed(() => !props.allowMulti && votedIds.value.size > 0)
function hasVotedFor(optId: string){ return votedIds.value.has(optId) }

/* ===== timer ===== */
const durationSec = computed(() => Math.max(0, props.durationSec || 0))
const remaining = ref(durationSec.value)
const progressPct = computed(() => {
  if (durationSec.value === 0) return 100
  const used = durationSec.value - remaining.value
  return Math.min(100, Math.max(0, (used / durationSec.value) * 100))
})
let t: number | undefined

function tick(){
  remaining.value = Math.max(0, remaining.value - 1)
  if (remaining.value === 0) end()
}
function start(){
  if (phase.value !== 'idle') return
  phase.value = 'running'
  remaining.value = durationSec.value
  if (durationSec.value > 0 && typeof window !== 'undefined') {
    t && clearInterval(t)
    t = window.setInterval(tick, 1000)
  }
  announceNow('Poll started')
  emit('start')
}
function end(){
  if (phase.value === 'ended') return
  phase.value = 'ended'
  if (t) clearInterval(t)
  const summary = { total: totalVotes.value, options: structuredClone(localOptions.value) }
  announceNow('Poll ended')
  emit('end', summary)
}
function reset(){
  if (t) clearInterval(t)
  localOptions.value = localOptions.value.map(o => ({ ...o, votes: 0 }))
  remaining.value = durationSec.value
  phase.value = 'idle'
  votedIds.value.clear()
  persistVoted()
  emit('reset')
}

/* ===== add/remove ===== */
const newText = ref('')
function addNewOption(){
  if (!newText.value) return
  const id = Math.random().toString(36).slice(2,9)
  const opt = { id, text: newText.value, votes: 0 }
  localOptions.value.push(opt)
  emit('add-option', opt)
  emit('update:options', structuredClone(localOptions.value))
  newText.value = ''
}
function removeOption(id: string){
  const idx = localOptions.value.findIndex(o => o.id === id)
  if (idx >= 0) {
    localOptions.value.splice(idx,1)
    votedIds.value.delete(id)
    persistVoted()
    emit('remove-option', id)
    emit('update:options', structuredClone(localOptions.value))
  }
}

/* ===== votes / metrics ===== */
const totalVotes = computed(() => localOptions.value.reduce((a,b)=>a+b.votes,0))
function percent(opt: PollOption){
  const tv = totalVotes.value
  return tv ? (opt.votes / tv) * 100 : 0
}

function vote(optionId: string){
  if (phase.value !== 'running') return
  if (!props.allowMulti && votedIds.value.size) return
  const o = localOptions.value.find(o => o.id === optionId)
  if (!o) return
  o.votes++
  votedIds.value.add(optionId)
  persistVoted()
  emit('vote', { id: props.pollId!, optionId })
  emit('update:options', structuredClone(localOptions.value))
}

function persistVoted(){
  if (typeof window === 'undefined') return
  try { localStorage.setItem(votedKey.value, JSON.stringify([...votedIds.value])) } catch {}
}

/* ===== SR announce ===== */
const announce = ref('')
let aTimer: number|undefined
function announceNow(text: string){
  announce.value = text
  if (aTimer) clearTimeout(aTimer)
  aTimer = window.setTimeout(() => announce.value = '', 1200)
}

onBeforeUnmount(() => { t && clearInterval(t); aTimer && clearTimeout(aTimer) })
</script>

<style scoped>
.poll-panel{
  width: min(96vw, 520px);
  background: linear-gradient(180deg, rgba(2,6,23,.96), rgba(0,0,0,.95));
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 1rem;
  padding: .9rem;
  color: #fff;
  box-shadow: 0 16px 60px rgba(0,0,0,.5);
}
.hdr{ display:flex; align-items:center; justify-content:space-between; gap:.6rem }
.title{ display:flex; align-items:center; gap:.6rem; font-weight:800 }
.badge{ font-size:.72rem; padding:.15rem .45rem; border-radius:.6rem; border:1px solid transparent }
.badge.running{ background: rgba(34,197,94,.2); border-color: rgba(34,197,94,.35); color:#86efac }
.badge.ended{ background: rgba(244,63,94,.18); border-color: rgba(244,63,94,.3); color:#fda4af }
.tools .ico{ background: rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); border-radius:.5rem; color:#fff; padding:.2rem .45rem }

.timer{ margin-top:.6rem }
.bar{ height:8px; background: rgba(255,255,255,.08); border-radius:999px; overflow:hidden }
.fill{ height:100%; background: linear-gradient(90deg, #22c55e, #06b6d4) }
.ttext{ margin-top:.25rem; font-size:.8rem; color:#cbd5e1 }

.opts{ margin-top:.7rem; display:flex; flex-direction:column; gap:.5rem }
.opt{
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.12);
  border-radius:.8rem; padding:.5rem; position:relative
}
.vote-btn{
  width:100%; display:flex; align-items:center; justify-content:space-between;
  background: transparent; color:#fff; font-weight:700;
  border: none; text-align:left; padding:.25rem 0;
}
.vote-btn:disabled{ opacity:.7 }
.t{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:.5rem }
.v{ font-variant-numeric: tabular-nums; opacity:.9 }
.meter{ height:6px; background: rgba(255,255,255,.08); border-radius:999px; overflow:hidden; margin-top:.35rem }
.mfill{ height:100%; background: linear-gradient(90deg, #60a5fa, #a78bfa) }
.pct{ margin-top:.2rem; font-size:.8rem; color:#cbd5e1 }
.trash{
  position:absolute; right:.35rem; top:.35rem; font-size:.9rem;
  background: transparent; border: none; color:#fca5a5
}

.adder{ display:flex; align-items:center; gap:.4rem; margin-top:.6rem }
.in{
  flex:1; background: rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.15); color:#fff; border-radius:.6rem;
  padding:.45rem .6rem
}
.add{
  background: rgba(59,130,246,.22); border:1px solid rgba(59,130,246,.35);
  color:#bfdbfe; padding:.45rem .7rem; border-radius:.6rem
}

.actions{ margin-top:.8rem; display:flex; gap:.5rem; flex-wrap:wrap }
.act{
  padding:.48rem .9rem; border-radius:.7rem; font-weight:700; border:1px solid transparent; color:#fff
}
.green{ background: rgba(16,185,129,.22); border-color: rgba(16,185,129,.35); color:#86efac }
.warn { background: rgba(245,158,11,.22); border-color: rgba(245,158,11,.35); color:#fde68a }
.ghost{ background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.18) }

/* screen reader only */
.sr-only{
  position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;
  clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
</style>
