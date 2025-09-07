<!-- src/components/Buttons/GuestJoinNotification.vue -->
<template>
  <!-- Kisu cha toasts, juu-kulia -->
  <div class="gj-root" aria-live="polite" aria-atomic="false">
    <transition-group name="gj-fade" tag="div" class="gj-stack">
      <div
        v-for="t in stack"
        :key="t.id"
        class="gj-card"
        :class="{ hiding: t.hiding }"
        @mouseenter="pause(t.id)"
        @mouseleave="resume(t.id)"
      >
        <!-- Kichwa: avatar + majina -->
        <div class="gj-head">
          <img
            class="gj-ava"
            :src="t.data.user.avatar || defaultAvatar"
            :alt="t.data.user.name"
            loading="lazy"
            decoding="async"
          />
          <div class="gj-who">
            <div class="gj-name">
              <span class="n">{{ t.data.user.name }}</span>
              <span v-if="t.data.user.verified" class="v">✔</span>
            </div>
            <div class="gj-meta">@{{ t.data.user.username }} · {{ timeAgo(t.data.sentAt) }}</div>
          </div>

          <button class="gj-close" type="button" aria-label="Dismiss" @click="dismiss(t.id)">✖</button>
        </div>

        <!-- Ujumbe -->
        <div class="gj-msg">
          {{ t.data.message || 'wants to join your LIVE' }}
        </div>

        <!-- Vitufe -->
        <div class="gj-actions">
          <button class="btn ok"      type="button" @click="accept(t.id)">Accept</button>
          <button class="btn neutral" type="button" @click="decline(t.id)">Decline</button>
          <button class="btn danger"  type="button" @click="block(t.id)">Block</button>
          <button class="btn ghost"   type="button" @click="view(t.id)">View</button>
          <button class="btn ghost"   type="button" @click="emit('open-requests')">Open requests</button>
        </div>
      </div>
    </transition-group>

    <!-- SR helper (inapiga tangazo fupi kwa item ya juu) -->
    <div class="sr-only">
      <span v-if="stack[0]">
        Request from {{ stack[0].data.user.name }}; press Accept or Decline.
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, withDefaults, defineProps, defineEmits } from 'vue'

type Person = {
  id: string | number
  name: string
  username: string
  avatar?: string
  verified?: boolean
}
type JoinRequest = {
  id: string | number
  user: Person
  message?: string
  sentAt?: number      // epoch ms
}

const props = withDefaults(defineProps<{
  /** orodha ya notisi mpya (optional, unaweza pia kutumia expose: push()) */
  queue?: JoinRequest[]
  /** muda (ms) kabla ya ku-auto hide */
  autoHideMs?: number
  /** stack ya juu itaruhusu toasts ngapi kwa wakati mmoja */
  maxStack?: number
  /** tusitishe auto-hide tukishika kwa mouse */
  pauseOnHover?: boolean
}>(), {
  queue: () => [],
  autoHideMs: 4200,
  maxStack: 3,
  pauseOnHover: true,
})

const emit = defineEmits<{
  (e: 'accept', item: JoinRequest): void
  (e: 'decline', item: JoinRequest): void
  (e: 'block', item: JoinRequest): void
  (e: 'dismiss', item: JoinRequest): void
  (e: 'view', item: JoinRequest): void
  (e: 'open-requests'): void
}>()

/** ndani: tunaweka timers kwa kila toast */
type Toast = { id: string|number; data: JoinRequest; hiding: boolean; leftMs: number; t?: number }
const stack = ref<Toast[]>([])
const defaultAvatar = '/avatars/guest.png'

/** ongeza notisi mpya kwenye stack */
function push(n: JoinRequest){
  // kama tayari ipo, usiweke tena
  if (stack.value.some(t => t.id === n.id)) return
  const t: Toast = {
    id: n.id,
    data: { ...n, sentAt: n.sentAt ?? Date.now() },
    hiding: false,
    leftMs: props.autoHideMs,
  }
  stack.value.unshift(t)
  trim()
  startTimer(t.id)
}
function trim(){
  while (stack.value.length > props.maxStack) {
    const last = stack.value.pop()
    if (last?.t) clearInterval(last.t)
  }
}

function startTimer(id: Toast['id']){
  const i = stack.value.findIndex(s => s.id === id)
  if (i < 0) return
  const toast = stack.value[i]
  if (toast.t) clearInterval(toast.t)
  toast.t = window.setInterval(() => {
    toast.leftMs -= 100
    if (toast.leftMs <= 0) {
      clearInterval(toast.t)
      toast.hiding = true
      setTimeout(() => remove(id, true), 160)
    }
  }, 100)
}
function pause(id: Toast['id']){
  if (!props.pauseOnHover) return
  const t = stack.value.find(s => s.id === id)
  if (t?.t) { clearInterval(t.t); t.t = undefined }
}
function resume(id: Toast['id']){
  if (!props.pauseOnHover) return
  const t = stack.value.find(s => s.id === id)
  if (t && !t.t) startTimer(id)
}

function remove(id: Toast['id'], auto=false){
  const i = stack.value.findIndex(s => s.id === id)
  if (i < 0) return
  const t = stack.value[i]
  if (t.t) clearInterval(t.t)
  stack.value.splice(i,1)
  if (auto) emit('dismiss', t.data)
}

function accept(id: Toast['id']){
  const t = stack.value.find(s => s.id === id)
  if (!t) return
  emit('accept', t.data)
  dismiss(id)
}
function decline(id: Toast['id']){
  const t = stack.value.find(s => s.id === id)
  if (!t) return
  emit('decline', t.data)
  dismiss(id)
}
function block(id: Toast['id']){
  const t = stack.value.find(s => s.id === id)
  if (!t) return
  emit('block', t.data)
  dismiss(id)
}
function view(id: Toast['id']){
  const t = stack.value.find(s => s.id === id)
  if (!t) return
  emit('view', t.data)
}
function dismiss(id: Toast['id']){
  const t = stack.value.find(s => s.id === id)
  if (!t) return
  t.hiding = true
  setTimeout(() => remove(id), 140)
}

/** saidizi: muda uliopita */
function timeAgo(ts?: number){
  const sec = Math.max(1, Math.floor(((Date.now() - (ts ?? Date.now())))/1000))
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec/60); if (m < 60) return `${m}m`
  const h = Math.floor(m/60);   if (h < 24) return `${h}h`
  const d = Math.floor(h/24);   return `${d}d`
}

/** sync na props.queue (ongeza tu vipya) */
watch(() => props.queue, (v) => {
  v?.forEach(push)
}, { deep: true, immediate: true })

/** expose API kwa mzazi (hiari) */
defineExpose({ push, dismiss, accept, decline, block })

onBeforeUnmount(() => {
  stack.value.forEach(s => s.t && clearInterval(s.t))
})
</script>

<style scoped>
.gj-root{
  position: fixed;
  right: .75rem; top: .75rem;
  z-index: 80;
  pointer-events: none;
}
.gj-stack{ display:flex; flex-direction:column; gap:.55rem }

.gj-card{
  width: min(92vw, 360px);
  background: linear-gradient(180deg, rgba(2,6,23,.92), rgba(0,0,0,.94));
  border: 1px solid rgba(255,255,255,.12);
  border-radius: .9rem;
  box-shadow: 0 10px 40px rgba(0,0,0,.45);
  padding: .6rem .7rem .65rem .7rem;
  color: #fff;
  pointer-events: auto;
  transition: transform .14s ease, opacity .14s ease, border-color .14s ease;
}
.gj-card:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.2) }
.gj-card.hiding{ opacity: 0; transform: translateY(-4px) }

.gj-head{ display:flex; align-items:center; gap:.55rem }
.gj-ava{ width:38px; height:38px; border-radius:999px; object-fit:cover; border:2px solid rgba(255,255,255,.4) }
.gj-who{ min-width:0; flex:1 }
.gj-name{ display:flex; align-items:center; gap:.3rem; font-weight:800 }
.gj-name .n{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 12rem }
.gj-name .v{ color:#fde68a }
.gj-meta{ font-size:12px; color:rgba(255,255,255,.7) }
.gj-close{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  color:#fff; border-radius:.5rem; padding:.15rem .4rem;
}

.gj-msg{ margin:.35rem 0 .5rem; font-size: .95rem; color:#e5e7eb }

.gj-actions{ display:flex; flex-wrap:wrap; gap:.4rem }
.btn{
  font-size:12px; border-radius:.6rem; padding:.38rem .6rem;
  border:1px solid transparent; transition: filter .12s ease
}
.btn.ok{ background: rgba(16,185,129,.18); color:#86efac; border-color: rgba(16,185,129,.25) }
.btn.neutral{ background: rgba(148,163,184,.18); color:#e5e7eb; border-color: rgba(148,163,184,.25) }
.btn.danger{ background: rgba(244,63,94,.18); color:#fda4af; border-color: rgba(244,63,94,.25) }
.btn.ghost{ background: rgba(255,255,255,.08); color:#fff; border-color: rgba(255,255,255,.15) }
.btn:hover{ filter: brightness(1.05) }

/* transitions */
.gj-fade-enter-active, .gj-fade-leave-active{ transition: all .14s ease }
.gj-fade-enter-from{ opacity:0; transform: translateY(-6px) }
.gj-fade-leave-to{ opacity:0; transform: translateY(-6px) }

/* screen-reader only */
.sr-only{
  position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;
  clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
</style>
