<template>
  <div class="lobby">
    <div class="head">
      <h1>🎥 Go Live</h1>
      <p class="sub">Anzisha live room na uwauzie moja kwa moja.</p>
    </div>

    <div class="card">
      <div class="row">
        <div class="info">
          <h2 class="ttl">Preview & Permissions</h2>
          <p class="txt">
            Utahitajika kuruhusu <b>Camera</b> na <b>Microphone</b> kwenye simu/desktop yako mara
            utakapoingia live room.
          </p>
        </div>
      </div>

      <button class="btn primary" @click="goLive">🔴 Go Live</button>

      <div class="tips">
        <small>Tip: Hakikisha uko kwenye mtandao imara (Wi-Fi/4G/5G).</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function makeRoomId () {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).toUpperCase()
}

async function goLive () {
  const id = makeRoomId()
  await router.push({ name: 'live-room', params: { id } })
}
</script>

<style scoped>
/* Mobile-first */
.lobby{min-height:100vh;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;padding:20px;background:#0b1220;color:#e5e7eb}
.head{text-align:center}
.head h1{font-size:1.5rem;margin:0 0 .25rem}
.sub{opacity:.8;font-size:.95rem;margin:0}
.card{width:min(520px,100%);background:#0f1a2f;border:1px solid #1f2a44;border-radius:16px;padding:16px;box-shadow:0 10px 24px rgba(0,0,0,.25)}
.row{display:flex;gap:12px;align-items:flex-start}
.info{flex:1}
.ttl{font-size:1rem;margin:.25rem 0}
.txt{opacity:.9;font-size:.95rem;margin:0 0 .5rem}
.btn{width:100%;padding:.9rem 1rem;border-radius:12px;border:none;font-weight:800}
.btn.primary{background:#dc2626;color:#fff}
.btn.primary:active{transform:translateY(1px)}
.tips{margin-top:10px;text-align:center;opacity:.8}
@media (min-width:720px){.head h1{font-size:1.9rem}.card{padding:20px}}
</style>
