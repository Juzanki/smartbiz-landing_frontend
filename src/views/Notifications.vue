<template>
  <div class="wrap">
    <!-- Header -->
    <header class="bar">
      <h1 class="ttl">🔔 Notifications</h1>
      <div class="actions">
        <button class="btn ghost" @click="markAllRead" :disabled="unreadCount===0">Mark all</button>
        <button class="btn warn"  @click="clearAll" :disabled="list.length===0">Clear</button>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="tabs" role="tablist">
      <button
        class="tab"
        :class="{on: tab==='all'}"
        role="tab"
        @click="tab='all'">
        All
        <span v-if="list.length" class="chip">{{ list.length }}</span>
      </button>
      <button
        class="tab"
        :class="{on: tab==='unread'}"
        role="tab"
        @click="tab='unread'">
        Unread
        <span v-if="unreadCount" class="chip">{{ unreadCount }}</span>
      </button>
    </nav>

    <!-- Empty state -->
    <section v-if="filtered.length===0" class="empty">
      <div class="emoji">📭</div>
      <h3>No notifications</h3>
      <p class="muted">You're all caught up.</p>
    </section>

    <!-- List -->
    <ul v-else class="list">
      <li
        v-for="n in filtered"
        :key="n.id"
        class="item"
        :class="{ unread: !n.read }"
        role="button"
        @click="toggleRead(n)"
      >
        <div class="lead" :data-type="n.type">{{ icon(n.type) }}</div>

        <div class="body">
          <div class="row1">
            <span class="title">{{ n.title }}</span>
            <time class="time" :datetime="n.date">{{ relTime(n.date) }}</time>
          </div>
          <p class="msg">{{ n.message }}</p>
          <div class="meta">
            <span class="dot" aria-hidden="true"></span>
            <span class="src">{{ n.source }}</span>
          </div>
        </div>
      </li>
    </ul>

    <!-- Safe-area padding for mobiles with gesture bars -->
    <div class="safe-bottom" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const tab = ref('all')
const list = ref([])

onMounted(() => {
  const saved = localStorage.getItem('sb_notifications')
  if (saved) {
    list.value = JSON.parse(saved)
  } else {
    // Seed demo data
    list.value = [
      {
        id: 1,
        type: 'order',
        title: 'New Order Placed',
        message: 'A new order has been placed by a customer.',
        source: 'Orders',
        date: '2025-05-03T10:30:00Z',
        read: false
      },
      {
        id: 2,
        type: 'account',
        title: 'Account Update',
        message: 'Your account has been successfully updated.',
        source: 'System',
        date: '2025-05-02T14:15:00Z',
        read: true
      }
    ]
    persist()
  }
})

const filtered = computed(() =>
  tab.value === 'unread' ? list.value.filter(n => !n.read) : list.value
)

const unreadCount = computed(() => list.value.filter(n => !n.read).length)

function toggleRead(n) {
  n.read = !n.read
  persist()
}

function markAllRead() {
  list.value.forEach(n => (n.read = true))
  persist()
}

function clearAll() {
  if (!list.value.length) return
  if (confirm('Clear all notifications?')) {
    list.value = []
    persist()
  }
}

function persist() {
  localStorage.setItem('sb_notifications', JSON.stringify(list.value))
}

function icon(type) {
  switch (type) {
    case 'order':   return '🛒'
    case 'payment': return '💳'
    case 'message': return '✉️'
    case 'account': return '⚙️'
    default:        return '🔔'
  }
}

function relTime(iso) {
  const now = new Date()
  const t   = new Date(iso)
  const s   = Math.max(1, Math.floor((now - t) / 1000))

  const units = [
    ['y', 60*60*24*365],
    ['mo',60*60*24*30],
    ['d', 60*60*24],
    ['h', 60*60],
    ['m', 60]
  ]
  for (const [u, sec] of units) {
    const v = Math.floor(s / sec)
    if (v >= 1) return `${v}${u} ago`
  }
  return 'just now'
}
</script>

<style scoped>
:root{
  --bg:#ffffff; --fg:#0f172a; --muted:#64748b; --line:#e5e7eb;
  --brand:#2563eb; --warn:#ef4444; --card:#ffffff; --shadow:0 10px 24px rgba(0,0,0,.06);
}

.wrap{ max-width:820px; margin-inline:auto; padding:12px; color:var(--fg); }

.bar{
  display:flex; align-items:center; justify-content:space-between;
  margin:4px 0 10px;
}
.ttl{ font-size:1.25rem; font-weight:800; margin:0; }
.actions{ display:flex; gap:8px; }

.btn{
  padding:.5rem .8rem; border-radius:10px; font-weight:800; border:1px solid var(--line);
  background:#111827; color:#fff;
}
.btn:disabled{ opacity:.5 }
.btn.ghost{ background:#fff; color:#111827; }
.btn.warn{ background:var(--warn); border-color:var(--warn); }

.tabs{
  display:flex; gap:8px; margin:6px 0 12px; position:sticky; top:0; z-index:5;
  background:linear-gradient(#fff,#fff); padding-bottom:4px;
}
.tab{
  border:1px solid var(--line); background:#fff; color:var(--fg);
  padding:.45rem .8rem; border-radius:999px; font-weight:800;
}
.tab.on{ background:var(--brand); color:#fff; border-color:var(--brand); }
.chip{ background:rgba(255,255,255,.25); border:1px solid rgba(255,255,255,.4); border-radius:999px; padding:0 .4rem; margin-left:.35rem; }

.empty{
  text-align:center; padding:48px 12px; color:var(--muted);
  border:1px dashed var(--line); border-radius:16px; background:#fafafa;
}
.empty .emoji{ font-size:2rem; margin-bottom:6px; }

.list{ list-style:none; margin:0; padding:0; display:grid; gap:10px; }
.item{
  display:flex; gap:12px; align-items:flex-start; background:var(--card);
  border:1px solid var(--line); border-radius:16px; padding:12px; box-shadow:var(--shadow);
  transition:transform .05s ease;
}
.item:active{ transform:scale(.99); }
.item.unread{ border-color:#c7d2fe; background:#f8fafc; }

.lead{
  width:42px; height:42px; border-radius:12px; display:grid; place-items:center;
  font-size:1.2rem; background:#eef2ff; border:1px solid #e5e7eb; flex:0 0 auto;
}
.lead[data-type="payment"]{ background:#fff7ed }
.lead[data-type="message"]{ background:#f0fdf4 }
.lead[data-type="account"]{ background:#f1f5f9 }

.body{ flex:1 1 auto; min-width:0; }
.row1{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.title{ font-weight:800; }
.time{ color:var(--muted); font-size:.85rem; white-space:nowrap; }
.msg{ margin:.15rem 0 .25rem; color:#334155; overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; }
.meta{ display:flex; align-items:center; gap:6px; color:var(--muted); font-size:.85rem; }
.dot{
  width:8px; height:8px; background:#22c55e; border-radius:999px; display:inline-block;
}

.safe-bottom{ height: max(env(safe-area-inset-bottom), 10px); }
@media (min-width:768px){
  .wrap{ padding:16px; }
}
</style>
