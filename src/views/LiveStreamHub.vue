<template>
  <div class="page">
    <!-- Camera -->
    <video ref="videoRef" class="video" autoplay playsinline muted></video>

    <!-- Top controls -->
    <div class="topbar">
      <div class="left">
        <span v-if="inRoom" class="pill live">LIVE</span>
        <button v-if="inRoom" class="btn danger sm" @click="leaveRoom">Leave</button>
      </div>

      <div class="right">
        <button class="btn ghost sm" :aria-pressed="!micOn" @click="toggleMic">
          {{ micOn ? '🎙️ Mic On' : '🔇 Mic Off' }}
        </button>
        <button class="btn ghost sm" :aria-pressed="!camOn" @click="toggleCam">
          {{ camOn ? '📷 Cam On' : '🚫 Cam Off' }}
        </button>
        <button class="btn ghost sm" @click="switchCamera">🔄 Switch</button>
      </div>
    </div>

    <!-- Gift animations -->
    <transition-group tag="div" name="gift" class="gift-layer">
      <div v-for="g in animatedGifts" :key="g.uid" class="gift" :style="g.style">
        <img :src="g.image" :alt="g.name" />
        <div class="gift-label">{{ g.name }}</div>
      </div>
    </transition-group>

    <!-- Floating product -->
    <transition name="fade">
      <div v-if="currentProduct" :class="['product', positionClass]">
        <div class="product-card">
          <img :src="currentProduct.image || defaultProd" alt="" />
          <div class="name">{{ currentProduct.name }}</div>
          <div class="price">TZS {{ formatAmount(currentProduct.price) }}</div>
          <button class="btn buy" @click="placeOrder(currentProduct)">Buy Now</button>
        </div>
      </div>
    </transition>

    <!-- Bottom toolbar -->
    <div class="toolbar">
      <!-- LOBBY: Go Live navigates to room -->
      <button v-if="!inRoom" class="btn primary" @click="goLive">🔴 Go Live</button>

      <!-- ROOM: Stop only stops camera; Leave exits route -->
      <button v-else class="btn danger" @click="stopStream">⏹ Stop</button>

      <button class="btn" @click="openProductModal">🛒 Set Product</button>
      <button class="btn warn" @click="sendGift">🎁 Send Gift</button>
      <button class="btn ghost" @click="chatOpen = !chatOpen">
        💬 {{ chatOpen ? 'Hide Chat' : 'Show Chat' }}
      </button>
    </div>

    <!-- Chat drawer -->
    <aside class="chat" :class="{ open: chatOpen }" aria-live="polite">
      <div class="chat-header">
        <strong>Chat</strong>
        <button class="btn ghost sm" @click="chatOpen = false">✖</button>
      </div>
      <div class="chat-body" ref="chatBodyRef">
        <div v-for="msg in chatMessages" :key="msg.id" class="msg">
          <b>{{ msg.user }}</b>: {{ msg.text }}
        </div>
      </div>
      <form class="chat-input" @submit.prevent="sendChat">
        <input v-model="draft" type="text" placeholder="Type a message…" />
        <button class="btn primary sm" type="submit">Send</button>
      </form>
    </aside>

    <!-- Product sheet/modal -->
    <transition name="sheet">
      <div v-if="showProductModal" class="sheet-backdrop" @click.self="showProductModal = false">
        <div class="sheet">
          <div class="sheet-head">
            <h3>Set Product</h3>
            <button class="btn ghost sm" @click="showProductModal = false">✖</button>
          </div>

          <div class="sheet-body">
            <label class="lbl">Name
              <input v-model.trim="product.name" class="inp" type="text" placeholder="Product Name" />
            </label>

            <label class="lbl">Price (TZS)
              <input v-model.number="product.price" class="inp" type="number" min="0" step="1" placeholder="0" />
            </label>

            <label class="lbl">Image
              <input class="inp" type="file" accept="image/*" @change="handleImageUpload" />
            </label>

            <div v-if="product.image" class="preview">
              <img :src="product.image" alt="preview" />
            </div>

            <label class="lbl">Position
              <select v-model="product.position" class="inp">
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
          </div>

          <div class="sheet-foot">
            <button class="btn ghost" @click="showProductModal = false">Cancel</button>
            <button class="btn primary" @click="setProduct">Set</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* Router — detect if we’re in a live room and auto-start stream */
const router = useRouter()
const route = useRoute()
const inRoom = computed(() => Boolean(route.params.id))

/* State */
const videoRef = ref(null)
const chatBodyRef = ref(null)
const streamRef = ref(null)
const micOn = ref(true)
const camOn = ref(true)
const chatOpen = ref(false)

/* Chat */
const chatMessages = ref([
  { id: 1, user: 'Alice', text: 'How much is it?' },
  { id: 2, user: 'Bob', text: 'I want that bag!' }
])
const draft = ref('')

/* Product */
const defaultProd = 'https://dummyimage.com/160x160/eee/aaa.png&text=Product'
const showProductModal = ref(false)
const product = ref({ name: '', price: '', image: '', position: 'bottom' })
const currentProduct = ref(null)
const positionClass = computed(() => {
  switch (product.value.position) {
    case 'top': return 'pos-top'
    case 'center': return 'pos-center'
    default: return 'pos-bottom'
  }
})

/* Gifts */
const animatedGifts = ref([])
let giftUid = 0

/* ---- Live room flow ---- */
function makeRoomId () {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).toUpperCase()
}

async function goLive () {
  // create room id and navigate to /live/room/:id
  const id = makeRoomId()
  await router.push({ name: 'live-room', params: { id } }) // ensure router has this
}

watch(
  () => route.params.id,
  async (id) => {
    if (id) {
      // entering a room -> start stream automatically
      await startStream()
    } else {
      // leaving room -> ensure tracks are stopped
      stopStream()
    }
  },
  { immediate: true }
)

async function leaveRoom () {
  stopStream()
  await router.push({ name: 'live-lobby' }) // e.g., path '/live-stream'
}

/* Camera helpers */
let facing = 'user' // 'user' | 'environment'

async function startStream () {
  try {
    stopStream()
    const constraints = {
      video: {
        facingMode: facing,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    streamRef.value = stream
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      videoRef.value.muted = true
      // iOS needs a play() call after a user gesture (Go Live)
      try { await videoRef.value.play() } catch {}
    }
    micOn.value = true
    camOn.value = true
  } catch (e) {
    alert('Could not access camera/microphone. Please check permissions.')
    console.error(e)
  }
}

function stopStream () {
  streamRef.value?.getTracks()?.forEach(t => t.stop())
  if (videoRef.value) videoRef.value.srcObject = null
}

async function switchCamera () {
  // simple toggle (mobile-friendly)
  facing = (facing === 'user') ? 'environment' : 'user'
  if (inRoom.value) await startStream()
}

function toggleMic () {
  const tracks = streamRef.value?.getAudioTracks?.()
  if (!tracks) return
  micOn.value = !micOn.value
  tracks.forEach(t => (t.enabled = micOn.value))
}

function toggleCam () {
  const tracks = streamRef.value?.getVideoTracks?.()
  if (!tracks) return
  camOn.value = !camOn.value
  tracks.forEach(t => (t.enabled = camOn.value))
}

/* Product controls */
function openProductModal () { showProductModal.value = true }
function handleImageUpload (e) {
  const file = e.target.files?.[0]
  if (file) product.value.image = URL.createObjectURL(file)
}
function setProduct () {
  if (!product.value.name) return alert('Please set a product name.')
  currentProduct.value = { ...product.value }
  showProductModal.value = false
}
function placeOrder (p) { alert(`Order placed for: ${p.name}`) }

/* Gifts */
function sendGift () {
  const gift = { name: 'Phoenix Spirit', image: 'https://dummyimage.com/80x80/ffd700/000.png&text=🎁' }
  launchGift(gift)
}
function launchGift (gift) {
  if (animatedGifts.value.length > 8) animatedGifts.value.shift()
  const uid = giftUid++
  const left = Math.random() * 70 + 10
  const delay = Math.random() * 0.2
  animatedGifts.value.push({ ...gift, uid, style: { left: `${left}%`, animationDelay: `${delay}s` } })
  setTimeout(() => { animatedGifts.value = animatedGifts.value.filter(g => g.uid !== uid) }, 3000)
}

/* Chat */
function sendChat () {
  const text = draft.value.trim()
  if (!text) return
  chatMessages.value.push({ id: Date.now(), user: 'You', text })
  draft.value = ''
  nextTick(() => { const el = chatBodyRef.value; if (el) el.scrollTop = el.scrollHeight })
}

/* utils */
function formatAmount (n) {
  try { return new Intl.NumberFormat('sw-TZ').format(Number(n) || 0) }
  catch { return (Number(n) || 0).toLocaleString() }
}

onBeforeUnmount(stopStream)
</script>

<style scoped>
/* —— Mobile-first styles —— */
.page{ position:relative; width:100vw; height:100vh; background:#000; overflow:hidden; touch-action:manipulation; }
.video{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; background:#000; }

.topbar{ position:absolute; top:8px; left:8px; right:8px; display:flex; align-items:center; justify-content:space-between; z-index:10; }
.topbar .left,.topbar .right{ display:flex; gap:8px; align-items:center; }

.toolbar{ position:absolute; left:0; right:0; bottom:0; display:flex; gap:8px; justify-content:center; align-items:center; padding:10px; z-index:10; background:linear-gradient(180deg,transparent,rgba(0,0,0,.55)); }

.btn{ background:#1f2937; color:#fff; border:1px solid rgba(255,255,255,.15); padding:.6rem .9rem; border-radius:14px; font-weight:800; }
.btn.sm{ padding:.35rem .55rem; border-radius:10px; font-weight:700; }
.btn.primary{ background:#dc2626; border-color:#dc2626; }
.btn.danger{ background:#ef4444; border-color:#ef4444; }
.btn.warn{ background:#f59e0b; border-color:#f59e0b; color:#111; }
.btn.ghost{ background:rgba(17,24,39,.55); }

.pill{ display:inline-flex; align-items:center; gap:6px; padding:.25rem .45rem; border-radius:999px; font-weight:900; font-size:.75rem; letter-spacing:.3px; color:#fff; background:rgba(255,255,255,.12); }
.pill.live{ background:#16a34a; border:none; }

/* Product card + positions */
.product{ position:absolute; z-index:20; }
.pos-top{ top:10%; left:50%; transform:translateX(-50%); }
.pos-center{ top:50%; left:50%; transform:translate(-50%,-50%); }
.pos-bottom{ bottom:10%; left:50%; transform:translateX(-50%); }

.product-card{ background:rgba(255,255,255,.92); border-radius:16px; padding:10px; box-shadow:0 12px 28px rgba(0,0,0,.35); text-align:center; min-width:140px; animation:bounce 1.4s ease infinite; }
.product-card img{ width:64px; height:64px; object-fit:cover; border-radius:12px; margin-bottom:6px; }
.product-card .name{ font-weight:800; font-size:.9rem; }
.product-card .price{ color:#059669; font-weight:900; font-size:.9rem; margin:.15rem 0 .35rem; }
.product-card .btn.buy{ background:#059669; border:none; padding:.4rem .6rem; border-radius:10px; }
@keyframes bounce{ 0%,100%{ transform:translateY(0)} 50%{ transform:translateY(-6px)} }

/* Gifts */
.gift-layer{ position:fixed; inset:0; pointer-events:none; z-index:40; }
.gift{ position:absolute; bottom:8%; transform:translateY(0) scale(1); animation:giftFly 2.8s ease-in forwards; }
.gift img{ width:80px; height:80px; object-fit:contain; filter:drop-shadow(0 8px 16px rgba(0,0,0,.45)); }
.gift-label{ margin-top:2px; color:#fff; font-weight:800; font-size:.8rem; background:rgba(0,0,0,.55); padding:.15rem .4rem; border-radius:8px; text-align:center; }
@keyframes giftFly{ 0%{ transform:translateY(0) scale(1); opacity:1 } 55%{ transform:translateY(-45vh) scale(1.15); opacity:.9 } 100%{ transform:translateY(-80vh) scale(1.35); opacity:0 } }

/* Chat */
.chat{ position:absolute; right:10px; bottom:84px; width:min(88vw,320px); height:46vh; background:rgba(17,24,39,.7); color:#fff; border:1px solid rgba(255,255,255,.15); border-radius:14px; backdrop-filter:blur(6px); transform:translateY(12px); opacity:0; pointer-events:none; display:flex; flex-direction:column; z-index:10; transition:opacity .25s ease, transform .25s ease; }
.chat.open{ opacity:1; transform:translateY(0); pointer-events:auto; }
.chat-header{ display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.15); }
.chat-body{ padding:8px; overflow:auto; gap:4px; display:flex; flex-direction:column; }
.msg{ padding:4px 6px; background:rgba(255,255,255,.08); border-radius:8px; }
.chat-input{ display:flex; gap:6px; padding:8px; border-top:1px solid rgba(255,255,255,.15); }
.chat-input input{ flex:1 1 auto; min-height:40px; border-radius:10px; border:1px solid rgba(255,255,255,.25); background:rgba(0,0,0,.25); color:#fff; outline:none; padding:0 10px; }

/* Sheet (product) */
.sheet-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:30; display:flex; align-items:flex-end; justify-content:center; }
.sheet{ width:100%; max-width:520px; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px; box-shadow:0 -12px 28px rgba(0,0,0,.35); padding:12px; max-height:85vh; overflow:auto; }
.sheet-head{ display:flex; align-items:center; justify-content:space-between; padding:6px; }
.sheet-body{ padding:6px; display:grid; gap:10px; }
.sheet-foot{ display:flex; justify-content:flex-end; gap:8px; padding:6px; }
.lbl{ display:grid; gap:6px; font-weight:700; font-size:.9rem; }
.inp{ border:1px solid #e5e7eb; border-radius:12px; min-height:44px; padding:0 12px; outline:none; }
.inp:focus{ border-color:#ffd700; box-shadow:0 0 0 2px #ffd70066; }
.preview img{ width:100%; max-height:180px; object-fit:cover; border-radius:12px; }

/* Transitions */
.fade-enter-active,.fade-leave-active{ transition:opacity .25s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
.sheet-enter-active,.sheet-leave-active{ transition: transform .25s ease, opacity .25s ease }
.sheet-enter-from,.sheet-leave-to{ transform:translateY(14px); opacity:0 }

@media (min-width: 720px){
  .sheet-backdrop{ align-items:center; }
  .sheet{ border-radius:16px; }
}
</style>
