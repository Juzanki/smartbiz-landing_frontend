<!-- src/views/SmartAssistant.vue -->
<template>
  <div class="sa-page">
    <header class="sa-top">
      <h1 class="sa-title">🤖 Smart Assistant</h1>
      <p class="sa-sub">Quick access to key SmartBiz pages (mobile-first).</p>

      <div class="sa-search">
        <input
          v-model="query"
          type="search"
          class="sa-inp"
          placeholder="Search: inbox, live, wallet, bots..."
          aria-label="Search shortcuts"
        />
      </div>

      <div class="sa-chips" role="tablist" aria-label="Categories">
        <button
          v-for="c in categories"
          :key="c.key"
          class="sa-chip"
          :class="{ active: activeCat === c.key }"
          @click="activeCat = c.key"
          role="tab"
          :aria-selected="activeCat === c.key"
        >
          <span class="mr-1">{{ c.icon }}</span>{{ c.label }}
        </button>
      </div>
    </header>

    <section class="sa-card">
      <div class="sa-grid">
        <component
          v-for="item in filteredShortcuts"
          :is="item._isRoute ? 'RouterLink' : 'a'"
          :key="item.key"
          class="sa-tile"
          :to="item._isRoute ? item.to : undefined"
          :href="!item._isRoute ? item.path : undefined"
        >
          <div class="sa-ico">{{ item.icon }}</div>
          <div class="sa-lbl">{{ item.label }}</div>
          <div class="sa-cap">{{ item.caption }}</div>
        </component>
      </div>

      <div v-if="!filteredShortcuts.length" class="sa-empty">
        No results. Try another term or pick a different category.
      </div>
    </section>

    <section class="sa-card">
      <h3 class="sa-ctitle">🔌 Platform connections</h3>
      <div class="sa-pgrid">
        <div v-for="p in platforms" :key="p.name" class="sa-plat">
          <div class="sa-pico">{{ p.icon }}</div>
          <div class="sa-pname">{{ p.label }}</div>
          <span :class="['sa-pstatus', p.connected ? 'ok' : 'bad']">
            {{ p.connected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
      </div>
    </section>

    <div style="height: 14vh"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* ---------------- Categories ---------------- */
const categories = [
  { key: 'all',        label: 'All',            icon: '✨' },
  { key: 'messaging',  label: 'Messaging',      icon: '💬' },
  { key: 'live',       label: 'Live',           icon: '📺' },
  { key: 'wallet',     label: 'Wallet',         icon: '💳' },
  { key: 'bots',       label: 'Bots',           icon: '🤖' },
  { key: 'marketing',  label: 'Marketing',      icon: '📣' },
  { key: 'orders',     label: 'Orders',         icon: '🧾' },
  { key: 'account',    label: 'Account',        icon: '👤' },
  { key: 'security',   label: 'Security',       icon: '🛡️' },
  { key: 'support',    label: 'Support',        icon: '🆘' },
  { key: 'utility',    label: 'Utilities',      icon: '🧰' },
]

const activeCat = ref('all')
const query = ref('')

/* ---------- Helper: safe routing by name or path ---------- */
function asShortcut({ key, label, icon, caption, cat, to, path }) {
  let isRoute = false
  let finalTo

  try {
    // 1) Resolve by name only if the target has no dynamic params or we provided params
    if (to?.name) {
      const r = router.resolve({ name: to.name, params: to.params || {}, query: to.query || {} })
      const hasDynamic = r?.matched?.some(rec => rec.path.includes(':')) || false
      const hasParams  = !!(to.params && Object.keys(to.params).length)
      if (r?.matched?.length && (!hasDynamic || hasParams)) {
        isRoute = true
        finalTo = { name: to.name, params: to.params, query: to.query }
      }
    }

    // 2) Otherwise try a registered path
    if (!isRoute && (path || to?.path)) {
      const r2 = router.resolve({ path: path || to.path })
      if (r2?.matched?.length) {
        isRoute = true
        finalTo = { path: path || to.path }
      }
    }
  } catch {
    isRoute = false
  }

  return {
    key, label, icon, caption, cat,
    _isRoute: isRoute,
    to: finalTo,
    path: finalTo?.path || path || '#'
  }
}

/* ---------------- Shortcuts (PUBLIC) ---------------- */
const shortcuts = [
  // Messaging
  asShortcut({ key:'inbox', label:'Inbox', icon:'📥', caption:'All incoming', cat:'messaging',
    to:{ name:'Inbox' }, path:'/inbox' }),
  asShortcut({ key:'messages', label:'Messages', icon:'✉️', caption:'Conversations', cat:'messaging',
    to:{ name:'Messages' }, path:'/messages' }),
  asShortcut({ key:'integration', label:'Integrations', icon:'🔗', caption:'Connect apps', cat:'messaging',
    to:{ name:'IntegrationView' }, path:'/integrations' }),
  asShortcut({ key:'livechat', label:'Live Chat', icon:'💬', caption:'Web chat', cat:'messaging',
    to:{ name:'LiveChat' }, path:'/live_chat' }),

  // Live
  asShortcut({ key:'livehost', label:'Live Host', icon:'🧑‍🚀', caption:'Host tools', cat:'live',
    to:{ name:'LiveHostView' }, path:'/live/host' }),
  asShortcut({ key:'lobby', label:'Live Lobby', icon:'🛗', caption:'Join / Prepare', cat:'live',
    to:{ name:'LiveLobby' }, path:'/live/lobby' }),
  asShortcut({ key:'hub', label:'Live Hub', icon:'📡', caption:'Streams hub', cat:'live',
    to:{ name:'LiveStreamHub' }, path:'/live/hub' }),
  asShortcut({ key:'livesettings', label:'Live Settings', icon:'⚙️', caption:'Live preferences', cat:'live',
    to:{ name:'LiveStreamSettings' }, path:'/live/settings' }),

  // Wallet
  asShortcut({ key:'recharge', label:'Recharge Wallet', icon:'➕💰', caption:'Top up', cat:'wallet',
    to:{ name:'RechargeWalletView' }, path:'/wallet/recharge' }),
  asShortcut({ key:'wallet', label:'SmartCoin Wallet', icon:'👛', caption:'Balance & history', cat:'wallet',
    to:{ name:'SmartCoinWallet' }, path:'/wallet' }),
  asShortcut({ key:'giftshop', label:'Gift Shop', icon:'🎁', caption:'Send gifts', cat:'wallet',
    to:{ name:'GiftShopView' }, path:'/gifts' }),
  asShortcut({ key:'paymentstatus', label:'Payment Status', icon:'⏳', caption:'Payments', cat:'wallet',
    to:{ name:'PaymentStatus' }, path:'/payments/status' }),

  // Bots
  asShortcut({ key:'mybots', label:'My Bots', icon:'🤖', caption:'Manage bots', cat:'bots',
    to:{ name:'MyBots' }, path:'/bots' }),
  asShortcut({ key:'createmybot', label:'Create My Bot', icon:'🧩', caption:'New bot', cat:'bots',
    to:{ name:'CreateMyBot' }, path:'/bots/create' }),
  asShortcut({ key:'botintegration', label:'Bot Integration', icon:'🧷', caption:'Connect bot', cat:'bots',
    to:{ name:'BotIntegration' }, path:'/bots/integration' }),
  asShortcut({ key:'botsmarket', label:'Bots Market', icon:'🏪', caption:'Discover', cat:'bots',
    to:{ name:'BotsMarket' }, path:'/bots/market' }),
  asShortcut({ key:'botsstats', label:'Bots Stats', icon:'📈', caption:'Performance', cat:'bots',
    to:{ name:'BotsStats' }, path:'/bots/stats' }), // NOTE: name must match router

  // Marketing
  asShortcut({ key:'mycampaigns', label:'My Campaigns', icon:'🗂️', caption:'All campaigns', cat:'marketing',
    to:{ name:'MyCampaignsView' }, path:'/campaigns/mine' }),
  asShortcut({ key:'autoresponder', label:'Autoresponder', icon:'🔁', caption:'Auto replies', cat:'marketing',
    to:{ name:'AutoresponderView' }, path:'/autoresponder' }),
  asShortcut({ key:'promomaterial', label:'Promo Material', icon:'🎨', caption:'Assets', cat:'marketing',
    to:{ name:'CreatePromoMaterial' }, path:'/promo/material' }),
  asShortcut({ key:'promotionprofile', label:'Promotion Profile', icon:'🧾', caption:'Promo details', cat:'marketing',
    to:{ name:'PromotionProfile' }, path:'/promo/profile' }),
  asShortcut({ key:'referral', label:'Referral Campaigns', icon:'🧲', caption:'Build & track', cat:'marketing',
    to:{ name:'ReferralCampaignBuilder' }, path:'/referrals' }),

  // Orders (avoid dynamic :id)
  asShortcut({ key:'orders', label:'Orders', icon:'📦', caption:'All orders', cat:'orders',
    to:{ name:'Orders' }, path:'/orders' }),

  // Account
  asShortcut({ key:'myacc', label:'My Account Home', icon:'🏠', caption:'Overview', cat:'account',
    to:{ name:'MyAccountHome' }, path:'/account' }),
  asShortcut({ key:'profileview', label:'Profile View', icon:'🪪', caption:'Public profile', cat:'account',
    to:{ name:'UserProfileView' }, path:'/profile/view' }),
  asShortcut({ key:'profilesettings', label:'Profile Settings', icon:'⚙️', caption:'Edit profile', cat:'account',
    to:{ name:'UserProfileSettings' }, path:'/profile/settings' }),
  asShortcut({ key:'privacy', label:'Privacy Center', icon:'🔐', caption:'Control data', cat:'account',
    to:{ name:'PrivacyCenter' }, path:'/privacy' }),
  asShortcut({ key:'pricing', label:'Pricing', icon:'🏷️', caption:'Plans & prices', cat:'account',
    to:{ name:'Pricing' }, path:'/pricing' }),
  asShortcut({ key:'plans', label:'Plans', icon:'📜', caption:'Subscriptions', cat:'account',
    to:{ name:'PlansView' }, path:'/plans' }),
  asShortcut({ key:'mybusiness', label:'My Business', icon:'🏢', caption:'Company info', cat:'account',
    to:{ name:'MyBusiness' }, path:'/my-business' }),

  // Utilities & Support
  asShortcut({ key:'map', label:'Map View', icon:'🗺️', caption:'Locations', cat:'utility',
    to:{ name:'MapView' }, path:'/map' }),
  asShortcut({ key:'mylogs', label:'My Logs', icon:'📘', caption:'Activity log', cat:'utility',
    to:{ name:'MyLogs' }, path:'/activity-log' }),
  asShortcut({ key:'help', label:'Help Center', icon:'❓', caption:'Get help', cat:'support',
    to:{ name:'HelpCenter' }, path:'/help' }),

  // Security
  asShortcut({ key:'verify', label:'Verify Code', icon:'✅', caption:'OTP verification', cat:'security',
    to:{ name:'VerifyCode' }, path:'/verify-code' }),
  asShortcut({ key:'2fa', label:'Two-Factor', icon:'🔑', caption:'2FA settings', cat:'security',
    to:{ name:'TwoFactor' }, path:'/two-factor' }),
  asShortcut({ key:'resetpw', label:'Reset Password', icon:'🧹', caption:'Forgot/Reset', cat:'security',
    to:{ name:'ResetPassword' }, path:'/reset-password' }),
  asShortcut({ key:'forgotpw', label:'Forgot Password', icon:'🆘', caption:'Recover', cat:'security',
    to:{ name:'ForgotPassword' }, path:'/forgot-password' }),
  asShortcut({ key:'delete', label:'Delete Account', icon:'🗑️', caption:'Close account', cat:'security',
    to:{ name:'DeleteAccountView' }, path:'/account/delete' }),

  // Toggles
  asShortcut({ key:'voice', label:'Voice Toggle', icon:'🎙️', caption:'Mic on/off', cat:'utility',
    to:{ name:'VoiceToggle' }, path:'/voice-toggle' }),
  asShortcut({ key:'screen', label:'Screen Share Toggle', icon:'🖥️', caption:'Share screen', cat:'utility',
    to:{ name:'ScreenShareToggle' }, path:'/screen-share' }),
]

/* -------- Platforms preview -------- */
const platforms = ref([
  { name: 'whatsapp', label: 'WhatsApp', icon: '📱', connected: true  },
  { name: 'telegram', label: 'Telegram', icon: '🛩️', connected: true },
  { name: 'sms',      label: 'SMS',      icon: '📟', connected: false },
  { name: 'email',    label: 'Email',    icon: '✉️', connected: true  }
])

/* -------- Filtering -------- */
const filteredShortcuts = computed(() => {
  const q = query.value.trim().toLowerCase()
  return shortcuts.filter(s => {
    const byCat = activeCat.value === 'all' ? true : s.cat === activeCat.value
    const byQ = !q
      || s.label.toLowerCase().includes(q)
      || s.caption.toLowerCase().includes(q)
      || s.cat.toLowerCase().includes(q)
    return byCat && byQ
  })
})
</script>

<style scoped>
/* ===== Mobile-first base ===== */
.sa-page{ max-width: 980px; margin: 0 auto; padding: 14px; }
.sa-top{ padding: 4px 2px 12px }
.sa-title{ font-size: 1.25rem; font-weight: 800; color:#111827 }
.sa-sub{ color:#6b7280; font-size:.9rem; margin-top:2px }

/* Search */
.sa-search{ margin-top: 10px }
.sa-inp{
  width:100%; min-height:44px; border:1px solid #e5e7eb; border-radius:12px;
  padding:10px 12px; outline:none; background:#fff;
}
.sa-inp:focus{ border-color:#2563eb; box-shadow:0 0 0 2px #2563eb33 }

/* Chips */
.sa-chips{ display:flex; overflow:auto; gap:8px; padding:10px 2px 2px; scrollbar-width:none }
.sa-chips::-webkit-scrollbar{ display:none }
.sa-chip{
  white-space:nowrap; border:1px solid #e5e7eb; background:#f9fafb; color:#111827;
  border-radius:999px; padding:8px 12px; font-weight:700; font-size:.85rem;
}
.sa-chip.active{ background:#2563eb; color:#fff; border-color:#2563eb }

/* Card */
.sa-card{
  background:#fff; border:1px solid #e5e7eb; border-radius:16px;
  padding:14px; margin-top:12px; box-shadow:0 6px 18px rgba(0,0,0,.04);
}

/* Grid */
.sa-grid{
  display:grid; gap:10px;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}
.sa-tile{
  display:flex; flex-direction:column; align-items:flex-start; justify-content:center;
  min-height:100px; gap:6px; border:1px solid #e5e7eb; border-radius:14px; text-decoration:none;
  background:#f9fafb; color:#111827; padding:10px; font-weight:700;
}
.sa-tile:active{ transform: scale(.98) }
.sa-ico{ font-size: 1.3rem }
.sa-lbl{ font-size: .95rem }
.sa-cap{ font-size: .78rem; color:#6b7280; font-weight:600 }

/* Empty */
.sa-empty{ text-align:center; color:#6b7280; padding:16px 0 }

/* Platforms */
.sa-ctitle{ font-weight:800; font-size:1rem; margin-bottom:10px; color:#1f2937 }
.sa-pgrid{ display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.sa-plat{ border:1px solid #e5e7eb; border-radius:14px; padding:10px; text-align:center; background:#f9fafb }
.sa-pico{ font-size:1.2rem }
.sa-pname{ font-weight:800; margin-top:4px }
.sa-pstatus{ display:inline-block; margin-top:4px; padding:2px 8px; border-radius:999px; font-size:.75rem }
.sa-pstatus.ok{ background:#e8f8ee; color:#0f766e }
.sa-pstatus.bad{ background:#fde8e8; color:#b91c1c }

/* Larger screens */
@media (min-width: 1024px){
  .sa-title{ font-size: 1.5rem }
  .sa-grid{ grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
}
</style>
