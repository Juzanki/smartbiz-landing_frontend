<template>
  <div
    class="w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden
           bg-gradient-to-b from-white to-slate-50
           dark:from-slate-900 dark:to-slate-950 border border-black/5 dark:border-white/10"
  >
    <!-- Hero header -->
    <div class="relative px-5 pt-6 pb-4 text-center">
      <!-- Ambient aura -->
      <div class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-[130%] h-64 rounded-full blur-3xl
                    bg-gradient-to-b from-amber-300/15 via-indigo-300/15 to-transparent" />
      </div>

      <h2 class="text-base font-extrabold tracking-tight text-indigo-600 dark:text-indigo-300">
        🎁 Invite a Friend & Earn {{ rewardLabel }}
      </h2>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Share your unique link. You’ll earn when they join!
      </p>

      <!-- Bonus progress (optional) -->
      <div v-if="nextBonusAt > 0" class="mt-3">
        <div class="h-2 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-amber-400 to-indigo-400"
               :style="{ width: bonusPct + '%' }"></div>
        </div>
        <div class="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
          {{ invites % nextBonusAt }}/{{ nextBonusAt }} until +{{ bonusReward }} {{ rewardLabel }}
        </div>
      </div>
    </div>

    <!-- QR + logo overlay -->
    <div class="px-5">
      <div class="relative mx-auto w-[210px]">
        <div class="rounded-2xl p-3 bg-white shadow border border-slate-200 dark:border-white/10 dark:bg-slate-900">
          <QrcodeVue
            ref="qrRef"
            :value="referralUrl"
            :size="qrSize"
            :level="qrLevel"
            :render-as="'canvas'"
            :background="qrBg"
            :foreground="qrFg"
          />
        </div>

        <!-- Optional center logo overlay -->
        <img
          v-if="logoSrc"
          :src="logoSrc"
          class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                 h-10 w-10 rounded-xl shadow ring-2 ring-white/80"
          alt=""
        />
      </div>

      <p class="mt-3 text-[11px] text-center text-slate-500 dark:text-slate-400">
        Tip: Long-press to save QR, or use “Download QR”.
      </p>
    </div>

    <!-- Link box -->
    <div class="mt-3 mx-5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 border border-black/5 dark:border-white/10">
      <div class="flex items-center gap-2">
        <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-white/10 border border-black/5 dark:border-white/10 text-slate-700 dark:text-slate-300">
          Code: <b>{{ referralCode }}</b>
        </span>
        <span v-if="campaign" class="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
          {{ campaign }}
        </span>
      </div>
      <div class="mt-2 flex items-center gap-2">
        <input
          :value="referralUrl"
          readonly
          class="flex-1 bg-transparent text-xs truncate outline-none text-slate-700 dark:text-slate-200"
          @focus="$event.target.select()"
        />
        <button class="pill" title="Copy" @click="copyLink">📋</button>
        <button class="pill" title="Share" @click="shareLink">📤</button>
      </div>
      <transition name="fade">
        <div v-if="copied" class="mt-2 text-center text-[12px] text-emerald-600 dark:text-emerald-400">✓ Link copied</div>
      </transition>
    </div>

    <!-- Actions -->
    <div class="mt-3 px-5 pb-5 grid grid-cols-2 gap-2">
      <button class="btn" @click="downloadQR">⬇️ Download QR</button>
      <button class="btn" @click="savePoster" :disabled="savingPoster">
        <span v-if="savingPoster" class="inline-flex items-center gap-1"><span class="spinner h-3 w-3"></span> Building…</span>
        <span v-else>🖼️ Save Poster</span>
      </button>
      <a
        class="btn col-span-2"
        :href="`https://wa.me/?text=${encodeURIComponent(shareText)}`"
        target="_blank" rel="noopener"
        >🟢 Share via WhatsApp</a>
    </div>

    <!-- Tiny stats (optional) -->
    <div v-if="showStats" class="px-5 pb-5">
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="stat">
          <div class="stat-num">{{ invites }}</div>
          <div class="stat-label">Invites</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ converted }}</div>
          <div class="stat-label">Joined</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ coins }}</div>
          <div class="stat-label">{{ rewardLabel }}</div>
        </div>
      </div>
    </div>

    <!-- Confetti overlay -->
    <div class="pointer-events-none relative">
      <transition-group name="burst" tag="div">
        <div
          v-for="b in bursts"
          :key="b.id"
          class="absolute text-2xl"
          :style="{ left: b.x+'px', top: b.y+'px', transform: `scale(${b.s})`, opacity: b.o }"
        >
          {{ b.e }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import QrcodeVue from 'qrcode.vue'

/* Props for flexibility */
const props = defineProps({
  referralCode: { type: String, default: '' },         // if empty, we’ll try from URL/user store outside
  baseUrl:      { type: String, default: (typeof window !== 'undefined' ? window.location.origin : 'https://smartbiz.site') },
  path:         { type: String, default: '/signup' },
  campaign:     { type: String, default: '' },         // e.g. 'BackToSchool'
  rewardLabel:  { type: String, default: 'SmartCoins' },
  bonusReward:  { type: Number, default: 100 },
  nextBonusAt:  { type: Number, default: 5 },          // invites needed; 0 to hide
  invites:      { type: Number, default: 0 },
  converted:    { type: Number, default: 0 },
  coins:        { type: Number, default: 0 },
  showStats:    { type: Boolean, default: true },
  logoSrc:      { type: String, default: '' },         // optional center logo on QR & poster
  qrSize:       { type: Number, default: 180 },
  qrLevel:      { type: String, default: 'M' },        // L, M, Q, H
  qrBg:         { type: String, default: '#ffffff' },
  qrFg:         { type: String, default: '#111827' },  // slate-900
})

/* Refs / state */
const qrRef = ref(null)
const copied = ref(false)
const savingPoster = ref(false)
const bursts = ref([]) // confetti

/* Derived */
const referralCode = computed(() => props.referralCode || 'your-ref-code')
const referralUrl = computed(() => {
  const u = new URL(props.path, props.baseUrl)
  u.searchParams.set('ref', referralCode.value)
  if (props.campaign) u.searchParams.set('c', props.campaign)
  return u.toString()
})
const shareText = computed(() => `Join me on SmartBiz! Use my invite link: ${referralUrl.value}`)

const bonusPct = computed(() => {
  if (!props.nextBonusAt) return 0
  const n = props.invites % props.nextBonusAt
  return Math.min(100, Math.round((n / props.nextBonusAt) * 100))
})

/* Haptics */
function vibrate(ms=14){ try { navigator.vibrate?.(ms) } catch(_){} }

/* Confetti burst (emoji) */
let burstId = 0
function burst(x, y){
  const emojis = ['🪙','🎉','✨','💎','🔥']
  for (let i=0; i<12; i++){
    const id = ++burstId
    const e = emojis[Math.floor(Math.random()*emojis.length)]
    const dx = (Math.random() - .5) * 120
    const dy = - (20 + Math.random()*80)
    const s = 0.8 + Math.random()*0.6
    bursts.value.push({ id, e, x: x + dx, y: y + dy, s, o: 1 })
    setTimeout(() => {
      const b = bursts.value.find(b => b.id===id)
      if (b) b.o = 0
      setTimeout(() => bursts.value = bursts.value.filter(b => b.id!==id), 400)
    }, 700 + i*10)
  }
}

/* Actions */
async function copyLink(){
  try {
    await navigator.clipboard.writeText(referralUrl.value)
    copied.value = true
    vibrate(18)
    // center-ish burst
    burst(160, 40)
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    alert('Copy failed — long-press the link to copy.')
  }
}

async function shareLink(){
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Invite to SmartBiz', text: 'Join me & earn bonuses!', url: referralUrl.value })
      vibrate(16)
      burst(160, 40)
    } else {
      // fallback: copy + toast
      await copyLink()
      alert('Link copied — share it anywhere!')
    }
  } catch {
    // cancelled
  }
}

function downloadQR(){
  // grab inner canvas of QrcodeVue
  const c = qrRef.value?.$el?.querySelector?.('canvas')
  if (!c) return
  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `qr-${referralCode.value}.png`
  a.click()
  vibrate(10)
}

/* Poster: 1080x1350 (IG-friendly) */
async function savePoster(){
  try {
    savingPoster.value = true
    const qrCanvas = qrRef.value?.$el?.querySelector?.('canvas')
    if (!qrCanvas) throw new Error('QR not ready')

    const W = 1080, H = 1350
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#fef3c7')  // amber-100
    g.addColorStop(.5, '#e0e7ff') // indigo-100
    g.addColorStop(1, '#ffffff')
    ctx.fillStyle = g
    ctx.fillRect(0,0,W,H)

    // Title
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 64px Inter, system-ui, -apple-system, Segoe UI, Roboto'
    ctx.textAlign = 'center'
    ctx.fillText('Invite & Earn', W/2, 160)

    // Sub
    ctx.fillStyle = '#374151'
    ctx.font = '28px Inter, system-ui'
    ctx.fillText(`Earn ${props.rewardLabel} when friends join`, W/2, 210)

    // QR white card
    const cardW = 760, cardH = 760, rx = 36
    const cx = (W-cardW)/2, cy = 260
    roundRect(ctx, cx, cy, cardW, cardH, rx)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // Draw QR centered
    const qrSize = 620
    const qx = W/2 - qrSize/2, qy = cy + (cardH-qrSize)/2
    ctx.drawImage(qrCanvas, qx, qy, qrSize, qrSize)

    // Optional logo
    if (props.logoSrc) {
      const img = await loadImage(props.logoSrc)
      const L = 110
      ctx.save()
      roundRect(ctx, W/2 - L/2, qy + qrSize/2 - L/2, L, L, 20)
      ctx.clip()
      ctx.drawImage(img, W/2 - L/2, qy + qrSize/2 - L/2, L, L)
      ctx.restore()
      // ring
      ctx.strokeStyle = 'rgba(255,255,255,.9)'
      ctx.lineWidth = 8
      roundRect(ctx, W/2 - L/2, qy + qrSize/2 - L/2, L, L, 20)
      ctx.stroke()
    }

    // URL strip
    ctx.fillStyle = '#111827'
    ctx.font = '34px Inter'
    wrapCenter(ctx, referralUrl.value, W/2, cy + cardH + 80, 940, 40)

    // Footer coins
    ctx.fillStyle = '#6b21a8'
    ctx.font = 'bold 28px Inter'
    ctx.fillText(`Use code: ${referralCode.value}`, W/2, H - 110)

    // Save
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/jpeg', 0.92)
    a.download = `invite-poster-${referralCode.value}.jpg`
    a.click()
    vibrate(18)
    burst(160, 40)
  } catch (e) {
    alert('Poster failed — try again.')
  } finally {
    savingPoster.value = false
  }
}

/* Canvas helpers */
function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2)
  ctx.beginPath()
  ctx.moveTo(x+rr, y)
  ctx.arcTo(x+w, y, x+w, y+h, rr)
  ctx.arcTo(x+w, y+h, x, y+h, rr)
  ctx.arcTo(x, y+h, x, y, rr)
  ctx.arcTo(x, y, x+w, y, rr)
  ctx.closePath()
}
function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
function wrapCenter(ctx, text, x, y, maxWidth, lineHeight){
  const words = text.split(' ')
  let line = ''
  let yy = y
  for (let n=0; n<words.length; n++){
    const test = line + words[n] + ' '
    if (ctx.measureText(test).width > maxWidth && n > 0){
      ctx.fillText(line, x, yy)
      line = words[n] + ' '
      yy += lineHeight
    } else {
      line = test
    }
  }
  ctx.fillText(line.trim(), x, yy)
}
</script>

<style scoped>
.pill {
  @apply h-9 w-9 grid place-items-center rounded-full bg-white text-slate-800
         border border-slate-200 shadow active:bg-slate-50;
}
.dark .pill {
  @apply bg-slate-900 text-slate-200 border-white/10 active:bg-slate-800;
}
.btn {
  @apply h-11 rounded-xl font-semibold text-sm text-white bg-gradient-to-b from-indigo-600 to-indigo-700
         active:from-indigo-700 active:to-indigo-800 shadow;
}
.stat {
  @apply rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 py-3;
}
.stat-num {
  @apply text-lg font-extrabold;
}
.stat-label {
  @apply text-[11px] text-slate-500 dark:text-slate-400;
}
/* Spinner */
.spinner {
  box-sizing: border-box;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
  border-radius: 9999px;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.burst-enter-active, .burst-leave-active { transition: transform .3s ease, opacity .3s ease; }
.burst-enter-from, .burst-leave-to { transform: translateY(8px) scale(.9); opacity: 0; }
</style>
