<template>
  <div
    class="smart-cam relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-black"
    :class="[{ 'ui-hidden': uiHidden }]"
  >
    <!-- VIDEO -->
    <video
      ref="video"
      autoplay
      muted
      playsinline
      class="video"
      :style="{ transform: `translateZ(0) scale(${zoom})` }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
      @dblclick="tapFocus"
      @click="tapPulse"
    />

    <!-- FOCUS RETICLE -->
    <span
      v-if="focusPoint"
      class="reticle"
      :style="{ left: `${focusPoint.x}px`, top: `${focusPoint.y}px` }"
    ></span>

    <!-- HUD TOP -->
    <header
      class="absolute top-0 inset-x-0 z-30 px-3 pt-3 pb-2 flex items-center justify-between
             text-white text-[11px] font-semibold pointer-events-none"
    >
      <div class="flex items-center gap-2 pointer-events-auto">
        <span class="hud-chip"><i class="i-tabler-bolt"></i> {{ batteryText }}</span>
        <span class="hud-chip"><i class="i-tabler-wifi"></i> {{ netStatus }}</span>
        <span class="hud-chip"><i class="i-tabler-activity"></i> {{ fps }} fps</span>
      </div>

      <div class="flex items-center gap-2 pointer-events-auto">
        <button class="pill" @click="toggleSpotlight">🔆</button>
        <button class="pill" @click="toggleUI" :title="uiHidden ? 'Show UI' : 'Hide UI'">
          {{ uiHidden ? '👁️' : '🙈' }}
        </button>
      </div>
    </header>

    <!-- QUICK CONTROLS (TOP-LEFT) -->
    <div class="abs-stack left">
      <button class="ctrl" @click="flipCamera" title="Flip Camera">🔄 Flip</button>
      <button class="ctrl" @click="toggleBackground" title="Change Background">🎬 BG</button>
      <button class="ctrl" @click="applyBeautyFilter" title="Beauty">✨ Filter</button>
      <button class="ctrl" @click="takeSnapshot" title="Snapshot">📸 Snap</button>
      <button class="ctrl" @click="toggleMic" :title="micOn ? 'Mute Mic' : 'Unmute Mic'">
        {{ micOn ? '🎙️ Mic On' : '🔇 Mic Off' }}
      </button>
    </div>

    <!-- EMOJI (TOP-RIGHT) -->
    <div class="abs-emoji">
      <button v-for="emoji in emojis" :key="emoji" class="emoji" @click="triggerReaction(emoji)" :title="`React ${emoji}`">
        {{ emoji }}
      </button>
    </div>

    <!-- FLOATING REACTIONS -->
    <div class="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      <div
        v-for="item in floatingReactions"
        :key="item.id"
        class="absolute text-4xl animate-reaction"
        :style="{ left: item.x + '%', bottom: '0%', animationDelay: item.delay + 'ms' }"
      >
        {{ item.emoji }}
      </div>
    </div>

    <!-- BACKGROUND PICKER -->
    <transition name="fade">
      <div
        v-if="showBackgroundSelector"
        class="popover"
      >
        <div
          v-for="option in backgroundOptions"
          :key="option.value"
          @click="selectBackground(option.value)"
          class="popover-item"
          :class="{ active: selectedBackground === option.value }"
        >
          {{ option.label }}
        </div>
      </div>
    </transition>

    <!-- STICKER PICKER -->
    <div class="abs-sticker">
      <select v-model="selectedSticker" class="select">
        <option disabled value="">🎭 Sticker Overlay</option>
        <option value="boom">💥 Boom</option>
        <option value="like">👍 Like</option>
        <option value="star">🌟 Star</option>
        <option value="fire">🔥 Fire</option>
      </select>
    </div>
    <transition name="bounce">
      <div v-if="selectedSticker" class="sticker-float">
        {{ stickerMap[selectedSticker] }}
      </div>
    </transition>

    <!-- SNAPSHOTS RAIL -->
    <div v-if="snapshots.length" class="rail">
      <img v-for="(snap, idx) in snapshots" :key="idx" :src="snap" class="thumb" />
    </div>

    <!-- SHARE LAST SNAPSHOT -->
    <button v-if="snapshots.length" class="share-btn" @click="shareLastSnapshot">📤 Share Last Snapshot</button>

    <!-- FLASH & SPOTLIGHT -->
    <transition name="fade">
      <div v-if="flash" class="flash"></div>
    </transition>
    <div v-if="showSpotlight" class="spotlight"></div>

    <!-- DEVICE SWITCHER DRAWER -->
    <transition name="fade">
      <aside v-if="showDevices" class="drawer">
        <h3 class="drawer-title">🎛️ Devices</h3>
        <div class="drawer-group">
          <label class="drawer-label">Camera</label>
          <select v-model="currentDeviceId.video" class="select w-full">
            <option v-for="c in cameras" :key="c.deviceId" :value="c.deviceId">{{ c.label || 'Camera' }}</option>
          </select>
        </div>
        <div class="drawer-group">
          <label class="drawer-label">Microphone</label>
          <select v-model="currentDeviceId.audio" class="select w-full">
            <option v-for="m in mics" :key="m.deviceId" :value="m.deviceId">{{ m.label || 'Mic' }}</option>
          </select>
        </div>
        <div class="drawer-actions">
          <button class="btn ghost" @click="showDevices=false">Close</button>
          <button class="btn primary" @click="applyDevices">Apply</button>
        </div>
      </aside>
    </transition>

    <!-- BOTTOM DOCK (MOBILE FIRST) -->
    <nav class="dock">
      <div class="dock-inner">
        <button class="dock-btn" @click="recording ? stopRecording() : startRecording()">
          <span v-if="!recording">⏺️</span><span v-else>⏹️</span>
          <small>{{ recording ? recTime : 'Record' }}</small>
        </button>

        <button class="dock-btn" @click="toggleTorch" :disabled="!torchSupported">
          🔦
          <small>{{ torchOn ? 'Torch On' : 'Torch' }}</small>
        </button>

        <button class="dock-btn" @click="showDevices = true">
          ⚙️
          <small>Devices</small>
        </button>

        <button class="dock-btn" @click="flipCamera">
          🔁
          <small>Flip</small>
        </button>

        <button class="dock-btn" @click="uiHidden = !uiHidden">
          {{ uiHidden ? '👁️' : '🫣' }}
          <small>{{ uiHidden ? 'Show UI' : 'Hide UI' }}</small>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { io } from 'socket.io-client'

/* CORE STATE */
const video = ref<HTMLVideoElement|null>(null)
const currentStream = ref<MediaStream|null>(null)
const useFrontCam = ref(true)
const micOn = ref(false)
const zoom = ref(1)
const minZoom = 1, maxZoom = 2.5

/* UI & FX */
const uiHidden = ref(false)
const flash = ref(false)
const showSpotlight = ref(true)
const focusPoint = ref<{x:number,y:number}|null>(null)

/* BACKGROUND */
const showBackgroundSelector = ref(false)
const selectedBackground = ref<'none'|'blur'|'stars'|'city'>('none')
const backgroundOptions = [
  { label: 'None', value: 'none' },
  { label: 'Blur', value: 'blur' },
  { label: 'Star Field', value: 'stars' },
  { label: 'City View', value: 'city' }
]

/* EMOJI + STICKERS */
const emojis = ['🔥','🎉','😂','😍','💯']
const floatingReactions = ref<any[]>([])
const selectedSticker = ref('')
const stickerMap: Record<string,string> = { boom:'💥', like:'👍', star:'🌟', fire:'🔥' }

/* SOCKET.IO */
const socket = io('http://localhost:5000')
socket.on('reaction-broadcast', ({emoji}) => triggerReaction(emoji, false))

/* SNAPSHOTS */
const snapshots = ref<string[]>([])

/* DEVICES */
const showDevices = ref(false)
const cameras = ref<MediaDeviceInfo[]>([])
const mics = ref<MediaDeviceInfo[]>([])
const currentDeviceId = ref<{video?:string; audio?:string}>({})

/* TORCH */
const torchSupported = ref(false)
const torchOn = ref(false)

/* RECORDING */
let mediaRecorder: MediaRecorder | null = null
const recording = ref(false)
const recTime = ref('00:00')
let recTimer: number | null = null
const recordedChunks: Blob[] = []

/* HUD */
const fps = ref(0)
let frameHandle: number | null = null
const batteryText = ref('Batt …')
const netStatus = ref('Online')

/* GESTURE HELPERS */
let pinchDist = 0
let singleTouch = false

/* SAFE HELPERS */
const uuid = () => crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)

/* START CAMERA */
async function startCamera(){
  stopStream()
  const constraints: MediaStreamConstraints = {
    video: {
      deviceId: currentDeviceId.value.video ? { exact: currentDeviceId.value.video } : undefined,
      facingMode: currentDeviceId.value.video ? undefined : (useFrontCam.value ? 'user' : 'environment'),
      width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }
    },
    audio: micOn.value ? { deviceId: currentDeviceId.value.audio ? { exact: currentDeviceId.value.audio } : undefined } : false
  }
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  currentStream.value = stream
  if (video.value) video.value.srcObject = stream
  detectTorch(stream)
  applyAIFilter(stream)
  startFPSCounter()
}

/* STOP */
function stopStream(){
  currentStream.value?.getTracks()?.forEach(t => t.stop())
  currentStream.value = null
  stopFPSCounter()
}

/* FLIP / MIC */
async function flipCamera(){ useFrontCam.value = !useFrontCam.value; await startCamera() }
async function toggleMic(){ micOn.value = !micOn.value; await startCamera() }

/* BACKGROUND */
function toggleBackground(){ showBackgroundSelector.value = !showBackgroundSelector.value }
function selectBackground(v:any){ selectedBackground.value = v; updateBackground(); showBackgroundSelector.value=false }
function updateBackground(){
  const wrap = video.value?.parentElement as HTMLElement
  if (!wrap) return
  wrap.classList.remove('bg-blur','bg-stars','bg-city')
  if (selectedBackground.value !== 'none') wrap.classList.add(`bg-${selectedBackground.value}`)
}

/* BEAUTY FILTER (CSS quick) */
function applyBeautyFilter(){
  if (!video.value) return
  video.value.style.filter = video.value.style.filter ? '' : 'brightness(1.05) contrast(1.1) saturate(1.2) hue-rotate(1deg)'
}

/* SNAPSHOT */
function takeSnapshot(){
  if (!video.value) return
  flash.value = true; setTimeout(()=> flash.value = false, 220)
  const c = document.createElement('canvas')
  c.width = video.value.videoWidth || 1280
  c.height = video.value.videoHeight || 720
  const ctx = c.getContext('2d')!
  ctx.drawImage(video.value, 0, 0, c.width, c.height)
  const url = c.toDataURL('image/png')
  snapshots.value.push(url); if (snapshots.value.length > 14) snapshots.value.shift()
  vibrate(10)
}

/* SHARE SNAPSHOT */
async function shareLastSnapshot(){
  const last = snapshots.value.at(-1)
  if (!last) return
  try{
    if (navigator.share && navigator.canShare) {
      const blob = await (await fetch(last)).blob()
      const file = new File([blob], 'snapshot.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files:[file], title:'Snapshot', text:'Check this snap' })
        return
      }
    }
  }catch{}
  // fallback: download
  const a = document.createElement('a'); a.href = last; a.download = 'snapshot.png'; a.click()
}

/* REACTIONS */
function triggerReaction(emoji:string, emit=true){
  const id = uuid(), x = Math.random()*80+10, delay = Math.random()*200
  floatingReactions.value.push({ id, emoji, x, delay })
  try { new Audio('/sounds/reaction.mp3').play().catch(()=>{}) } catch {}
  if (emit) socket.emit('send-reaction', { emoji })
  setTimeout(()=> floatingReactions.value = floatingReactions.value.filter(r => r.id !== id), 3000)
}

/* TOUCH GESTURES */
function distance(touches: TouchList){ const [a,b] = [touches[0], touches[1]]; return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY) }
function onTouchStart(e: TouchEvent){
  if (e.touches.length === 1){ singleTouch = true }
  if (e.touches.length === 2){
    pinchDist = distance(e.touches); singleTouch = false
  }
}
function onTouchMove(e: TouchEvent){
  if (e.touches.length === 2){
    const d = distance(e.touches)
    const delta = (d - pinchDist) / 200
    zoom.value = Math.min(maxZoom, Math.max(minZoom, zoom.value + delta))
    pinchDist = d
  }
}
function onTouchEnd(){ singleTouch = false }

/* TAP FOCUS (visual only) */
function tapFocus(ev: MouseEvent){
  if (!video.value) return
  focusPoint.value = { x: ev.offsetX, y: ev.offsetY }
  setTimeout(()=> focusPoint.value = null, 700)
  vibrate(6)
}
function tapPulse(){ /* just for ripple vibe on single tap */ }

/* TORCH (if supported on back camera) */
async function detectTorch(stream: MediaStream){
  torchSupported.value = false
  const track = stream.getVideoTracks()[0]
  // @ts-ignore
  const cap = typeof ImageCapture !== 'undefined' ? new ImageCapture(track) : null
  // Some browsers support track.applyConstraints with torch
  // We attempt to set torch later if user taps toggleTorch
  torchSupported.value = !!track.getCapabilities && !!track.getCapabilities().torch
}
async function toggleTorch(){
  if (!currentStream.value) return
  const track = currentStream.value.getVideoTracks()[0]
  // @ts-ignore
  const caps = track.getCapabilities?.() || {}
  if (!caps.torch) return
  torchOn.value = !torchOn.value
  try{
    await track.applyConstraints({ advanced: [{ torch: torchOn.value }] })
  }catch{
    torchOn.value = false
  }
}

/* DEVICES */
async function listDevices(){
  const all = await navigator.mediaDevices.enumerateDevices()
  cameras.value = all.filter(d => d.kind === 'videoinput')
  mics.value = all.filter(d => d.kind === 'audioinput')
}
async function applyDevices(){
  await startCamera()
  showDevices.value = false
}

/* RECORDING */
function startRecording(){
  if (!currentStream.value) return
  recordedChunks.length = 0
  mediaRecorder = new MediaRecorder(currentStream.value, { mimeType: 'video/webm;codecs=vp9' })
  mediaRecorder.ondataavailable = e => { if (e.data.size) recordedChunks.push(e.data) }
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'recording.webm'; a.click()
    URL.revokeObjectURL(url)
  }
  mediaRecorder.start()
  recording.value = true
  startRecTimer()
  vibrate(12)
}
function stopRecording(){
  mediaRecorder?.stop()
  recording.value = false
  stopRecTimer()
}
function startRecTimer(){
  let s = 0
  recTimer && clearInterval(recTimer)
  recTimer = window.setInterval(()=> { s++; const m = String(Math.floor(s/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0'); recTime.value = `${m}:${ss}` }, 1000)
}
function stopRecTimer(){ if (recTimer){ clearInterval(recTimer); recTimer = null }; recTime.value='00:00' }

/* FPS */
function startFPSCounter(){
  let last = performance.now(), frames = 0
  const step = (t:number) => {
    frames++
    if (t - last >= 1000){ fps.value = frames; frames = 0; last = t }
    frameHandle = video.value?.requestVideoFrameCallback ? (video.value as any).requestVideoFrameCallback(step) : requestAnimationFrame(step)
  }
  frameHandle = video.value?.requestVideoFrameCallback ? (video.value as any).requestVideoFrameCallback(step) : requestAnimationFrame(step)
}
function stopFPSCounter(){
  if ((video.value as any)?.cancelVideoFrameCallback && frameHandle){
    (video.value as any).cancelVideoFrameCallback(frameHandle)
  }else if (frameHandle){
    cancelAnimationFrame(frameHandle)
  }
  frameHandle = null
}

/* AI FILTER STUB */
function applyAIFilter(stream: MediaStream){
  // Hook TF.js / MediaPipe here when ready
  console.log('🧠 AI Filter attached (stub)')
}

/* UTIL */
function vibrate(ms:number){ try{ navigator.vibrate?.(ms) }catch{} }
function toggleSpotlight(){ showSpotlight.value = !showSpotlight.value }
function toggleUI(){ uiHidden.value = !uiHidden.value }

/* BATTERY / NETWORK */
async function setupBattery(){
  try{
    // @ts-ignore
    const b = await navigator.getBattery?.()
    if (b){
      const set = () => batteryText.value = `${Math.round(b.level*100)}%${b.charging?'⚡':''}`
      set(); b.addEventListener('levelchange', set); b.addEventListener('chargingchange', set)
    } else batteryText.value = 'Battery'
  }catch{ batteryText.value = 'Battery' }
}
function setupNetwork(){
  netStatus.value = navigator.onLine ? 'Online' : 'Offline'
  window.addEventListener('online', ()=> netStatus.value='Online')
  window.addEventListener('offline', ()=> netStatus.value='Offline')
}

/* PAGE VISIBILITY (energy save) */
function onVis(){ if (document.hidden){ /* could pause expensive effects */ } }

/* MOUNT */
onMounted(async () => {
  await startCamera()
  await listDevices()
  setupBattery()
  setupNetwork()
  document.addEventListener('visibilitychange', onVis)
  // Lock orientation to landscape if wide & mobile
  try { await (screen as any).orientation?.lock?.('landscape') } catch {}
})
onBeforeUnmount(() => {
  stopStream()
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<style scoped>
.smart-cam { aspect-ratio: 16/9; }
.video{
  width: 100%; height: 100%; object-fit: cover;
  border-radius: inherit; transition: transform .2s ease;
  touch-action: none; /* allow pinch */
}

/* HUD */
.hud-chip{
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.25);
  padding: .25rem .5rem; border-radius: 9999px; backdrop-filter: blur(6px);
}

/* Quick controls stacks */
.abs-stack.left{
  position:absolute; left:.75rem; top:.75rem; display:flex; flex-direction:column; gap:.5rem; z-index:20;
}
.ctrl{
  color:#fff; background: rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.15);
  padding:.4rem .6rem; border-radius: 9999px; font-size:.8rem; font-weight:700;
  backdrop-filter: blur(6px); box-shadow: 0 6px 16px rgba(0,0,0,.25);
}
.ctrl:hover{ background: rgba(0,0,0,.6) }

/* Emojis */
.abs-emoji{
  position:absolute; right:.75rem; top:.75rem; display:flex; gap:.4rem; z-index:20;
}
.emoji{
  background: rgba(0,0,0,.45); color:#fff; border:1px solid rgba(255,255,255,.15);
  width:2rem; height:2rem; border-radius: .9rem; display:flex; align-items:center; justify-content:center; font-size:1rem;
}
.emoji:hover{ background: rgba(0,0,0,.6) }

/* Popover */
.popover{
  position:absolute; top:5rem; left:.75rem; width:10rem;
  background:#fff; color:#111; border:1px solid rgba(0,0,0,.1);
  border-radius: .75rem; box-shadow: 0 14px 28px rgba(0,0,0,.2); padding:.5rem; z-index:50;
}
.popover-item{ padding:.4rem .5rem; border-radius:.5rem; cursor:pointer }
.popover-item:hover{ background:#f3f4f6 }
.popover-item.active{ background:#e0e7ff; font-weight:700 }

/* Sticker */
.abs-sticker{ position:absolute; right:.75rem; bottom:6.5rem; z-index:30 }
.select{
  background: rgba(0,0,0,.45); color:#fff; border:1px solid rgba(255,255,255,.15);
  padding:.45rem .6rem; border-radius:.75rem; font-size:.85rem; backdrop-filter: blur(6px);
}
.sticker-float{ position:absolute; bottom:7.75rem; right:1.25rem; font-size:3rem; z-index:30 }

/* Snapshots rail */
.rail{
  position:absolute; bottom:.75rem; right:.75rem; display:flex; gap:.4rem;
  background: rgba(0,0,0,.45); padding:.35rem; border-radius:.75rem; border:1px solid rgba(255,255,255,.15);
}
.thumb{ width:3.5rem; height:2.5rem; object-fit:cover; border-radius:.5rem; border:1px solid rgba(255,255,255,.2) }

/* Share btn */
.share-btn{
  position:absolute; left:50%; transform: translateX(-50%);
  bottom:.75rem; z-index:20; color:#fff; font-size:.8rem; font-weight:700;
  background: rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.15);
  padding:.4rem .8rem; border-radius:9999px; backdrop-filter: blur(6px);
}

/* Flash & spotlight */
.flash{ position:absolute; inset:0; background: rgba(255,255,255,.4); backdrop-filter: blur(1px); z-index:30 }
.spotlight{ position:absolute; inset:0; background: linear-gradient(135deg, rgba(99,102,241,.12), rgba(236,72,153,.12)); pointer-events:none; animation: pulse 3s ease-in-out infinite }
@keyframes pulse{ 0%,100%{opacity:.1} 50%{opacity:.22} }

/* Focus reticle */
.reticle{ position:absolute; width:52px; height:52px; border:2px solid rgba(255,255,255,.9); border-radius:12px; transform: translate(-50%,-50%); animation: ret 700ms ease-out }
@keyframes ret{ 0%{ transform:translate(-50%,-50%) scale(.7); opacity:.8 } 100%{ transform:translate(-50%,-50%) scale(1); opacity:0 } }

/* Dock */
.dock{
  position:absolute; inset-x:0; bottom:0; z-index:35; pointer-events:none;
  padding-bottom: max(.5rem, env(safe-area-inset-bottom));
}
.dock-inner{
  pointer-events:auto; margin:0 auto .5rem; width:calc(100% - .75rem*2); max-width:760px;
  background: rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.12);
  border-radius: 1rem; backdrop-filter: blur(10px);
  display:flex; justify-content:space-around; align-items:center; gap:.25rem; padding:.35rem;
  box-shadow: 0 10px 24px rgba(0,0,0,.35);
}
.dock-btn{
  color:#fff; text-align:center; min-width:64px; height:48px; padding:.25rem .5rem;
  border-radius:.875rem; font-weight:800; font-size:.8rem;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  background: linear-gradient(120deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.12);
}
.dock-btn:active{ transform: scale(.98) }

/* Drawer */
.drawer{
  position:absolute; right:.75rem; top:4.5rem; width:16rem; z-index:45;
  background:#fff; color:#111; border:1px solid rgba(0,0,0,.1);
  border-radius: .75rem; box-shadow: 0 14px 28px rgba(0,0,0,.2); padding:.75rem;
}
.drawer-title{ font-weight:800; margin-bottom:.5rem }
.drawer-group{ margin:.5rem 0 }
.drawer-label{ font-size:.75rem; font-weight:700; color:#374151; margin-bottom:.25rem; display:block }
.drawer-actions{ display:flex; justify-content:flex-end; gap:.5rem; margin-top:.5rem }
.btn{ border-radius:.75rem; padding:.45rem .8rem; font-weight:800; font-size:.85rem }
.btn.ghost{ background:#f3f4f6 }
.btn.primary{ color:#fff; background: linear-gradient(100deg, #10b981, #06b6d4) }

/* Background effects (wrapper pseudo) */
.bg-blur::before, .bg-stars::before, .bg-city::before{
  content:''; position:absolute; inset:0; z-index:-1; border-radius:inherit; pointer-events:none;
}
.bg-blur::before{ backdrop-filter: blur(14px); }
.bg-stars::before{ background:url('/assets/bg-stars.gif') center/cover no-repeat; opacity:.5 }
.bg-city::before{ background:url('/assets/bg-city.jpg') center/cover no-repeat; opacity:.4 }

/* Reactions */
.animate-reaction{ animation: float-up 2.8s ease-out forwards; position:absolute }
@keyframes float-up{
  0%{ transform: translateY(0) scale(1); opacity:1 }
  50%{ transform: translateY(-60px) scale(1.25); opacity:.9 }
  100%{ transform: translateY(-180px) scale(1.6); opacity:0 }
}

/* Transitions */
.fade-enter-active,.fade-leave-active{ transition: opacity .22s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
.bounce-enter-active{ animation: sticker-bounce .6s ease }
@keyframes sticker-bounce{ 0%{ transform:scale(.7); opacity:0 } 50%{ transform:scale(1.2); opacity:1 } 100%{ transform:scale(1) } }

/* Hide UI mode */
.ui-hidden .abs-stack.left,
.ui-hidden .abs-emoji,
.ui-hidden .share-btn,
.ui-hidden .rail,
.ui-hidden .dock,
.ui-hidden header { opacity: 0; pointer-events: none; }
</style>
