<!-- src/components/Buttons/LiveSummary.vue -->
<template>
  <section class="panel" role="dialog" aria-modal="false" aria-label="Live Summary">
    <!-- Header -->
    <header class="hdr">
      <h2 class="title">📊 Live Summary</h2>
      <div class="hdr-actions">
        <button class="btn ghost" type="button" @click="emit('refresh')">Refresh</button>
        <button class="btn" type="button" @click="exportCsv">Export CSV</button>
        <button class="icon" type="button" title="Close" @click="emit('close')">✖</button>
      </div>
    </header>

    <!-- Meta line -->
    <div class="meta">
      <span>Duration: <b>{{ fmtDuration(stats.durationSec) }}</b></span>
      <span>Bitrate: <b>{{ stats.bitrateKbps }} kbps</b></span>
      <span>FPS: <b>{{ stats.fps }}</b></span>
      <span class="time">Updated: {{ updatedAgo }}</span>
    </div>

    <!-- KPI cards -->
    <div class="kpis">
      <div class="card">
        <div class="k">👀 Viewers</div>
        <div class="v">{{ compact(stats.viewers) }}</div>
        <div class="bar"><i :style="{ width: pct(stats.viewers, 10000) }"></i></div>
      </div>
      <div class="card">
        <div class="k">💗 Likes</div>
        <div class="v">{{ compact(stats.likes) }}</div>
        <div class="bar"><i :style="{ width: pct(stats.likes, 500000) }"></i></div>
      </div>
      <div class="card">
        <div class="k">🎁 Gifts</div>
        <div class="v">{{ compact(stats.gifts) }}</div>
        <div class="bar"><i :style="{ width: pct(stats.gifts, 5000) }"></i></div>
      </div>
      <div class="card">
        <div class="k">🪙 Coins</div>
        <div class="v">{{ compact(stats.coins) }}</div>
        <div class="bar"><i :style="{ width: pct(stats.coins, 100000) }"></i></div>
      </div>
    </div>

    <!-- Engagement chart (CSS bars – no deps) -->
    <div class="group">
      <div class="group-hdr">
        <h3>Engagement (last 10 min)</h3>
        <button class="btn xs" type="button" @click="randomizeEngagement">Simulate</button>
      </div>
      <div class="mini-chart" role="img" aria-label="Engagement spark bars">
        <span v-for="(n,i) in engagement" :key="i" :style="{ height: (10 + n*90) + '%' }"></span>
      </div>
    </div>

    <!-- Two columns: Top fans + Recent gifts -->
    <div class="cols">
      <div class="col">
        <h3 class="sub">👑 Top Fans</h3>
        <ul class="list">
          <li v-for="(f,i) in topFans" :key="f.name + i" class="rowli">
            <img :src="f.avatar || defaultAvatar" alt="" class="av" />
            <div class="li-body">
              <div class="li-head">
                <span class="name">{{ f.name }}</span>
                <span class="coins">+{{ compact(f.coins) }}</span>
              </div>
              <div class="progress">
                <i :style="{ width: pct(f.coins, maxFanCoins) }"></i>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div class="col">
        <h3 class="sub">🎁 Recent Gifts</h3>
        <ul class="list">
          <li v-for="(g,i) in recentGifts" :key="g.name + i" class="rowli">
            <div class="gicon">{{ g.icon || '🎁' }}</div>
            <div class="li-body">
              <div class="li-head">
                <span class="name">{{ g.name }}</span>
                <span class="coins">+{{ compact(g.amount || 0) }}</span>
              </div>
              <div class="time">{{ timeAgo(g.at) }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <footer class="actions">
      <button class="btn ghost" type="button" @click="reset">Reset Demo Data</button>
      <div class="sp"></div>
      <button class="btn primary" type="button" @click="emit('close')">Close</button>
    </footer>

    <!-- SR -->
    <div class="sr-only" aria-live="polite">{{ sr }}</div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, withDefaults } from 'vue'

type Stats = {
  viewers: number
  likes: number
  gifts: number
  coins: number
  durationSec: number
  bitrateKbps: number
  fps: number
}

type Fan = { name: string; avatar?: string; coins: number }
type Gift = { name: string; icon?: string; amount?: number; at: number }

const props = withDefaults(defineProps<{
  stats?: Partial<Stats>
  topFans?: Fan[]
  recentGifts?: Gift[]
  updatedAt?: number
}>(), {
  stats: () => ({
    viewers: 1280, likes: 41500, gifts: 96, coins: 138000,
    durationSec: 54 * 60, bitrateKbps: 2300, fps: 30,
  }),
  topFans: () => ([
    { name: 'Asha',  coins: 22000 },
    { name: 'Kelvin',coins: 17400 },
    { name: 'Mo',    coins: 15900 },
    { name: 'Zainab',coins: 12050 },
  ]),
  recentGifts: () => ([
    { name: 'Rocket', icon:'🚀', amount: 200, at: Date.now()-60_000 },
    { name: 'Trophy', icon:'🏆', amount: 500, at: Date.now()-3*60_000 },
    { name: 'Diamond',icon:'💎', amount: 1000, at: Date.now()-8*60_000 },
  ]),
  updatedAt: () => Date.now(),
})

const emit = defineEmits<{ (e:'close'):void; (e:'refresh'):void }>()
const sr = ref('')
const defaultAvatar = '/avatars/ai.png' // badili kama unahitaji

const stats = computed<Stats>(() => ({ 
  viewers: 0, likes: 0, gifts: 0, coins: 0, durationSec: 0, bitrateKbps: 0, fps: 0, 
  ...props.stats as Stats 
}))

const updatedAgo = computed(() => timeAgo(props.updatedAt))

// Simple engagement spark bars (0..1 values)
const engagement = ref<number[]>(new Array(20).fill(0).map(()=> Math.random()))
function randomizeEngagement(){ engagement.value = engagement.value.map(()=> Math.random()); sr.value='Engagement updated'; setTimeout(()=> sr.value='',800) }

// Helpers
function pct(n:number, max:number){ const p = Math.max(0, Math.min(1, n/(max||1))); return (p*100).toFixed(1)+'%' }
function compact(n:number){
  if (n>=1e9) return (n/1e9).toFixed(1)+'B'
  if (n>=1e6) return (n/1e6).toFixed(1)+'M'
  if (n>=1e3) return (n/1e3).toFixed(1)+'K'
  return String(n|0)
}
function fmtDuration(s:number){
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  return (h? h+':' : '') + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0')
}
function timeAgo(t?: number){
  if(!t) return 'now'
  const d = Math.max(0, Date.now()-t), m = Math.round(d/60000)
  if (m<1) return 'now'; if (m<60) return `${m}m ago`; const h = Math.round(m/60); return `${h}h ago`
}

const maxFanCoins = computed(() => Math.max(1, ...props.topFans!.map(f=>f.coins)))

function reset(){
  engagement.value = new Array(20).fill(0).map(()=> Math.random())
  sr.value = 'Demo data reset'; setTimeout(()=> sr.value='', 800)
}

function exportCsv(){
  // rudisha KPIs + tops & gifts kama CSV ya haraka
  const lines:string[] = []
  lines.push('metric,value')
  lines.push(`viewers,${stats.value.viewers}`)
  lines.push(`likes,${stats.value.likes}`)
  lines.push(`gifts,${stats.value.gifts}`)
  lines.push(`coins,${stats.value.coins}`)
  lines.push(`duration,${fmtDuration(stats.value.durationSec)}`)
  lines.push('')
  lines.push('top_fan,coins')
  props.topFans!.forEach(f=> lines.push(`${f.name},${f.coins}`))
  lines.push('')
  lines.push('gift,amount,when')
  props.recentGifts!.forEach(g=> lines.push(`${g.name},${g.amount||0},${new Date(g.at).toISOString()}`))
  const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'live-summary.csv'; a.click()
  URL.revokeObjectURL(url)
  sr.value = 'CSV exported'; setTimeout(()=> sr.value='', 800)
}
</script>

<style scoped>
.panel{
  width:min(96vw,900px);
  background:linear-gradient(180deg,rgba(2,6,23,.96),rgba(0,0,0,.96));
  border:1px solid rgba(255,255,255,.12);
  border-radius:1rem;
  color:#fff;
  padding:1rem;
  box-shadow:0 16px 60px rgba(0,0,0,.55);
}
.hdr{display:flex;align-items:center;justify-content:space-between;gap:.6rem}
.title{font-weight:800;font-size:1.1rem}
.hdr-actions{display:flex;gap:.4rem;align-items:center}
.icon{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:.5rem;color:#fff;padding:.2rem .5rem}

.meta{display:flex;flex-wrap:wrap;gap:.6rem;margin:.5rem 0;color:#cbd5e1}
.meta .time{opacity:.85}

.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:.8rem;padding:.7rem}
.card .k{color:#cbd5e1;font-size:.9rem}
.card .v{font-weight:800;font-size:1.25rem}
.bar{height:7px;background:rgba(255,255,255,.08);border-radius:999px;margin-top:.5rem;overflow:hidden;border:1px solid rgba(255,255,255,.1)}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#a855f7)}

.group{margin-top:.9rem;border:1px solid rgba(255,255,255,.12);border-radius:.8rem;padding:.7rem}
.group-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem}
.mini-chart{display:flex;gap:3px;align-items:flex-end;height:78px}
.mini-chart span{width:10px;background:linear-gradient(180deg,rgba(168,85,247,.9),rgba(34,211,238,.6));border-radius:3px}

.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;margin-top:.9rem}
.sub{font-weight:800;margin-bottom:.35rem}
.list{display:flex;flex-direction:column;gap:.5rem;max-height:240px;overflow:auto;padding-right:.25rem}
.rowli{display:flex;gap:.6rem;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:.7rem;padding:.45rem .6rem}
.av{width:36px;height:36px;border-radius:999px;object-fit:cover;border:1px solid rgba(255,255,255,.2)}
.gicon{font-size:20px}
.li-body{flex:1}
.li-head{display:flex;align-items:center;justify-content:space-between}
.name{font-weight:700}
.coins{font-weight:800;opacity:.95}
.progress{height:6px;background:rgba(255,255,255,.08);border-radius:999px;margin-top:.35rem;overflow:hidden;border:1px solid rgba(255,255,255,.1)}
.progress i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444)}

.actions{display:flex;align-items:center;gap:.5rem;margin-top:1rem}
.btn{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:.6rem;padding:.5rem .8rem;font-weight:700}
.btn.primary{background:rgba(59,130,246,.3);border-color:rgba(59,130,246,.45)}
.btn.ghost{background:rgba(255,255,255,.06)}
.btn.xs{padding:.25rem .5rem;font-size:.85rem}
.sp{flex:1}

@media (max-width: 860px){
  .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .cols{grid-template-columns:1fr}
}

.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
