// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { h, defineComponent, defineAsyncComponent } from 'vue'
import { customAlphabet } from 'nanoid' // IDs bora kuliko Date+Math.random

/* ────────────────────────────────────────────────────────────
   0) Live ID generator (compact, friendly, uppercase)
   ──────────────────────────────────────────────────────────── */
const makeLiveId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 12)

/* ────────────────────────────────────────────────────────────
   1) i18n loader wa hiari (hakivunji app kama huna i18n)
   ──────────────────────────────────────────────────────────── */
let _i18n = null
async function loadI18n () {
  if (_i18n !== null) return _i18n
  try {
    const mod = await import('../i18n')
    _i18n = mod?.default || mod?.i18n || mod || false
  } catch { _i18n = false }
  return _i18n
}

/* ────────────────────────────────────────────────────────────
   2) Dynamic view loaders (Vite glob) + retries + fallback
   ──────────────────────────────────────────────────────────── */
const viewModules = import.meta.glob('../views/**/*.vue')

function resolveViewLoader (path) {
  if (!path) return null
  if (viewModules[path]) return viewModules[path]

  // Case-insensitive & tolerant (ruhusu kuandika bila "../views/")
  const want = String(path).replace(/^\.\//, '').replace(/^..\/views\//, '').toLowerCase()
  const key = Object.keys(viewModules).find(k =>
    k.toLowerCase().endsWith(want) || k.toLowerCase() === `../views/${want}`
  )
  return key ? viewModules[key] : null
}

const ChunkError = defineComponent({
  name: 'ChunkError',
  props: { hint: { type: String, default: '' } },
  render () {
    return h('div', { style: 'padding:1rem' }, [
      h('h2', { style: 'margin:0 0 .25rem' }, 'Failed to load page'),
      h('p', { style: 'opacity:.8' }, [
        'Please refresh the app. ',
        this.hint ? h('code', this.hint) : null
      ])
    ])
  }
})

function sleep (ms) { return new Promise(r => setTimeout(r, ms)) }

// Detect transient chunk errors
function isTransientChunkError (err) {
  const msg = String(err?.message || err || '')
  return /Failed to fetch dynamically imported module|Loading chunk .* failed|Importing a module script failed|ChunkLoadError/i.test(msg)
}

// One-time recovery: clear SW + caches then hard-reload with cache-buster
let __triedRecovery = false
async function recoverFromChunkErrorOnce () {
  if (__triedRecovery) return
  __triedRecovery = true
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      regs.forEach(r => r.unregister())
    }
  } catch {}
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } catch {}
  const u = new URL(location.href)
  u.searchParams.set('v', Date.now().toString())
  location.replace(u.toString())
}

function lazyAny (pathsOrFns, { retries = 2, delay = 140, timeout = 20000 } = {}) {
  const entries = Array.isArray(pathsOrFns) ? pathsOrFns : [pathsOrFns]
  const loaders = entries
    .map(e => (typeof e === 'function' ? e : resolveViewLoader(String(e))))
    .filter(Boolean)

  if (!loaders.length) {
    return defineAsyncComponent({
      loader: async () => ({ default: ChunkError }),
      suspensible: false
    })
  }

  return defineAsyncComponent({
    loader: async () => {
      for (const load of loaders) {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await load()
          } catch (err) {
            if (attempt < retries && isTransientChunkError(err)) await sleep(delay)
            else if (!attempt && isTransientChunkError(err)) await sleep(delay)
            else break
          }
        }
      }
      // kama imefeli kabisa, jaribu recovery moja kwa moja (SW/cache) kisha toa fallback
      recoverFromChunkErrorOnce().catch(() => {})
      return { default: ChunkError }
    },
    timeout,
    suspensible: false,
    onError (error, retry, fail, attempts) {
      if (isTransientChunkError(error) && attempts <= retries) return setTimeout(retry, delay)
      return fail(error)
    }
  })
}

// Prefetch ya hiari (tunaiita kwenye beforeEnter ya baadhi ya routes)
function prefetchView (path) {
  try { const l = resolveViewLoader(path); if (l) l() } catch {}
}

/* ────────────────────────────────────────────────────────────
   3) Auth helpers (token & role)
   ──────────────────────────────────────────────────────────── */
function lsGet (k) { try { return localStorage.getItem(k) || '' } catch { return '' } }
function readCookie (name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\\]\\/+^])/g, '\\$1') + '=([^;]+)'))
  return m ? decodeURIComponent(m[1]) : ''
}
function getToken () {
  return lsGet('access_token') || readCookie('sb_access') || ''
}
function getRole () {
  return (lsGet('user_role') || '').toLowerCase().trim()
}

/* ────────────────────────────────────────────────────────────
   4) Views (lazy)
   ──────────────────────────────────────────────────────────── */
const SignupPage            = lazyAny(['../views/SignupPage.vue'])
const LoginPage             = lazyAny(['../views/LoginPage.vue'])
const ForgotPassword        = lazyAny(['../views/ForgotPasswordPage.vue'])
const VerifyCode            = lazyAny(['../views/VerifyCode.vue'])
const ResetPassword         = lazyAny(['../views/ResetPassword.vue'])
const TwoFactor             = lazyAny(['../views/TwoFactorPage.vue'])

const LandingPage           = lazyAny(['../views/LandingPageView.vue'])
const NotFound              = lazyAny(['../views/NotFound.vue'])
const Unauthorized          = lazyAny(['../views/Unauthorized.vue'])
const AccountDeleted        = lazyAny(['../views/AccountDeleted.vue'])

const DashboardAdmin        = lazyAny(['../views/DashboardAdmin.vue'])
const DashboardUser         = lazyAny(['../views/DashboardUser.vue'])
const DashboardOwner        = lazyAny(['../views/DashboardOwner.vue'])

const AutoresponderView     = lazyAny(['../views/AutoresponderView.vue'])
const AnalyticsDashboard    = lazyAny(['../views/AnalyticsDashboard.vue'])
const SettingsBranding      = lazyAny(['../views/SettingsBranding.vue'])
const UserProfileSettings   = lazyAny(['../views/UserProfileSettings.vue'])
const MessagingCenter       = lazyAny(['../views/MessagingCenter.vue'])
const ScheduledPromotions   = lazyAny(['../views/ScheduledPromotions.vue'])
const SupportCenter         = lazyAny(['../views/SupportCenter.vue'])
const LiveStreamHub         = lazyAny(['../views/LiveStreamHub.vue'])
const AffiliateDashboard    = lazyAny(['../views/AffiliateDashboard.vue'])

const MyBusiness            = lazyAny(['../views/MyBusiness.vue'])
const BusinessProfile       = lazyAny(['../views/BusinessProfile.vue'])
const Customers             = lazyAny(['../views/Customers.vue'])
const CustomerProfile       = lazyAny(['../views/CustomerProfile.vue'])
const Products              = lazyAny(['../views/Products.vue'])
const ProductProfile        = lazyAny(['../views/ProductProfile.vue'])
const Orders                = lazyAny(['../views/Orders.vue'])
const OrderProfile          = lazyAny(['../views/OrderProfile.vue'])
const PromotionProfile      = lazyAny(['../views/PromotionProfile.vue'])

const Notifications         = lazyAny(['../views/Notifications.vue'])
const LoyaltyRewards        = lazyAny(['../views/LoyaltyRewards.vue'])
const HelpCenter            = lazyAny(['../views/HelpCenter.vue'])
const BillingView           = lazyAny(['../views/BillingView.vue'])
const SmartAssistant        = lazyAny(['../views/SmartAssistant.vue'])
const MyLogs                = lazyAny(['../views/MyLogs.vue'])

const Inbox                 = lazyAny(['../views/Inbox.vue'])
const Messages              = lazyAny(['../views/Messages.vue'])
const IntegrationView       = lazyAny(['../views/IntegrationView.vue'])
const LiveChat              = lazyAny(['../views/LiveChat.vue'])

const LiveHostView          = lazyAny(['../views/LiveHostView.vue'])
const LiveLobby             = lazyAny(['../views/LiveLobby.vue'])
const LiveStreamSettings    = lazyAny(['../views/LiveStreamSettings.vue'])
const LiveRoom              = lazyAny(['../views/LiveRoom.vue', '../views/liveroom.vue', '../views/LiveRoom/index.vue'])

const RechargeWalletView    = lazyAny(['../views/RechargeWalletView.vue'])
const SmartCoinWallet       = lazyAny(['../views/SmartCoinWallet.vue'])
const GiftShopView          = lazyAny(['../views/GiftShopView.vue'])
const PaymentStatus         = lazyAny(['../views/PaymentStatus.vue'])

const MyBots                = lazyAny(['../views/MyBots.vue'])
const CreateMyBot           = lazyAny(['../views/CreateMyBot.vue'])
const BotIntegrationsMobile = lazyAny(['../views/BotIntegrationsMobile.vue'])
const BotsMarket            = lazyAny(['../views/BotsMarket.vue'])
const BotsStats             = lazyAny(['../views/BotStats.vue', '../views/BotsStats.vue'])

const MyCampaignsView       = lazyAny(['../views/MyCampaignsView.vue'])
const CreatePromoMaterial   = lazyAny(['../views/CreatePromoMaterial.vue'])
const ReferralCampaignBuilder = lazyAny(['../views/ReferralCampaignBuilder.vue'])

const Pricing               = lazyAny(['../views/Pricing.vue'])
const PlansView             = lazyAny(['../views/PlansView.vue'])
const PrivacyCenter         = lazyAny(['../views/PrivacyCenter.vue'])
const MyAccountHome         = lazyAny(['../views/MyAccountHome.vue'])
const UserProfileView       = lazyAny(['../views/UserProfileView.vue'])
const MapView               = lazyAny(['../views/MapView.vue'])

const DeleteAccountView     = lazyAny(['../views/DeleteAccountView.vue'])
const VoiceToggle           = lazyAny(['../views/VoiceToggle.vue'])
const ScreenShareToggle     = lazyAny(['../views/ScreenShareToggle.vue'])

const DroneTracker          = lazyAny(['../views/DroneMonitor.vue', '../views/DroneTracker.vue'])

const ManageUsersView       = lazyAny(['../views/ManageUsersView.vue'])
const TeamManagementView    = lazyAny(['../views/TeamManagementView.vue'])
const PayoutAdminView       = lazyAny(['../views/PayoutAdminView.vue'])
const SmartOwnerConsole     = lazyAny(['../views/SmartOwnerConsole.vue'])
const SmartDeploy           = lazyAny(['../views/SmartDeploy.vue'])
const AuditLogView          = lazyAny(['../views/AuditLogView.vue'])
const AuditLogHistory       = lazyAny(['../views/AuditLogHistory.vue'])

/* ────────────────────────────────────────────────────────────
   5) Routes
   ──────────────────────────────────────────────────────────── */
const routes = [
  { path: '/', component: LandingPage, name: 'Home', meta: { title: 'Home' } },

  // Auth
  { path: '/signup', component: SignupPage, name: 'Signup', meta: { guestOnly: true, title: 'Sign up' } },
  { path: '/login', component: LoginPage, name: 'Login', meta: { guestOnly: true, title: 'Login' } },
  { path: '/forgot-password', component: ForgotPassword, name: 'ForgotPassword', meta: { guestOnly: true, title: 'Forgot Password' } },
  { path: '/verify-code', component: VerifyCode, name: 'VerifyCode', meta: { guestOnly: true, title: 'Verify Code' } },
  { path: '/reset-password', component: ResetPassword, name: 'ResetPassword', meta: { guestOnly: true, title: 'Reset Password' } },
  { path: '/two-factor', component: TwoFactor, name: 'TwoFactor', meta: { requires2FA: true, title: 'Two Factor' } },
  { path: '/account-deleted', component: AccountDeleted, name: 'AccountDeleted', meta: { guestOnly: true, title: 'Account Deleted' } },

  // Role redirector
  {
    path: '/dashboard',
    name: 'Dashboard',
    meta: { title: 'Dashboard' },
    beforeEnter: (to, from, next) => {
      const role = getRole()
      if (role === 'owner') return next('/dashboard/owner')
      if (role === 'admin') return next('/dashboard/admin')
      if (role === 'user')  return next('/dashboard/user')
      return next('/login')
    }
  },

  // Dashboards
  { path: '/dashboard/user',  component: DashboardUser,  name: 'DashboardUser',  meta: { requiresAuth: true, requiresRole: 'user',  title: 'User Dashboard' } },
  { path: '/dashboard/admin', component: DashboardAdmin, name: 'DashboardAdmin', meta: { requiresAuth: true, requiresRole: 'admin', title: 'Admin Dashboard' } },
  { path: '/dashboard/owner', component: DashboardOwner, name: 'DashboardOwner', meta: { requiresAuth: true, requiresRole: 'owner', title: 'Owner Dashboard' } },

  // Core
  { path: '/autoresponder', component: AutoresponderView,  name: 'Autoresponder',        meta: { requiresAuth: true, title: 'Autoresponder' } },
  { path: '/analytics',     component: AnalyticsDashboard, name: 'Analytics',            meta: { requiresAuth: true, title: 'Analytics' } },
  { path: '/settings',      component: SettingsBranding,   name: 'Settings',             meta: { requiresAuth: true, title: 'Branding' } },
  { path: '/profile',       component: UserProfileSettings,name: 'UserProfile',          meta: { requiresAuth: true, title: 'Profile' } },
  { path: '/messaging-center', component: MessagingCenter, name: 'MessagingCenter',      meta: { requiresAuth: true, title: 'Messaging' } },
  { path: '/scheduled-promotions', component: ScheduledPromotions, name: 'ScheduledPromotions', meta: { requiresAuth: true, title: 'Scheduled Promotions' } },
  { path: '/support',       component: SupportCenter,      name: 'Support',              meta: { requiresAuth: true, title: 'Support' } },

  /* ========== Live ========== */
  {
    path: '/live-stream',
    component: LiveStreamHub,
    name: 'LiveStreamHub',
    meta: { requiresAuth: true, title: 'Live Hub' },
    alias: ['/live/hub'],
    beforeEnter: () => { prefetchView('../views/LiveRoom.vue') }
  },
  { path: '/live', redirect: '/live-stream' },
  {
    path: '/live/new',
    name: 'LiveNew',
    meta: { requiresAuth: true, title: 'New Live' },
    redirect: () => ({ name: 'live-room', params: { id: makeLiveId() } })
  },
  {
    path: '/live/:id',
    component: LiveRoom,
    name: 'live-room',
    props: true,
    meta: { requiresAuth: true, title: 'Live Room' },
    alias: ['/live/room/:id', '/l/:id']
  },
  { path: '/live/host',     component: LiveHostView,       name: 'LiveHostView',       meta: { requiresAuth: true, title: 'Live Host' } },
  { path: '/live/lobby',    component: LiveLobby,          name: 'LiveLobby',          meta: { requiresAuth: true, title: 'Live Lobby' } },
  { path: '/live/settings', component: LiveStreamSettings, name: 'LiveStreamSettings', meta: { requiresAuth: true, title: 'Live Settings' } },

  // Affiliate
  { path: '/affiliate', component: AffiliateDashboard, name: 'AffiliateDashboard', meta: { requiresAuth: true, title: 'Affiliate' } },

  // Tracking / Rewards
  {
    path: '/drone_tracking',
    component: DroneTracker,
    name: 'DroneTracking',
    meta: { requiresAuth: true, title: 'Drones' },
    alias: ['/drones/missions', '/drone-missions', '/drone/monitor']
  },
  {
    path: '/loyalty_rewards',
    component: LoyaltyRewards,
    name: 'LoyaltyRewards',
    meta: { requiresAuth: true, title: 'Loyalty' },
    alias: ['/loyalty']
  },

  // Notifications, help, billing
  { path: '/notifications', component: Notifications, name: 'Notifications', meta: { requiresAuth: true, title: 'Notifications' } },
  { path: '/help',          component: HelpCenter,   name: 'HelpCenter',    meta: { requiresAuth: true, title: 'Help' } },
  { path: '/billing',       component: BillingView,  name: 'Billing',       meta: { requiresAuth: true, title: 'Billing' } },

  // Activity log
  {
    path: '/activity-log',
    component: MyLogs,
    name: 'MyLogs',
    meta: { requiresAuth: true, title: 'Activity Log' },
    alias: ['/my-logs', '/activity_logs']
  },

  // Smart Assistant
  {
    path: '/assistant',
    component: SmartAssistant,
    name: 'SmartAssistant',
    meta: { requiresAuth: true, title: 'Smart Assistant' },
    alias: ['/assistant-assistant', '/smart-assistant', '/smart_assistance']
  },

  // Business & commerce
  { path: '/my-business', component: MyBusiness, name: 'MyBusiness', meta: { requiresAuth: true, title: 'My Business' } },
  { path: '/business-profile/:id', component: BusinessProfile, name: 'BusinessProfile', meta: { requiresAuth: true, title: 'Business Profile' }, props: true },
  { path: '/customers', component: Customers, name: 'Customers', meta: { requiresAuth: true, title: 'Customers' } },
  { path: '/customer-profile/:id', component: CustomerProfile, name: 'CustomerProfile', meta: { requiresAuth: true, title: 'Customer Profile' }, props: true },
  { path: '/products', component: Products, name: 'Products', meta: { requiresAuth: true, title: 'Products' } },
  { path: '/product-profile/:id', component: ProductProfile, name: 'ProductProfile', meta: { requiresAuth: true, title: 'Product' }, props: true },
  { path: '/orders', component: Orders, name: 'Orders', meta: { requiresAuth: true, title: 'Orders' } },
  { path: '/order-profile/:id', component: OrderProfile, name: 'OrderProfile', meta: { requiresAuth: true, title: 'Order' }, props: true },
  { path: '/promotion-profile/:id', component: PromotionProfile, name: 'PromotionProfile', meta: { requiresAuth: true, title: 'Promotion' }, props: true },

  // SmartAssistant targets
  { path: '/inbox', component: Inbox, name: 'Inbox', meta: { requiresAuth: true, title: 'Inbox' } },
  { path: '/messages', component: Messages, name: 'Messages', meta: { requiresAuth: true, title: 'Messages' } },
  { path: '/integrations', component: IntegrationView, name: 'IntegrationView', meta: { requiresAuth: true, title: 'Integrations' } },
  { path: '/live_chat', component: LiveChat, name: 'LiveChat', meta: { requiresAuth: true, title: 'Live Chat' } },

  // Wallet / Gifts
  { path: '/wallet/recharge', component: RechargeWalletView, name: 'RechargeWalletView', meta: { requiresAuth: true, title: 'Recharge Wallet' } },
  { path: '/wallet', component: SmartCoinWallet, name: 'SmartCoinWallet', meta: { requiresAuth: true, title: 'SmartCoin Wallet' } },
  { path: '/gifts', component: GiftShopView, name: 'GiftShopView', meta: { requiresAuth: true, title: 'Gift Shop' } },
  { path: '/payments/status', component: PaymentStatus, name: 'PaymentStatus', meta: { requiresAuth: true, title: 'Payment Status' } },

  // Bots
  { path: '/bots', component: MyBots, name: 'MyBots', meta: { requiresAuth: true, title: 'My Bots' } },
  { path: '/bots/create', component: CreateMyBot, name: 'CreateMyBot', meta: { requiresAuth: true, title: 'Create Bot' } },
  {
    path: '/bots/integration/:id?',
    component: BotIntegrationsMobile,
    name: 'BotIntegrations',
    props: true,
    meta: { requiresAuth: true, title: 'Bot Integrations' },
    alias: ['/bots/integration', '/bot/integration']
  },
  { path: '/bots/market', component: BotsMarket, name: 'BotsMarket', meta: { requiresAuth: true, title: 'Bots Market' } },
  { path: '/bots/stats', component: BotsStats, name: 'BotsStats', meta: { requiresAuth: true, title: 'Bots Stats' } },

  // Campaigns & Referrals
  { path: '/campaigns/mine', component: MyCampaignsView, name: 'MyCampaignsView', meta: { requiresAuth: true, title: 'My Campaigns' } },
  { path: '/promo/material', component: CreatePromoMaterial, name: 'CreatePromoMaterial', meta: { requiresAuth: true, title: 'Promo Material' } },
  { path: '/referrals', component: ReferralCampaignBuilder, name: 'ReferralCampaignBuilder', meta: { requiresAuth: true, title: 'Referral Builder' } },

  // Plans / Account
  { path: '/pricing', component: Pricing, name: 'Pricing', meta: { requiresAuth: true, title: 'Pricing' } },
  { path: '/plans', component: PlansView, name: 'PlansView', meta: { requiresAuth: true, title: 'Plans' } },
  { path: '/privacy', component: PrivacyCenter, name: 'PrivacyCenter', meta: { requiresAuth: true, title: 'Privacy' } },
  { path: '/account', component: MyAccountHome, name: 'MyAccountHome', meta: { requiresAuth: true, title: 'Account' } },
  { path: '/profile/view', component: UserProfileView, name: 'UserProfileView', meta: { requiresAuth: true, title: 'Profile' } },
  { path: '/map', component: MapView, name: 'MapView', meta: { requiresAuth: true, title: 'Map' } },

  // Misc
  { path: '/account/delete', component: DeleteAccountView, name: 'DeleteAccountView', meta: { requiresAuth: true, title: 'Delete Account' } },
  { path: '/voice-toggle', component: VoiceToggle, name: 'VoiceToggle', meta: { requiresAuth: true, title: 'Voice' } },
  { path: '/screen-share', component: ScreenShareToggle, name: 'ScreenShareToggle', meta: { requiresAuth: true, title: 'Screen Share' } },

  // Admin / Owner
  { path: '/owner/manage-users', component: ManageUsersView, name: 'ManageUsersView', meta: { requiresAuth: true, roles: ['admin', 'owner'], title: 'Manage Users' }, alias: ['/admin/users'] },
  { path: '/owner/team-management', component: TeamManagementView, name: 'TeamManagementView', meta: { requiresAuth: true, roles: ['admin', 'owner'], title: 'Team Management' }, alias: ['/admin/team'] },
  { path: '/admin/payouts', component: PayoutAdminView, name: 'PayoutAdminView', meta: { requiresAuth: true, roles: ['admin', 'owner'], title: 'Payouts' }, alias: ['/owner/payouts'] },
  { path: '/owner/console', component: SmartOwnerConsole, name: 'SmartOwnerConsole', meta: { requiresAuth: true, roles: ['admin', 'owner'], title: 'Owner Console' } },
  { path: '/owner/deploy', component: SmartDeploy, name: 'SmartDeploy', meta: { requiresAuth: true, roles: ['admin', 'owner'], title: 'Deploy' } },
  { path: '/audit/logs', component: AuditLogView, name: 'AuditLogView', meta: { requiresAuth: true, roles: ['admin', 'owner'], title: 'Audit Logs' } },
  { path: '/audit/history', component: AuditLogHistory, name: 'AuditLogHistory', meta: { requiresAuth: true, roles: ['admin', 'owner'], title: 'Audit History' } },

  // Errors (keep last)
  { path: '/unauthorized', component: Unauthorized, name: 'Unauthorized', meta: { title: 'Unauthorized' } },
  { path: '/:pathMatch(.*)*', component: NotFound, name: 'NotFound', meta: { title: 'Not Found' } }
]

/* ────────────────────────────────────────────────────────────
   6) Router
   ──────────────────────────────────────────────────────────── */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL ?? '/'),
  routes,
  scrollBehavior (to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 64 }
    return { top: 0 }
  }
})

/* Safe push (epuka error ya redundant navigation) */
const _push = router.push.bind(router)
router.push = (to) => _push(to).catch(err => {
  const msg = String(err?.message || '')
  if (msg.includes('Avoided redundant navigation') || err?.name === 'NavigationDuplicated') return Promise.resolve()
  return Promise.reject(err)
})

/* Chunk error handler (global) */
router.onError(err => {
  if (isTransientChunkError(err)) {
    recoverFromChunkErrorOnce().catch(() => {})
  }
})

/* ────────────────────────────────────────────────────────────
   7) Guards: i18n, titles, auth, roles
   ──────────────────────────────────────────────────────────── */
router.beforeEach(async (to, from, next) => {
  // i18n (lazy, non-blocking)
  const lang = lsGet('user_lang') || 'en'
  loadI18n().then(inst => { try { if (inst?.global) inst.global.locale = lang } catch {} })

  // Title
  try { document.title = to.meta?.title ? `${to.meta.title} • SmartBiz` : 'SmartBiz' } catch {}

  // Auth/roles
  const token    = getToken()
  const role     = getRole()
  const needs2FA = lsGet('needs_2fa') === 'true'

  if (to.meta?.guestOnly && token) return next('/dashboard')
  if (to.meta?.requiresAuth && !token) return next({ name: 'Login', query: { redirect: to.fullPath } })
  if (to.meta?.requires2FA && (!token || !needs2FA)) return next({ name: 'Login', query: { redirect: to.fullPath } })

  if (Array.isArray(to.meta?.roles) && to.meta.roles.length) {
    const allowed = to.meta.roles.includes(role) || (role === 'owner' && to.meta.roles.includes('admin'))
    if (!allowed) return next('/unauthorized')
  }
  if (to.meta?.requiresRole && role !== to.meta.requiresRole && role !== 'owner') {
    return next('/unauthorized')
  }
  next()
})

export default router
