<!-- src/components/Buttons/RequestToJoin.vue -->
<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[72] grid place-items-center bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="rtj-title"
      @keydown.esc.prevent="close"
    >
      <div class="card">
        <!-- Header -->
        <div class="hdr">
          <div class="l">
            <h2 id="rtj-title" class="ttl">🙋 Requests to Join</h2>
            <div class="sub">
              <span>Pending: <b>{{ pendingCount }}</b></span>
              <span class="dot">•</span>
              <span>Selected: {{ selectedCount }}</span>
            </div>
          </div>

          <div class="r">
            <button class="btn-secondary h-9" @click="emit('refresh')" :disabled="busy">Refresh</button>
            <button class="icon-btn h-9" @click="close" aria-label="Close">✖</button>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="bar">
          <div class="left">
            <div class="search">
              <span class="glass">🔎</span>
              <input
                ref="qRef"
                v-model.trim="q"
                type="search"
                class="inp"
                placeholder="Search name or @handle…"
                @input="emit('search', q)"
              />
            </div>

            <div class="chips">
              <button class="chip" :class="{ active: filter==='all' }" @click="filter='all'">All</button>
              <button class="chip" :class="{ active: filter==='pending' }" @click="filter='pending'">Pending</button>
              <button class="chip" :class="{ active: filter==='approved' }" @click="filter='approved'">Approved</button>
              <button class="chip" :class="{ active: filter==='declined' }" @click="filter='declined'">Declined</button>
              <button class="chip" :class="{ active: filter==='blocked' }" @click="filter='blocked'">Blocked</button>
            </div>
          </div>

          <div class="right">
            <button class="btn-tertiary" @click="selectAll" :disabled="!filtered.length">Select all</button>
            <button class="btn-tertiary" @click="invertSel" :disabled="!filtered.length">Invert</button>
            <button class="btn-success"  @click="bulkApprove" :disabled="selectedCount===0 || busy">Approve</button>
            <button class="btn-secondary" @click="bulkDecline" :disabled="selectedCount===0 || busy">Decline</button>
            <button class="btn-danger"   @click="bulkBlock"   :disabled="selectedCount===0 || busy">Block</button>
          </div>
        </div>

        <!-- List -->
        <div
          ref="listRef"
          class="list"
          role="listbox" aria-label="Requests"
          @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter.prevent="approveFocused"
        >
          <template v-if="filtered.length">
            <div
              v-for="(r, i) in filtered"
              :key="r.id"
              class="row" :class="{ focused: i===focusedIndex, sel: selected.has(r.id) }"
              role="option" :aria-selected="selected.has(r.id)"
              @click="focusedIndex = i"
            >
              <label class="selbox">
                <input type="checkbox" :checked="selected.has(r.id)" @change="toggleSel(r.id)" />
              </label>

              <img :src="r.user.avatar || defaultAvatar" class="avatar" alt="" />

              <div class="who">
                <div class="nm">
                  <span class="n">{{ r.user.name }}</span>
                  <span v-if="r.user.verified" class="v">✔</span>
                </div>
                <div class="meta">@{{ r.user.username }} · {{ timeAgo(r.sentAt) }}</div>
                <div v-if="r.message" class="msg">“{{ r.message }}”</div>
              </div>

              <div class="tags">
                <span class="pill" :class="statusClass(r.status)">{{ r.status }}</span>
              </div>

              <div class="actions">
                <button class="btn-success"  @click.stop="approve(r)" :disabled="busy || r.status!=='pending'">Approve</button>
                <button class="btn-secondary" @click.stop="decline(r)" :disabled="busy || r.status!=='pending'">Decline</button>
                <button class="btn-danger"   @click.stop="block(r)"   :disabled="busy">Block</button>
              </div>
            </div>

            <div class="pager" v-if="canLoadMore">
              <button class="btn-secondary" @click="emit('load-more')" :disabled="busy">Load more…</button>
            </div>
          </template>

          <div v-else class="empty">
            <div class="emoji">🫶</div>
            <div>No requests right now.</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="ftr">
          <div class="hint" v-if="cooldown">Please wait {{ cooldown }}s…</div>
          <div class="spacer"></div>
          <button class="btn-secondary" @click="close">Close</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

type Person = { id: string|number; name: string; username: string; avatar?: string; verified?: boolean }
type Rtj = { id: string|number; user: Person; sentAt: number; message?: string; status: 'pending'|'approved'|'declined'|'blocked' }

const props = withDefaults(defineProps<{
  modelValue?: boolean
  items?: Rtj[]
  canLoadMore?: boolean
  cooldownSec?: number
}>(), {
  modelValue: false,
  items: () => [],
  canLoadMore: false,
  cooldownSec: 2
})

const emit = defineEmits<{
  (e:'update:modelValue', v:boolean): void
  (e:'refresh'): void
  (e:'search', q:string): void
  (e:'approve', item: Rtj): void
  (e:'decline', item: Rtj): void
  (e:'block',   item: Rtj): void
  (e:'bulk-approve', ids: Array<Rtj['id']>): void
  (e:'bulk-decline', ids: Array<Rtj['id']>): void
  (e:'bulk-block',   ids: Array<Rtj['id']>): void
  (e:'load-more'): void
}>()

const modelValue = ref(props.modelValue)
watch(() => props.modelValue, v => (modelValue.value = v))
watch(modelValue, v => emit('update:modelValue', v))

/* State */
const q = ref('')
const filter = ref<'all'|'pending'|'approved'|'declined'|'blocked'>('pending')
const focusedIndex = ref(0)
const selected = ref<Set<Rtj['id']>>(new Set())
const busy = ref(false)
const cooldown = ref(0)
const qRef = ref<HTMLInputElement|null>(null)
const listRef = ref<HTMLDivElement|null>(null)
const defaultAvatar = '/avatars/guest.png'

/* Data */
const list = computed<Rtj[]>(() => props.items.length ? props.items : demoItems())
const filtered = computed(() => {
  const s = q.value.toLowerCase()
  return list.value.filter(r => {
    const okStatus = filter.value==='all' ? true : r.status===filter.value
    const okText = !s || r.user.name.toLowerCase().includes(s) || r.user.username.toLowerCase().includes(s)
    return okStatus && okText
  })
})
const pendingCount = computed(() => list.value.filter(r => r.status==='pending').length)
const selectedCount = computed(() => selected.value.size)
const canLoadMore = computed(() => props.canLoadMore)

/* Actions */
function close(){ modelValue.value = false }
function toggleSel(id: Rtj['id']){ selected.value.has(id) ? selected.value.delete(id) : selected.value.add(id) }
function selectAll(){ filtered.value.forEach(r => selected.value.add(r.id)) }
function invertSel(){
  const next = new Set<Rtj['id']>()
  filtered.value.forEach(r => { if (!selected.value.has(r.id)) next.add(r.id) })
  selected.value = next
}

function approve(r: Rtj){ if (r.status!=='pending') return; doOne('approve', r) }
function decline(r: Rtj){ if (r.status!=='pending') return; doOne('decline', r) }
function block(r: Rtj){ doOne('block', r) }

function doOne(kind:'approve'|'decline'|'block', r: Rtj){
  if (busy.value) return
  busy.value = true
  if (kind==='approve') emit('approve', r)
  if (kind==='decline') emit('decline', r)
  if (kind==='block')   emit('block', r)
  startCooldown()
  setTimeout(() => busy.value = false, 200)
}

function bulkApprove(){ doBulk('bulk-approve') }
function bulkDecline(){ doBulk('bulk-decline') }
function bulkBlock(){   doBulk('bulk-block') }
function doBulk(kind:'bulk-approve'|'bulk-decline'|'bulk-block'){
  if (busy.value || selected.value.size===0) return
  busy.value = true
  const ids = Array.from(selected.value)
  if (kind==='bulk-approve') emit('bulk-approve', ids)
  if (kind==='bulk-decline') emit('bulk-decline', ids)
  if (kind==='bulk-block')   emit('bulk-block', ids)
  startCooldown()
  setTimeout(() => busy.value = false, 250)
}

function startCooldown(){
  cooldown.value = props.cooldownSec
  const t = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(t)
  }, 1000)
}

/* Keyboard nav */
function move(d:number){
  const max = filtered.value.length - 1
  focusedIndex.value = Math.max(0, Math.min(max, focusedIndex.value + d))
  nextTick(() => {
    const el = listRef.value?.querySelectorAll<HTMLElement>('.row')[focusedIndex.value]
    if (!el || !listRef.value) return
    const top = el.offsetTop, bottom = top + el.offsetHeight
    const vt = listRef.value.scrollTop, vb = vt + listRef.value.clientHeight
    if (top < vt) listRef.value.scrollTo({ top, behavior: 'smooth' })
    else if (bottom > vb) listRef.value.scrollTo({ top: bottom - listRef.value.clientHeight, behavior: 'smooth' })
  })
}
function approveFocused(){
  const r = filtered.value[focusedIndex.value]
  if (r) approve(r)
}

/* Helpers */
function statusClass(s: Rtj['status']){ return s==='pending' ? 'warn' : s==='approved' ? 'ok' : s==='blocked' ? 'err' : 'muted' }
function timeAgo(ts:number){
  const sec = Math.max(1, Math.floor((Date.now() - ts)/1000))
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec/60); if (min < 60) return `${min}m`
  const hr  = Math.floor(min/60); if (hr  < 24) return `${hr}h`
  const d   = Math.floor(hr/24);  return `${d}d`
}

/* Demo fallback (ikikosa data kutoka kwa props) */
function demoItems(): Rtj[] {
  const base = Date.now() - 5*60*1000
  const people: Person[] = [
    { id:1, name:'Asha K',  username:'ashak',  verified:true  },
    { id:2, name:'Brian T', username:'briant', verified:false },
    { id:3, name:'Cynthia', username:'cyn',    verified:true  },
    { id:4, name:'Dre On',  username:'dreon',  verified:false },
  ]
  return people.map((p,i) => ({
    id: i+1, user: p, sentAt: base + i*40_000, message: i%2? 'Hey host, can I join?':'' , status:'pending'
  }))
}

/* Focus search when opened */
watch(modelValue, v => { if (v) setTimeout(() => qRef.value?.focus(), 80) })
</script>

<style scoped>
.card{
  width:min(92vw, 920px); max-height:88vh; display:flex; flex-direction:column; color:#fff;
  background:linear-gradient(180deg, rgba(2,6,23,.92), rgba(0,0,0,.9));
  border:1px solid rgba(255,255,255,.1); border-radius:1rem; box-shadow:0 20px 80px rgba(0,0,0,.5);
}
.hdr{ display:flex; justify-content:space-between; align-items:center; padding:.75rem 1rem; border-bottom:1px solid rgba(255,255,255,.1) }
.ttl{ font-weight:800; font-size:1.05rem }
.sub{ font-size:.85rem; color:rgba(255,255,255,.75); display:flex; gap:.4rem; align-items:center }
.dot{ opacity:.6 }
.r{ display:flex; gap:.5rem; align-items:center }

.bar{ display:flex; justify-content:space-between; gap:.75rem; padding:.6rem 1rem; border-bottom:1px solid rgba(255,255,255,.08) }
.left{ display:flex; gap:.6rem; align-items:center; flex-wrap:wrap }
.search{ position:relative }
.glass{ position:absolute; left:.5rem; top:50%; transform:translateY(-50%); opacity:.75 }
.inp{ width:260px; max-width:62vw; padding:.5rem .65rem .5rem 1.65rem; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:.7rem }
.inp:focus{ outline:none; box-shadow:0 0 0 2px rgba(59,130,246,.6) }
.chips{ display:flex; gap:.35rem; flex-wrap:wrap }
.chip{ padding:.4rem .65rem; border-radius:999px; font-size:12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); color:#fff }
.chip.active{ background:linear-gradient(135deg,#06b6d4,#a855f7); border-color:rgba(255,255,255,.25) }

.list{ overflow:auto; max-height:56vh; padding:.5rem 1rem }
.row{
  display:grid; grid-template-columns:auto auto 1fr auto auto; align-items:center; gap:.55rem;
  padding:.55rem .6rem; margin:.4rem 0; border-radius:.8rem;
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
}
.row.focused{ outline:2px solid rgba(59,130,246,.6) }
.selbox{ display:flex; align-items:center; justify-content:center }
.avatar{ width:40px; height:40px; border-radius:999px; object-fit:cover; border:2px solid rgba(255,255,255,.4) }
.who{ min-width:0 }
.nm{ display:flex; align-items:center; gap:.25rem }
.n{ font-weight:700 }
.v{ color:#fde68a }
.meta{ font-size:12px; color:rgba(255,255,255,.7) }
.msg{ margin-top:.15rem; font-size:12px; color:#e5e7eb }
.tags{ display:flex; gap:.35rem; align-items:center; justify-self:start }
.pill{ font-size:11px; padding:.15rem .45rem; border-radius:.55rem; background:rgba(148,163,184,.2); color:#e5e7eb }
.pill.ok{ background:rgba(16,185,129,.18); color:#86efac }
.pill.warn{ background:rgba(245,158,11,.18); color:#fcd34d }
.pill.err{ background:rgba(244,63,94,.18); color:#fda4af }
.pill.muted{ background:rgba(148,163,184,.18); color:#cbd5e1 }
.actions{ display:flex; gap:.35rem; justify-self:end }

.pager{ text-align:center; padding:.6rem 0 }
.empty{ text-align:center; padding:2.2rem 1rem; color:#fff }
.emoji{ font-size:28px }

.ftr{ display:flex; align-items:center; gap:.5rem; padding:.65rem 1rem; border-top:1px solid rgba(255,255,255,.1) }
.hint{ font-size:12px; color:rgba(255,255,255,.75) }
.spacer{ flex:1 }

/* Buttons */
.icon-btn{ background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:.65rem; padding:.28rem .55rem }
.btn-secondary{ background:rgba(255,255,255,.08); color:#fff; border:1px solid rgba(255,255,255,.12); padding:.45rem .7rem; border-radius:.7rem; font-size:12px }
.btn-tertiary{ background:rgba(148,163,184,.18); color:#e5e7eb; padding:.38rem .6rem; border-radius:.6rem; font-size:12px }
.btn-success{ background:rgba(16,185,129,.15); color:#86efac; padding:.38rem .6rem; border-radius:.6rem; font-size:12px }
.btn-danger{ background:rgba(244,63,94,.18); color:#fda4af; padding:.38rem .6rem; border-radius:.6rem; font-size:12px }
</style>
