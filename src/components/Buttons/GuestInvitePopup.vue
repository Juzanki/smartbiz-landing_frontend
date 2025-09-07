<!-- src/components/Buttons/GuestInvitePopup.vue -->
<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[73] grid place-items-center bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="invite-title"
      @keydown.esc.prevent="close"
    >
      <!-- Card -->
      <div class="card">
        <!-- Header -->
        <div class="hdr">
          <h2 id="invite-title" class="ttl">🤝 Invite a Guest</h2>
          <div class="actions">
            <button class="btn-secondary h-9" @click="refresh" :disabled="busy">Refresh</button>
            <button class="icon-btn h-9" @click="close" aria-label="Close">✖</button>
          </div>
        </div>

        <!-- Body -->
        <div class="body">
          <!-- Search -->
          <div class="search">
            <span class="glass">🔎</span>
            <input
              ref="searchRef"
              v-model.trim="q"
              type="search"
              class="inp"
              placeholder="Search name or @handle…"
              @input="onSearch"
              @keydown.down.prevent="focusFirst"
            />
          </div>

          <!-- Selected preview -->
          <transition name="fade">
            <div v-if="selected" class="selected">
              <img :src="selected.avatar || defaultAvatar" class="avatar" alt="" />
              <div class="col">
                <div class="name">
                  <span class="n">{{ selected.name }}</span>
                  <span v-if="selected.verified" class="v">✔</span>
                </div>
                <div class="meta">@{{ selected.username }}</div>
              </div>
              <button class="btn-tertiary" @click="selected = null">Clear</button>
            </div>
          </transition>

          <!-- List -->
          <div
            ref="listRef"
            class="list" role="listbox" aria-label="Invite suggestions"
            @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter.prevent="chooseFocused"
          >
            <template v-if="filtered.length">
              <div
                v-for="(p, i) in filtered" :key="p.id"
                class="row" :class="{ focused: i === focusedIndex }"
                role="option" :aria-selected="i === focusedIndex"
                @click="focusedIndex = i"
              >
                <div class="left">
                  <img :src="p.avatar || defaultAvatar" class="avatar" alt="" />
                  <div class="who">
                    <div class="name">
                      <span class="n">{{ p.name }}</span>
                      <span v-if="p.verified" class="v">✔</span>
                    </div>
                    <div class="meta">@{{ p.username }}</div>
                  </div>
                </div>

                <div class="right">
                  <button
                    class="btn-success"
                    :disabled="cooldown || busy"
                    @click="inviteOne(p)"
                    :aria-label="`Invite ${p.name}`"
                  >Invite</button>
                  <button
                    class="btn-secondary"
                    :disabled="busy"
                    @click="selectOne(p)"
                    aria-label="Select"
                  >Select</button>
                </div>
              </div>
            </template>

            <div v-else class="empty">
              <div class="emoji mb-1">🧑‍🤝‍🧑</div>
              <div class="text">No suggestions. Try searching above.</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="ftr">
          <div class="hint" v-if="cooldown">Please wait {{ cooldown }}s before sending again.</div>
          <div class="spacer"></div>
          <button class="btn-secondary" @click="close">Cancel</button>
          <button class="btn-primary" :disabled="!selected || cooldown || busy" @click="sendSelected">
            Send invite
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

/** ---------- Types ---------- */
type Person = {
  id: string | number
  name: string
  username: string
  avatar?: string
  verified?: boolean
}

/** ---------- Props / v-model ---------- */
const props = withDefaults(defineProps<{
  modelValue?: boolean
  people?: Person[]     // optional external suggestions
  cooldownSec?: number  // spam guard
}>(), {
  modelValue: false,
  people: () => [],
  cooldownSec: 6,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'close'): void
  (e: 'refresh'): void
  (e: 'search', term: string): void
  (e: 'invite', person: Person): void
}>()

const modelValue = ref(props.modelValue)
watch(() => props.modelValue, v => (modelValue.value = v))
watch(modelValue, v => emit('update:modelValue', v))

/** ---------- State ---------- */
const q = ref('')
const selected = ref<Person | null>(null)
const focusedIndex = ref(0)
const busy = ref(false)
const cooldown = ref(0)

const defaultAvatar = '/avatars/guest.png'
const listRef = ref<HTMLDivElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)

/** ---------- Data ---------- */
const suggestions = computed<Person[]>(() =>
  props.people.length ? props.people : demoPeople()
)

const filtered = computed(() => {
  const term = q.value.toLowerCase()
  if (!term) return suggestions.value.slice(0, 20)
  return suggestions.value.filter(p =>
    p.name.toLowerCase().includes(term) || p.username.toLowerCase().includes(term)
  ).slice(0, 30)
})

/** ---------- Methods ---------- */
function close(){ modelValue.value = false; emit('close') }
function refresh(){ emit('refresh') }

function onSearch(){ emit('search', q.value) }

function focusFirst(){ focusedIndex.value = 0; nextTick(scrollFocused) }
function move(delta: 1 | -1){
  if (!filtered.value.length) return
  const max = filtered.value.length - 1
  focusedIndex.value = Math.max(0, Math.min(max, focusedIndex.value + delta))
  nextTick(scrollFocused)
}
function chooseFocused(){
  const p = filtered.value[focusedIndex.value]
  if (p) selectOne(p)
}

function selectOne(p: Person){ selected.value = p }
function inviteOne(p: Person){ doInvite(p) }
function sendSelected(){ if (selected.value) doInvite(selected.value) }

function doInvite(p: Person){
  if (cooldown.value) return
  busy.value = true
  emit('invite', p) // mzazi anatuma halisi sererini
  startCooldown()
  setTimeout(() => { busy.value = false }, 350)
}

function startCooldown(){
  cooldown.value = props.cooldownSec
  const timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

function scrollFocused(){
  const list = listRef.value
  if (!list) return
  const el = list.querySelectorAll<HTMLElement>('.row')[focusedIndex.value]
  if (!el) return
  const top = el.offsetTop
  const bottom = top + el.offsetHeight
  const viewTop = list.scrollTop
  const viewBottom = viewTop + list.clientHeight
  if (top < viewTop) list.scrollTo({ top, behavior: 'smooth' })
  else if (bottom > viewBottom) list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' })
}

/** ---------- Demo fallback ---------- */
function demoPeople(): Person[] {
  const names = [
    ['Asha K', 'ashak'], ['Brian T', 'briant'], ['Cynthia', 'cyn'],
    ['Dre On', 'dreon'], ['Ema Jay', 'emaj'], ['Faiz', 'faiz'],
    ['Glo Rae', 'glorae'], ['Hafsa', 'hafsa']
  ]
  return names.map((n, i) => ({
    id: i + 1,
    name: n[0],
    username: n[1],
    verified: i % 3 === 0,
    avatar: defaultAvatar
  }))
}

/** ---------- Focus search when opens ---------- */
watch(modelValue, (v) => {
  if (v) setTimeout(() => searchRef.value?.focus(), 80)
})
</script>

<style scoped>
/* Layout */
.card{
  width: min(92vw, 780px);
  max-height: 88vh;
  display: flex; flex-direction: column;
  background: linear-gradient(180deg, rgba(2,6,23,.9), rgba(0,0,0,.9));
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 1rem;
  box-shadow: 0 20px 80px rgba(0,0,0,.5);
  color: #fff;
}
.hdr{ display:flex; align-items:center; justify-content:space-between; padding:.75rem 1rem; border-bottom:1px solid rgba(255,255,255,.1) }
.ttl{ font-weight: 800; font-size: 1.05rem }
.actions{ display:flex; gap:.5rem; align-items:center }

/* Body */
.body{ padding: .75rem 1rem 1rem; display:flex; flex-direction:column; gap:.75rem }
.search{ position: relative }
.glass{ position:absolute; left:.5rem; top:50%; transform:translateY(-50%); opacity:.7 }
.inp{
  width:100%; padding:.55rem .7rem .55rem 1.75rem;
  background: rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  border-radius:.75rem; color:#fff; outline:none;
}
.inp::placeholder{ color: rgba(255,255,255,.5) }
.inp:focus{ box-shadow:0 0 0 2px rgba(59,130,246,.6) }

.selected{
  display:flex; align-items:center; gap:.6rem;
  background: rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  padding:.5rem .6rem; border-radius:.75rem;
}
.col{ min-width:0 }
.name{ display:flex; align-items:center; gap:.25rem }
.n{ font-weight:700 }
.v{ color:#fde68a }
.meta{ font-size:12px; color: rgba(255,255,255,.7) }

.list{
  overflow:auto; max-height: 52vh; padding:.25rem; display:block;
  border-radius:.5rem;
}
.row{
  display:flex; align-items:center; justify-content:space-between;
  padding:.5rem .6rem; margin:.25rem 0;
  background: rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  border-radius:.75rem;
}
.row.focused{ outline:2px solid rgba(59,130,246,.6) }
.left{ display:flex; align-items:center; gap:.6rem; min-width:0 }
.who{ min-width:0 }
.right{ display:flex; gap:.4rem; align-items:center }

.avatar{ width:36px; height:36px; border-radius:999px; object-fit:cover; border:2px solid rgba(255,255,255,.4) }

.empty{ text-align:center; padding:2.2rem 1rem; color:#fff }
.emoji{ font-size:28px }
.text{ color: rgba(255,255,255,.8) }

/* Footer */
.ftr{
  display:flex; align-items:center; gap:.5rem; padding:.65rem 1rem;
  border-top:1px solid rgba(255,255,255,.1)
}
.hint{ font-size:12px; color: rgba(255,255,255,.7) }
.spacer{ flex:1 }

/* Buttons */
.icon-btn{
  background: rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);
  color:#fff; border-radius:.65rem; padding:0 .55rem;
}
.btn-secondary{
  background: rgba(255,255,255,.08);
  color:#fff; border:1px solid rgba(255,255,255,.12);
  padding:.5rem .8rem; border-radius:.7rem; font-size:12px;
}
.btn-tertiary{
  background: rgba(148,163,184,.18); color:#e5e7eb;
  padding:.38rem .6rem; border-radius:.6rem; font-size:12px
}
.btn-success{
  background: rgba(16,185,129,.15); color:#86efac;
  padding:.38rem .6rem; border-radius:.6rem; font-size:12px
}
.btn-primary{
  background: linear-gradient(135deg,#22c55e,#16a34a);
  color:#fff; padding:.48rem .9rem; border-radius:.75rem;
  font-weight:700; font-size:12px;
}

/* Fade helper */
.fade-enter-active,.fade-leave-active{ transition:opacity .15s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
</style>
