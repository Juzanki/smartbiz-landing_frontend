/* fanya updates ya nguvu andika code */
/* ============================================================================
 *  SmartBiz Assistance — App Router (Polished & SPA-safe) ✅ PRODUCTION UPDATE
 *  - Fix "random logout" + "rotation" (no hard location.assign loops)
 *  - Listen to axios auth logout event: smartbiz:auth:logout
 *  - Chunk reload self-heal: reload ONCE only (prevents infinite reload)
 *  - Soft token check + session restore + offline-safe
 *  - Messaging flow: /dashboard/messages/:threadId
 *  - ✅ FIX: Missing dashboard routes restored
 *  - ✅ FIX: EarnHub sub-pages routes (remove 404 for goTask): /earnhub/*
 *  - ✅ FIX: /wallet 404 caused by unsafe dynamic import patterns → standard lazy imports
 *  - ✅ FIX: NETLIFY/VITE build crash from missing DevRoot.vue → DEV routes truly gated
 *  - ✅ UPDATE: Added/Fixed routes for:
 *      CreateProduct.vue, ScheduledPromotions.vue, SupportRequestView.vue,
 *      SupportInboxView.vue, AnalyticsView.vue, WithdrawRequestView.vue,
 *      IntegrationView.vue, AiBotsMarketMobile.vue, CreateMyBot.vue,
 *      BotIntegrationsMobile.vue, AutoresponderView.vue
 *  - ✅ UPDATE: Auth utility pages no longer auto-redirect to DashboardUser
 *      (TwoFactorPage.vue, VerifyCode.vue, ResetPassword.vue, ForgotPasswordPage.vue)
 *  - ✅ ADDED: BotConfigure route for configuring AI bots plans
 * ========================================================================== */

import { createRouter, createWebHistory } from "vue-router"
import http from "@/utils/http"
import { initNavHistory } from "@/composables/useNavHistory"

/* ────────────────────────────────────────────────────────────────────────────
 *  DEV GATE (CRITICAL FOR PRODUCTION BUILDS)
 *  - Do NOT statically import dev files
 *  - Do NOT use string-literal dynamic imports for dev routes
 *  - Use computed path + @vite-ignore so Vite won't resolve missing dev files
 * ────────────────────────────────────────────────────────────────────────── */
const isDev = import.meta.env.DEV === true
const devViewPath = (file) => `/src/views/dev/${file}`
const devImport = (file) => () => import(/* @vite-ignore */ devViewPath(file))

/* ────────────────────────────────────────────────────────────────────────────
 *  OPTIONAL NProgress (silent if missing)
 * ────────────────────────────────────────────────────────────────────────── */
let NP = null
;(async () => {
  try {
    const mod = await import("nprogress")
    NP = mod?.default || null
    NP && NP.configure({ showSpinner: false, minimum: 0.12, trickleSpeed: 120 })
  } catch {
    NP = null
  }
})()

/* ────────────────────────────────────────────────────────────────────────────
 *  SESSION HELPERS (HARDENED)
 * ────────────────────────────────────────────────────────────────────────── */
const TOKEN_KEYS = Object.freeze(["auth:access", "access_token", "accessToken", "token", "sb:access"])

const isOffline = () => {
  try {
    return typeof navigator !== "undefined" && navigator?.onLine === false
  } catch {
    return false
  }
}

const safeLSGet = (k) => {
  try {
    return (localStorage.getItem(k) || "").trim()
  } catch {
    return ""
  }
}
const safeSSGet = (k) => {
  try {
    return (sessionStorage.getItem(k) || "").trim()
  } catch {
    return ""
  }
}
const safeLSSet = (k, v) => {
  try {
    localStorage.setItem(k, String(v ?? ""))
  } catch {}
}
const safeLSDel = (k) => {
  try {
    localStorage.removeItem(k)
  } catch {}
}

const getAccessToken = () => {
  // 1) http storage first
  try {
    const t0 = (http?.getToken?.() || "").trim()
    if (t0) return t0
  } catch {}

  // 2) localStorage fallbacks
  for (const k of TOKEN_KEYS) {
    const v = safeLSGet(k)
    if (v) return v
  }

  // 3) sessionStorage fallbacks
  for (const k of TOKEN_KEYS) {
    const v = safeSSGet(k)
    if (v) return v
  }

  return ""
}

const tokenIsUsable = () => !!getAccessToken()

const safeNextPath = (raw) => {
  const s = String(raw || "").trim()
  if (!s || !s.startsWith("/")) return ""
  if (s.startsWith("//")) return ""
  return s
}

/* ────────────────────────────────────────────────────────────────────────────
 *  Route Names
 * ────────────────────────────────────────────────────────────────────────── */
export const ROUTE_NAMES = Object.freeze({
  HOME: "Home",
  LOGIN: "Login",
  SIGNUP: "Signup",
  AUTH_PAGE: "AuthPage",

  DASHBOARD: "Dashboard",
  DASH_USER: "DashboardUser",
  DASH_ADMIN: "DashboardAdmin",
  DASH_OWNER: "DashboardOwner",
  DASHBOARD_MAIN: "DashboardView",

  CUSTOMERS: "Customers",
  CUSTOMER_DETAILS: "CustomerDetails",
  CUSTOMER_PROFILE: "CustomerProfile",

  PRODUCTS: "Products",
  PRODUCT_LIST: "ProductList",
  PRODUCT_PROFILE: "ProductProfile",
  PRODUCT_DETAILS_DASH: "ProductDetailsDash",
  PRODUCT_PUBLIC_DASH: "ProductPublicDash",

  CREATE_PRODUCT: "CreateProduct",
  SCHEDULED_PROMOTIONS: "ScheduledPromotions",

  ORDERS: "Orders",
  ORDER_DETAILS: "OrderDetails",
  ORDER_PROFILE: "OrderProfile",

  CHECKOUT: "Checkout",
  PAYMENT_STATUS: "PaymentStatus",

  MSG_CENTER: "MessagingCenter",
  INBOX: "Inbox",
  MESSAGES: "Messages",
  MESSAGE_THREAD: "MessageThread",

  SUPPORT: "Support",
  SUPPORT_INBOX: "SupportInbox",
  SUPPORT_REQUESTS: "SupportRequests",

  EXPLORE: "Explore",
  PRODUCT_PUBLIC: "ProductPublic",
  MY_STORE: "MyStore",
  PROMOTE: "Promote",

  AFFILIATE: "AffiliateDashboard",
  AFFILIATE_HOME: "AffiliateHome",

  LIVE_HUB: "LiveStreamHub",
  LIVE_SETTINGS: "LiveStreamSettings",
  LIVE_LOBBY: "live-lobby",
  LIVE_ROOM: "live-room",
  LIVE_CHAT: "LiveChat",
  LIVE_HOST_VIEW: "LiveHostView",

  DRONE_MONITOR: "DroneMonitor",
  DRONE_MISSIONS: "DroneMissions",

  ANALYTICS: "Analytics",
  ANALYTICS_DASHBOARD: "AnalyticsDashboard",

  SETTINGS: "Settings",
  SETTINGS_BRANDING: "SettingsBranding",
  PROFILE: "Profile",
  PROFILE_SETTINGS: "ProfileSettings",
  BUSINESS_PROFILE: "BusinessProfile",

  NOTIFICATIONS: "Notifications",
  LOYALTY: "LoyaltyRewards",
  HELP: "HelpCenter",
  BILLING: "Billing",

  ACTIVITY_LOG: "ActivityLog",
  AUDIT_LOG: "AuditLog",
  AUDIT_HISTORY: "AuditHistory",
  SMART_ASSISTANT: "SmartAssistant",

  TEAM: "TeamManagement",
  USERS: "UserList",
  USER_PROFILE: "UserProfile",
  USER_SETTINGS: "UserProfileSettings",
  MANAGE_USERS: "ManageUsersView",
  SMART_DEPLOY: "SmartDeploy",
  OWNER_CONSOLE: "SmartOwnerConsole",
  PAYOUTS: "PayoutAdminView",

  RECHARGE: "RechargeWallet",
  SMARTCOIN_WALLET: "SmartCoinWallet",

  LEADERBOARD_GIFTS: "GiftLeaderboard",
  PROMOTER_LEADERBOARD: "PromoterLeaderboard",

  FOLLOWERS: "Followers",

  EARN_HUB: "EarnHub",
  EARN_TASK_DETAILS: "EarnHubTaskDetails",

  INTEGRATIONS: "Integrations",
  BOTS_MARKET: "BotsMarket",
  BOT_STATS: "BotStats",
  CREATE_BOT: "CreateMyBot",
  BOT_INTEGRATIONS: "BotIntegrationsMobile",
  AUTORESPONDERS: "AutoresponderView",
  AI_BOTS_MARKET_MOBILE: "AiBotsMarketMobile",
  BOT_CONFIGURE: "BotConfigure", // ✅ ADDED

  GIFT_SHOP: "GiftShopView",
  DELETE_ACCOUNT: "DeleteAccountView",

  MAP: "MapView",
  MY_ACCOUNT_HOME: "MyAccountHome",
  MY_BUSINESS: "MyBusiness",
  MY_BOTS: "MyBots",
  MY_CAMPAIGNS: "MyCampaigns",
  MY_LOGS: "MyLogs",

  WALLET_HOME_PUBLIC: "WalletHomePublic",
  WALLET_RECHARGE_PUBLIC: "WalletRechargePublic",
  WALLET_WITHDRAW_PUBLIC: "WalletWithdrawPublic",

  UNAUTHORIZED: "Unauthorized",
  ACCOUNT_DELETED: "AccountDeleted",
  NOT_FOUND: "NotFound",
  LOGOUT: "Logout",

  // DEV NAMES (routes are gated)
  DEV_ROOT: "DevRoot",
  DEV_BUTTON_COHOST: "DevCohostButton",
  DEV_CARD_PLATFORM: "DevPlatformCard",
  DEV_HOSTS_PANEL: "DevHostsPanel",
  DEV_GRID_PANEL: "DevGridPanel",
  DEV_EFFECT_CONFETTI: "DevConfettiEffect",
  DEV_EFFECT_MODAL: "DevEffectModal",
})

/* role → default dashboard path */
export const roleHome = (r0) => {
  const r = String(r0 || safeLSGet("user_role") || "user").toLowerCase()
  if (r === "owner") return "/dashboard/owner"
  if (r === "admin") return "/dashboard/admin"
  return "/dashboard/user"
}

/* optional i18n (fail-safe) */
let _i18n = null
async function loadI18n() {
  if (_i18n !== null) return _i18n
  try {
    const m = await import("@/i18n")
    _i18n = m?.default || m?.i18n || false
  } catch {
    _i18n = false
  }
  return _i18n
}

/* small /me cache */
let _meCache = null
let _meInflight = null

async function ensureSession(maxAgeMs = 20_000) {
  const now = Date.now()
  if (_meCache && now - _meCache.at < maxAgeMs) return _meCache.data
  if (_meInflight) return _meInflight

  _meInflight = (async () => {
    const t = getAccessToken()
    if (!t) throw new Error("no_token")

    const me = await (http?.meSafe ? http.meSafe("router") : http.me("router")).catch((e) => {
      if (e?.status === 401 || e?.status === 403) return null
      if (isOffline()) return "__OFFLINE__"
      return Promise.reject(e)
    })

    if (me === "__OFFLINE__") {
      const role = String(safeLSGet("user_role") || "user").toLowerCase()
      const pseudo = { user: null, role, raw: null, offline: true }
      _meCache = { at: Date.now(), data: pseudo }
      return pseudo
    }

    if (!me) throw new Error("no_session")

    _meCache = { at: Date.now(), data: me }
    safeLSSet("user_role", String(me?.role || me?.user?.role || "user").toLowerCase())
    return me
  })().finally(() => {
    _meInflight = null
  })

  return _meInflight
}

/* ============================================================================
 *  SPA-safe logout (NO rotate)
 * ========================================================================== */
export function forceLogout(toLogin = true, opts = {}) {
  const { hard = false, reason = "logout" } = opts

  try {
    http?.logout?.()
  } catch {}

  try {
    _meCache = null
    _meInflight = null
  } catch {}

  try {
    for (const k of TOKEN_KEYS) safeLSDel(k)
    safeLSDel("user_role")
    safeLSDel("auth:ttype")
    safeLSDel("token_type")
  } catch {}

  try {
    for (const k of TOKEN_KEYS) sessionStorage.removeItem(k)
    sessionStorage.removeItem("user_role")
  } catch {}

  if (!toLogin) return

  const next = encodeURIComponent(location.pathname + location.search + location.hash)

  // SPA-first (prevents rotation)
  if (!hard) {
    try {
      if (window.__SMARTBIZ_ROUTER__) {
        return window.__SMARTBIZ_ROUTER__.replace({
          name: ROUTE_NAMES.LOGIN,
          query: { next: decodeURIComponent(next), reason },
        })
      }
    } catch {}
  }

  // hard fallback only if needed
  location.assign(`/login?next=${next}&reason=${encodeURIComponent(reason)}`)
}

/* prefetch a few critical chunks */
;(function prefetchOnIdle() {
  try {
    const run = () =>
      (window.requestIdleCallback
        ? requestIdleCallback(() =>
            Promise.allSettled([
              import("@/views/DashboardUser.vue"),
              import("@/views/Customers.vue"),
              import("@/views/ExploreView.vue"),
              import("@/views/EarnHubView.vue"),
            ]),
          )
        : setTimeout(() => {
            Promise.allSettled([
              import("@/views/DashboardUser.vue"),
              import("@/views/Customers.vue"),
              import("@/views/ExploreView.vue"),
              import("@/views/EarnHubView.vue"),
            ])
          }, 800))
    if (document.readyState === "complete") run()
    else window.addEventListener("load", run, { once: true })
  } catch {}
})()

/* ────────────────────────────────────────────────────────────────────────────
 *  EAGER views
 * ────────────────────────────────────────────────────────────────────────── */
import LandingPage from "@/views/LandingPageView.vue"
import LoginPage from "@/views/LoginPage.vue"
import SignupPage from "@/views/SignupPage.vue"

// ✅ These 4 must open even if the user is logged in (no guestOnly redirect)
import ForgotPassword from "@/views/ForgotPasswordPage.vue"
import VerifyCode from "@/views/VerifyCode.vue"
import ResetPassword from "@/views/ResetPassword.vue"
import TwoFactor from "@/views/TwoFactorPage.vue"

import DashboardUser from "@/views/DashboardUser.vue"
import DashboardAdmin from "@/views/DashboardAdmin.vue"
import DashboardOwner from "@/views/DashboardOwner.vue"

import ExploreView from "@/views/ExploreView.vue"
import ProductDetailsView from "@/views/ProductDetailsView.vue"
import FavoritesView from "@/views/FavoritesView.vue"
import CartView from "@/views/CartView.vue"
import PromotionProfileView from "@/views/PromotionProfile.vue"

/* EarnHub sub-pages (static) */
import EarnHubView from "@/views/EarnHubView.vue"
import EarnHubInviteView from "@/views/earnhub/EarnHubInviteView.vue"
import EarnHubSurveyView from "@/views/earnhub/EarnHubSurveyView.vue"
import EarnHubQuestsView from "@/views/earnhub/EarnHubQuestsView.vue"
import EarnHubSponsoredView from "@/views/earnhub/EarnHubSponsoredView.vue"
import EarnHubShareStreamView from "@/views/earnhub/EarnHubShareStreamView.vue"
import EarnHubProofView from "@/views/earnhub/EarnHubProofView.vue"

/* ────────────────────────────────────────────────────────────────────────────
 *  LAZY views (production safe)
 * ────────────────────────────────────────────────────────────────────────── */
const Unauthorized = () => import("@/views/Unauthorized.vue")
const AccountDeleted = () => import("@/views/AccountDeleted.vue")
const NotFound = () => import("@/views/NotFound.vue")

const CustomersView = () => import("@/views/Customers.vue")
const CustomerDetailsView = () => import("@/views/CustomerDetails.vue")
const CustomerProfileView = () => import("@/views/CustomerProfile.vue")
const ProductsView = () => import("@/views/Products.vue")
const OrdersView = () => import("@/views/OrdersView.vue")
const OrderDetailsView = () => import("@/views/OrderDetails.vue")
const OrderProfileView = () => import("@/views/OrderProfile.vue")

const MessagingCenterView = () => import("@/views/MessagingCenter.vue")
const InboxView = () => import("@/views/Inbox.vue")
const MessagesView = () => import("@/views/Messages.vue")

const SupportView = () => import("@/views/SupportCenter.vue")
const SupportInboxView = () => import("@/views/SupportInboxView.vue")
const SupportRequestView = () => import("@/views/SupportRequestView.vue")

const FollowersView = () => import("@/views/Followers.vue")

const MyStoreView = () => import("@/views/MyStoreView.vue")
const PromoteView = () => import("@/views/PromoteView.vue")
const ProductPublicView = () => import("@/views/ProductPublic.vue")

const AffiliateView = () => import("@/views/AffiliateDashboard.vue")
const AffiliateHomeView = () => import("@/views/AffiliateHome.vue")

const LiveStreamHubView = () => import("@/views/LiveStreamHub.vue")
const LiveStreamSettingsView = () => import("@/views/LiveStreamSettings.vue")
const LiveLobbyView = () => import("@/views/LiveLobby.vue")
const LiveRoomView = () => import("@/views/LiveRoom.vue")
const LiveChatView = () => import("@/views/LiveChat.vue")
const LiveHostViewComp = () => import("@/views/LiveHostView.vue")

const DroneMonitorView = () => import("@/views/DroneMonitor.vue")
const DroneMissionsPage = () => import("@/views/drones/MissionsPage.vue")

const AnalyticsView = () => import("@/views/AnalyticsView.vue")
const AnalyticsDashboardView = () => import("@/views/AnalyticsDashboard.vue")
const SettingsView = () => import("@/views/SettingsView.vue")
const SettingsBrandingView = () => import("@/views/SettingsBranding.vue")
const MyProfileView = () => import("@/views/MyProfile.vue")
const ProfileSettingsView = () => import("@/views/ProfileSettings.vue")
const BusinessProfileView = () => import("@/views/BusinessProfile.vue")

const NotificationsView = () => import("@/views/Notifications.vue")
const LoyaltyRewardsView = () => import("@/views/LoyaltyRewards.vue")
const HelpCenterView = () => import("@/views/HelpCenter.vue")
const BillingView = () => import("@/views/BillingView.vue")

const ActivateLogView = () => import("@/views/ActivateLog.vue")
const AuditLogView = () => import("@/views/AuditLogView.vue")
const AuditLogHistoryView = () => import("@/views/AuditLogHistory.vue")
const SmartAssistantView = () => import("@/views/SmartAssistant.vue")

const TeamManagementView = () => import("@/views/TeamManagementView.vue")
const UserListView = () => import("@/views/UserView.vue")
const UserProfileView = () => import("@/views/UserProfileView.vue")
const UserProfileSettings = () => import("@/views/UserProfileSettings.vue")
const ManageUsersView = () => import("@/views/ManageUsersView.vue")
const SmartDeploy = () => import("@/views/SmartDeploy.vue")
const SmartOwnerConsole = () => import("@/views/SmartOwnerConsole.vue")
const PayoutAdminView = () => import("@/views/PayoutAdminView.vue")

const GiftLeaderboardView = () => import("@/views/leaderboard/GiftLeaderboardView.vue")
const PromoterLeaderboardView = () => import("@/views/PromoterLeaderboard.vue")

const WalletView = () => import("@/views/WalletView.vue")
const RechargeWalletView = () => import("@/views/RechargeWalletView.vue")
const WithdrawRequestView = () => import("@/views/WithdrawRequestView.vue")
const SmartCoinWalletView = () => import("@/views/SmartCoinWallet.vue")

const EarnHubTaskDetailsView = () => import("@/views/EarnHubTaskDetailsView.vue")

const IntegrationView = () => import("@/views/IntegrationView.vue")
const BotsMarket = () => import("@/views/BotsMarket.vue")
const BotStats = () => import("@/views/BotStats.vue")
const CreateMyBotView = () => import("@/views/CreateMyBot.vue")
const BotIntegrationsMobileView = () => import("@/views/BotIntegrationsMobile.vue")
const AiBotsMarketMobileView = () => import("@/views/AiBotsMarketMobile.vue")
const AutoresponderView = () => import("@/views/AutoresponderView.vue")

// ✅ ADDED: BotConfigure view
const BotConfigureView = () => import("@/views/BotConfigure.vue")

// ✅ New routes you asked (make sure these files exist under /src/views/)
const CreateProductView = () => import("@/views/CreateProduct.vue")
const ScheduledPromotionsView = () => import("@/views/ScheduledPromotions.vue")

const MapView = () => import("@/views/MapView.vue")
const MyAccountHome = () => import("@/views/MyAccountHome.vue")
const MyBusiness = () => import("@/views/MyBusiness.vue")
const MyBots = () => import("@/views/MyBots.vue")
const MyCampaigns = () => import("@/views/MyCampaignsView.vue")
const MyLogs = () => import("@/views/MyLogs.vue")

const CheckoutView = () => import("@/views/Checkout.vue")
const PaymentStatusView = () => import("@/views/PaymentStatus.vue")
const DeleteAccountView = () => import("@/views/DeleteAccountView.vue")
const GiftShopView = () => import("@/views/GiftShopView.vue")
const AuthPageViewComp = () => import("@/views/AuthPageView.vue")

const ProductListView = () => import("@/views/ProductList.vue")
const ProductProfileView = () => import("@/views/ProductProfile.vue")
const DashboardMainView = () => import("@/views/DashboardView.vue")

/* ────────────────────────────────────────────────────────────────────────────
 *  ROUTES (BASE)
 * ────────────────────────────────────────────────────────────────────────── */
const baseRoutes = [
  { path: "/", name: ROUTE_NAMES.HOME, component: LandingPage, meta: { title: "Home" } },

  // Auth
  { path: "/login", name: ROUTE_NAMES.LOGIN, component: LoginPage, meta: { guestOnly: true, title: "Login", layout: "plain", hideTabbar: true } },
  { path: "/signup", name: ROUTE_NAMES.SIGNUP, component: SignupPage, meta: { guestOnly: true, title: "Sign up", layout: "plain", hideTabbar: true } },

  // ✅ IMPORTANT: these must open even when user is logged in (NO guestOnly)
  { path: "/forgot-password", name: "ForgotPassword", component: ForgotPassword, meta: { title: "Forgot Password", layout: "plain", hideTabbar: true } },
  { path: "/verify-code", name: "VerifyCode", component: VerifyCode, meta: { title: "Verify Code", layout: "plain", hideTabbar: true } },
  { path: "/reset-password", name: "ResetPassword", component: ResetPassword, meta: { title: "Reset Password", layout: "plain", hideTabbar: true } },
  { path: "/two-factor", name: "TwoFactor", component: TwoFactor, meta: { title: "Two Factor", layout: "plain", hideTabbar: true } },

  { path: "/auth", name: ROUTE_NAMES.AUTH_PAGE, component: AuthPageViewComp, meta: { guestOnly: true, title: "Auth", layout: "plain", hideTabbar: true } },

  // Logout (SPA-safe)
  {
    path: "/logout",
    name: ROUTE_NAMES.LOGOUT,
    beforeEnter: (_to, _from, next) => {
      try {
        forceLogout(true, { hard: false, reason: "manual_logout" })
      } catch {}
      next({ name: ROUTE_NAMES.LOGIN, query: { reason: "manual_logout" } })
    },
  },

  // Convenience redirects
  { path: "/auth/login", redirect: { name: ROUTE_NAMES.LOGIN } },
  { path: "/signin", redirect: { name: ROUTE_NAMES.LOGIN } },

  // Extra compat aliases (optional but helpful)
  { path: "/forgot", redirect: { path: "/forgot-password" } },
  { path: "/verify", redirect: { path: "/verify-code" } },
  { path: "/reset", redirect: { path: "/reset-password" } },

  // Account Center
  { path: "/my-account", name: ROUTE_NAMES.MY_ACCOUNT_HOME, component: MyAccountHome, meta: { requiresAuth: true, title: "My Account", tabbar: true } },

  // Profile alias
  { path: "/profile", redirect: { name: ROUTE_NAMES.PROFILE } },

  // Public Wallet
  { path: "/wallet", name: ROUTE_NAMES.WALLET_HOME_PUBLIC, component: WalletView, meta: { requiresAuth: true, title: "Wallet", tabbar: true, keepAlive: true } },
  { path: "/wallet/recharge", name: ROUTE_NAMES.WALLET_RECHARGE_PUBLIC, component: RechargeWalletView, meta: { requiresAuth: true, title: "Recharge Wallet", tabbar: true } },
  { path: "/wallet/withdraw", name: ROUTE_NAMES.WALLET_WITHDRAW_PUBLIC, component: WithdrawRequestView, meta: { requiresAuth: true, title: "Withdraw Request", tabbar: true, layout: "plain" } },
  { path: "/wallet/coins", redirect: { name: ROUTE_NAMES.WALLET_HOME_PUBLIC } },

  // Dashboard root → by role
  {
    path: "/dashboard",
    name: ROUTE_NAMES.DASHBOARD,
    meta: { title: "Dashboard" },
    beforeEnter: async (_to, _from, next) => {
      if (!tokenIsUsable()) return next({ name: ROUTE_NAMES.LOGIN, query: { next: "/dashboard" } })
      try {
        await ensureSession(10_000)
      } catch {
        if (isOffline()) return next(roleHome())
        return next({ name: ROUTE_NAMES.LOGIN, query: { next: "/dashboard", reason: "session_expired" } })
      }
      next(roleHome())
    },
  },

  // Main dashboards
  { path: "/dashboard/user", name: ROUTE_NAMES.DASH_USER, component: DashboardUser, meta: { requiresAuth: true, title: "User Dashboard" } },
  { path: "/dashboard/admin", name: ROUTE_NAMES.DASH_ADMIN, component: DashboardAdmin, meta: { requiresAuth: true, title: "Admin Dashboard", roles: ["admin", "owner"] } },
  { path: "/dashboard/owner", name: ROUTE_NAMES.DASH_OWNER, component: DashboardOwner, meta: { requiresAuth: true, title: "Owner Dashboard", roles: ["owner"] } },
  { path: "/dashboard/main", name: ROUTE_NAMES.DASHBOARD_MAIN, component: DashboardMainView, meta: { requiresAuth: true, title: "Dashboard" } },

  // Customers / Products / Orders
  { path: "/dashboard/customers", name: ROUTE_NAMES.CUSTOMERS, component: CustomersView, meta: { requiresAuth: true, title: "Customers", keepAlive: true } },
  { path: "/dashboard/customers/:idOrKey", name: ROUTE_NAMES.CUSTOMER_DETAILS, component: CustomerDetailsView, props: true, meta: { requiresAuth: true, title: "Customer Details" } },
  { path: "/dashboard/customers/profile/:idOrKey", name: ROUTE_NAMES.CUSTOMER_PROFILE, component: CustomerProfileView, props: true, meta: { requiresAuth: true, title: "Customer Profile" } },

  { path: "/dashboard/products", name: ROUTE_NAMES.PRODUCTS, component: ProductsView, meta: { requiresAuth: true, title: "Products", keepAlive: true } },
  { path: "/dashboard/products/list", name: ROUTE_NAMES.PRODUCT_LIST, component: ProductListView, meta: { requiresAuth: true, title: "Product List" } },
  { path: "/dashboard/products/profile/:id", name: ROUTE_NAMES.PRODUCT_PROFILE, component: ProductProfileView, props: true, meta: { requiresAuth: true, title: "Product Profile" } },
  { path: "/dashboard/products/details/:id?", name: ROUTE_NAMES.PRODUCT_DETAILS_DASH, component: ProductDetailsView, props: true, meta: { requiresAuth: true, title: "Product Details" } },
  { path: "/dashboard/products/public/:slug?", name: ROUTE_NAMES.PRODUCT_PUBLIC_DASH, component: ProductPublicView, props: true, meta: { requiresAuth: true, title: "Product Public" } },

  // ✅ Create product (your requested view)
  { path: "/dashboard/products/create", name: ROUTE_NAMES.CREATE_PRODUCT, component: CreateProductView, meta: { requiresAuth: true, title: "Create Product", layout: "plain", hideTabbar: true } },
  // compat aliases (in case your menu links use a different path)
  { path: "/dashboard/create-product", redirect: { name: ROUTE_NAMES.CREATE_PRODUCT } },
  { path: "/create-product", redirect: { name: ROUTE_NAMES.CREATE_PRODUCT } },

  { path: "/dashboard/orders", name: ROUTE_NAMES.ORDERS, component: OrdersView, meta: { requiresAuth: true, title: "Orders", keepAlive: true } },
  { path: "/dashboard/orders/:id", name: ROUTE_NAMES.ORDER_DETAILS, component: OrderDetailsView, props: true, meta: { requiresAuth: true, title: "Order Details" } },
  { path: "/dashboard/orders/profile/:id", name: ROUTE_NAMES.ORDER_PROFILE, component: OrderProfileView, props: true, meta: { requiresAuth: true, title: "Order Profile" } },

  // Checkout / Payments
  { path: "/checkout", name: ROUTE_NAMES.CHECKOUT, component: CheckoutView, meta: { requiresAuth: true, title: "Checkout", layout: "plain" } },
  { path: "/payment-status", name: ROUTE_NAMES.PAYMENT_STATUS, component: PaymentStatusView, meta: { requiresAuth: true, title: "Payment Status", layout: "plain" } },

  // Messaging
  { path: "/dashboard/messaging_center", name: ROUTE_NAMES.MSG_CENTER, component: MessagingCenterView, meta: { requiresAuth: true, title: "Messaging Center" } },
  { path: "/dashboard/inbox", name: ROUTE_NAMES.INBOX, component: InboxView, meta: { requiresAuth: true, title: "Inbox" } },
  { path: "/dashboard/messages", name: ROUTE_NAMES.MESSAGES, redirect: { name: ROUTE_NAMES.INBOX } },
  { path: "/dashboard/messages/:threadId", name: ROUTE_NAMES.MESSAGE_THREAD, component: MessagesView, props: true, meta: { requiresAuth: true, title: "Messages", layout: "plain", hideTabbar: true } },

  // ✅ Support (your requested views)
  { path: "/dashboard/support", name: ROUTE_NAMES.SUPPORT, component: SupportView, meta: { requiresAuth: true, title: "Support Center", keepAlive: true } },
  { path: "/dashboard/support/inbox", name: ROUTE_NAMES.SUPPORT_INBOX, component: SupportInboxView, meta: { requiresAuth: true, title: "Support Inbox", keepAlive: true } },
  { path: "/dashboard/support/request/:id?", name: ROUTE_NAMES.SUPPORT_REQUESTS, component: SupportRequestView, props: true, meta: { requiresAuth: true, title: "Support Request", layout: "plain", hideTabbar: true } },

  // Restored menu routes
  { path: "/dashboard/assistant", name: ROUTE_NAMES.SMART_ASSISTANT, component: SmartAssistantView, meta: { requiresAuth: true, title: "Smart Assistant", keepAlive: true } },
  { path: "/dashboard/analytics", name: ROUTE_NAMES.ANALYTICS, component: AnalyticsView, meta: { requiresAuth: true, title: "Analytics", keepAlive: true } },
  { path: "/dashboard/analytics/dashboard", name: ROUTE_NAMES.ANALYTICS_DASHBOARD, component: AnalyticsDashboardView, meta: { requiresAuth: true, title: "Analytics Dashboard", keepAlive: true } },

  { path: "/dashboard/settings", name: ROUTE_NAMES.SETTINGS, component: SettingsView, meta: { requiresAuth: true, title: "Settings", keepAlive: true } },
  { path: "/dashboard/settings/branding", name: ROUTE_NAMES.SETTINGS_BRANDING, component: SettingsBrandingView, meta: { requiresAuth: true, title: "Branding", keepAlive: true } },

  { path: "/dashboard/profile", name: ROUTE_NAMES.PROFILE, component: MyProfileView, meta: { requiresAuth: true, title: "Profile", keepAlive: true } },
  { path: "/dashboard/profile/settings", name: ROUTE_NAMES.PROFILE_SETTINGS, component: ProfileSettingsView, meta: { requiresAuth: true, title: "Profile Settings", keepAlive: true } },
  { path: "/dashboard/business/profile", name: ROUTE_NAMES.BUSINESS_PROFILE, component: BusinessProfileView, meta: { requiresAuth: true, title: "Business Profile", keepAlive: true } },

  { path: "/dashboard/notifications", name: ROUTE_NAMES.NOTIFICATIONS, component: NotificationsView, meta: { requiresAuth: true, title: "Notifications", keepAlive: true } },
  { path: "/dashboard/loyalty_rewards", name: ROUTE_NAMES.LOYALTY, component: LoyaltyRewardsView, meta: { requiresAuth: true, title: "Loyalty Rewards", keepAlive: true } },
  { path: "/dashboard/help", name: ROUTE_NAMES.HELP, component: HelpCenterView, meta: { requiresAuth: true, title: "Help Center", keepAlive: true } },
  { path: "/dashboard/billing", name: ROUTE_NAMES.BILLING, component: BillingView, meta: { requiresAuth: true, title: "Billing", keepAlive: true } },

  { path: "/dashboard/activity_log", name: ROUTE_NAMES.ACTIVITY_LOG, component: ActivateLogView, meta: { requiresAuth: true, title: "Activity Log", keepAlive: true } },
  { path: "/dashboard/audit_log", name: ROUTE_NAMES.AUDIT_LOG, component: AuditLogView, meta: { requiresAuth: true, title: "Audit Log", keepAlive: true } },
  { path: "/dashboard/audit_history", name: ROUTE_NAMES.AUDIT_HISTORY, component: AuditLogHistoryView, meta: { requiresAuth: true, title: "Audit History", keepAlive: true } },

  // Wallet under dashboard
  { path: "/dashboard/wallet", redirect: { name: ROUTE_NAMES.WALLET_HOME_PUBLIC } },
  { path: "/dashboard/wallet/recharge", redirect: { name: ROUTE_NAMES.WALLET_RECHARGE_PUBLIC } },
  { path: "/dashboard/wallet/withdraw", redirect: { name: ROUTE_NAMES.WALLET_WITHDRAW_PUBLIC } },
  // compat alias (some menus use this)
  { path: "/dashboard/withdraw-request", redirect: { name: ROUTE_NAMES.WALLET_WITHDRAW_PUBLIC } },
  { path: "/dashboard/withdraw-requests", redirect: { name: ROUTE_NAMES.WALLET_WITHDRAW_PUBLIC } },

  /* ──────────────────────────────────────────────────────────────
   * ✅ COMPAT ALIASES (SPA-safe, production)
   * Fix 404s from older/alternate menu spellings without breaking existing routes
   * ────────────────────────────────────────────────────────────── */

  // Wallet: plural spelling used by some links
  { path: "/dashboard/wallet/withdrawals", redirect: { name: ROUTE_NAMES.WALLET_WITHDRAW_PUBLIC } },
  { path: "/dashboard/wallet/withdrawal", redirect: { name: ROUTE_NAMES.WALLET_WITHDRAW_PUBLIC } },

  // Top-level convenience routes (your browser URLs)
  { path: "/my-store", redirect: { name: ROUTE_NAMES.MY_STORE } },
  { path: "/promote", redirect: { name: ROUTE_NAMES.PROMOTE } },

  // Affiliate legacy route used by some code
  { path: "/dashboard/affiliate_dashboard", redirect: { name: ROUTE_NAMES.AFFILIATE } },
  { path: "/dashboard/affiliate-dashboard", redirect: { name: ROUTE_NAMES.AFFILIATE } },
  { path: "/affiliate_dashboard", redirect: { name: ROUTE_NAMES.AFFILIATE } },

  // -------------------- LIVE: /dashboard/live_stream (404) --------------------
  { path: "/dashboard/live_stream", redirect: { name: ROUTE_NAMES.LIVE_HUB } },
  { path: "/dashboard/live-stream", redirect: { name: ROUTE_NAMES.LIVE_HUB } },
  { path: "/dashboard/livestream", redirect: { name: ROUTE_NAMES.LIVE_HUB } },
  { path: "/dashboard/liveStream", redirect: { name: ROUTE_NAMES.LIVE_HUB } },

  // -------------------- DRONES: /dashboard/drone_tracking/missions (404) --------------------
  { path: "/dashboard/drone_tracking", redirect: { name: ROUTE_NAMES.DRONE_MISSIONS } },
  { path: "/dashboard/drone-tracking", redirect: { name: ROUTE_NAMES.DRONE_MISSIONS } },

  { path: "/dashboard/drone_tracking/missions", redirect: { name: ROUTE_NAMES.DRONE_MISSIONS } },
  { path: "/dashboard/drone-tracking/missions", redirect: { name: ROUTE_NAMES.DRONE_MISSIONS } },
  { path: "/dashboard/droneTracking/missions", redirect: { name: ROUTE_NAMES.DRONE_MISSIONS } },

  // Optional common typos
  { path: "/dashboard/drone_missions", redirect: { name: ROUTE_NAMES.DRONE_MISSIONS } },
  { path: "/dashboard/drone-mission", redirect: { name: ROUTE_NAMES.DRONE_MISSIONS } },

  // -------------------- PROMOTIONS: common profile URL variants (avoid 404) --------------------
  // If you already have a real Promotion Profile route with a name, redirect to it.
  // If you DON'T have it yet, create a real route entry (see next block below).
  { path: "/dashboard/promotion/profile/:id?", redirect: { path: "/dashboard/promotions/profile" } },
  { path: "/dashboard/promotion_profile/:id?", redirect: { path: "/dashboard/promotions/profile" } },
  { path: "/dashboard/promote/profile/:id?", redirect: { path: "/dashboard/promotions/profile" } },

  // Teams / Users
  { path: "/dashboard/team", name: ROUTE_NAMES.TEAM, component: TeamManagementView, meta: { requiresAuth: true, title: "Team Management" } },
  { path: "/dashboard/users", name: ROUTE_NAMES.USERS, component: UserListView, meta: { requiresAuth: true, title: "Users" } },
  { path: "/dashboard/users/profile/:id", name: ROUTE_NAMES.USER_PROFILE, component: UserProfileView, props: true, meta: { requiresAuth: true, title: "User Profile" } },
  { path: "/dashboard/users/settings/:id?", name: ROUTE_NAMES.USER_SETTINGS, component: UserProfileSettings, props: true, meta: { requiresAuth: true, title: "User Settings" } },
  { path: "/dashboard/manage-users", name: ROUTE_NAMES.MANAGE_USERS, component: ManageUsersView, meta: { requiresAuth: true, title: "Manage Users" } },
  { path: "/dashboard/deploy", name: ROUTE_NAMES.SMART_DEPLOY, component: SmartDeploy, meta: { requiresAuth: true, title: "Smart Deploy", roles: ["admin", "owner"] } },
  { path: "/dashboard/owner-console", name: ROUTE_NAMES.OWNER_CONSOLE, component: SmartOwnerConsole, meta: { requiresAuth: true, title: "Owner Console", roles: ["owner"] } },
  { path: "/dashboard/payouts", name: ROUTE_NAMES.PAYOUTS, component: PayoutAdminView, meta: { requiresAuth: true, title: "Payouts", roles: ["admin", "owner"] } },

  // Leaderboards
  { path: "/dashboard/leaderboard/gifts", name: ROUTE_NAMES.LEADERBOARD_GIFTS, component: GiftLeaderboardView, meta: { requiresAuth: true, title: "Gift Leaderboard", keepAlive: true } },
  { path: "/dashboard/leaderboard/promoters", name: ROUTE_NAMES.PROMOTER_LEADERBOARD, component: PromoterLeaderboardView, meta: { requiresAuth: true, title: "Promoter Leaderboard", keepAlive: true } },

  // ✅ Integrations (your requested view)
  { path: "/dashboard/integrations", name: ROUTE_NAMES.INTEGRATIONS, component: IntegrationView, meta: { requiresAuth: true, title: "Integrations", keepAlive: true } },
  { path: "/integrations", redirect: { name: ROUTE_NAMES.INTEGRATIONS } },

  // ✅ Bots + Autoresponder (your requested views)
  { path: "/dashboard/bots/market", name: ROUTE_NAMES.AI_BOTS_MARKET_MOBILE, component: AiBotsMarketMobileView, meta: { requiresAuth: true, title: "AI Bots Market", keepAlive: true } },
  { path: "/dashboard/bots/create", name: ROUTE_NAMES.CREATE_BOT, component: CreateMyBotView, meta: { requiresAuth: true, title: "Create My Bot", layout: "plain", hideTabbar: true } },
  { path: "/dashboard/bots/integrations", name: ROUTE_NAMES.BOT_INTEGRATIONS, component: BotIntegrationsMobileView, meta: { requiresAuth: true, title: "Bot Integrations", keepAlive: true } },
  { path: "/dashboard/autoresponders", name: ROUTE_NAMES.AUTORESPONDERS, component: AutoresponderView, meta: { requiresAuth: true, title: "Autoresponders", keepAlive: true } },
  { path: "/dashboard/autoresponder", redirect: { name: ROUTE_NAMES.AUTORESPONDERS } },

  // ✅ ADDED: Bot Configure Route
  { path: "/bots/configure/:planId", name: ROUTE_NAMES.BOT_CONFIGURE, component: BotConfigureView, props: true, meta: { requiresAuth: true, title: "Configure Bot", layout: "plain", hideTabbar: true } },
  // compat aliases for bot configuration
  { path: "/dashboard/bots/configure/:planId", redirect: { name: ROUTE_NAMES.BOT_CONFIGURE } },
  { path: "/configure-bot/:planId", redirect: { name: ROUTE_NAMES.BOT_CONFIGURE } },
  { path: "/bot/configure/:planId", redirect: { name: ROUTE_NAMES.BOT_CONFIGURE } },

  // (optional) keep existing bot pages if you use them
  { path: "/dashboard/bots-market", redirect: { name: ROUTE_NAMES.AI_BOTS_MARKET_MOBILE } },
  { path: "/dashboard/bot-integrations", redirect: { name: ROUTE_NAMES.BOT_INTEGRATIONS } },
  { path: "/dashboard/create-bot", redirect: { name: ROUTE_NAMES.CREATE_BOT } },

  // ✅ Scheduled Promotions (your requested view)
  { path: "/dashboard/promotions/scheduled", name: ROUTE_NAMES.SCHEDULED_PROMOTIONS, component: ScheduledPromotionsView, meta: { requiresAuth: true, title: "Scheduled Promotions", keepAlive: true } },
  // compat aliases (in case your menu links use other paths)
  { path: "/dashboard/scheduled-promotions", redirect: { name: ROUTE_NAMES.SCHEDULED_PROMOTIONS } },
  { path: "/dashboard/promote/scheduled", redirect: { name: ROUTE_NAMES.SCHEDULED_PROMOTIONS } },
  
  // ✅ Promotion Profile (real route)
  {
    path: "/dashboard/promotions/profile/:id?",
    name: ROUTE_NAMES.PROMOTION_PROFILE,
    component: PromotionProfileView, // hakikisha import ipo juu
    props: true,
    meta: {
      requiresAuth: true,
      title: "Promotion Details",
      layout: "plain",
      hideTabbar: true,
    },
  },
  
  // Campaigns legacy URL → Scheduled Promotions
  { path: "/dashboard/campaigns/scheduled", redirect: { name: ROUTE_NAMES.SCHEDULED_PROMOTIONS } },
  { path: "/dashboard/campaigns-scheduled", redirect: { name: ROUTE_NAMES.SCHEDULED_PROMOTIONS } },
  { path: "/campaigns/scheduled", redirect: { name: ROUTE_NAMES.SCHEDULED_PROMOTIONS } },

  // Public commerce
  { path: "/explore", name: ROUTE_NAMES.EXPLORE, component: ExploreView, meta: { title: "Explore", tabbar: true, keepAlive: true } },
  { path: "/product/:id", name: "ProductDetails", component: ProductDetailsView, props: true, meta: { title: "Product Details" } },
  { path: "/favorites", name: "Favorites", component: FavoritesView, meta: { requiresAuth: true, title: "My Favorites", tabbar: true } },
  { path: "/cart", name: "Cart", component: CartView, meta: { requiresAuth: true, title: "Cart", tabbar: true } },

  { path: "/map", name: ROUTE_NAMES.MAP, component: MapView, meta: { requiresAuth: true, title: "Map", tabbar: true } },
  { path: "/my-business", name: ROUTE_NAMES.MY_BUSINESS, component: MyBusiness, meta: { requiresAuth: true, title: "My Business", tabbar: true } },
  { path: "/my-bots", name: ROUTE_NAMES.MY_BOTS, component: MyBots, meta: { requiresAuth: true, title: "My Bots", tabbar: true } },
  { path: "/my-campaigns", name: ROUTE_NAMES.MY_CAMPAIGNS, component: MyCampaigns, meta: { requiresAuth: true, title: "My Campaigns", tabbar: true } },
  { path: "/my-logs", name: ROUTE_NAMES.MY_LOGS, component: MyLogs, meta: { requiresAuth: true, title: "My Logs", tabbar: true } },
  { path: "/gift-shop", name: ROUTE_NAMES.GIFT_SHOP, component: GiftShopView, meta: { requiresAuth: true, title: "Gift Shop", tabbar: true } },
  { path: "/delete-account", name: ROUTE_NAMES.DELETE_ACCOUNT, component: DeleteAccountView, meta: { requiresAuth: true, title: "Delete Account", layout: "plain", hideTabbar: true } },

  // EarnHub (base + sub-pages)
  { path: "/earnhub", name: ROUTE_NAMES.EARN_HUB, component: EarnHubView, meta: { requiresAuth: true, title: "EarnHub", keepAlive: true } },
  { path: "/earnhub/task/:taskId", name: ROUTE_NAMES.EARN_TASK_DETAILS, component: EarnHubTaskDetailsView, props: true, meta: { requiresAuth: true, title: "Task Details", layout: "plain", hideTabbar: true } },
  { path: "/earnhub/invite", component: EarnHubInviteView, meta: { requiresAuth: true, title: "Invite", keepAlive: true } },
  { path: "/earnhub/surveys", component: EarnHubSurveyView, meta: { requiresAuth: true, title: "Surveys", keepAlive: true } },
  { path: "/earnhub/quests", component: EarnHubQuestsView, meta: { requiresAuth: true, title: "Quests", keepAlive: true } },
  { path: "/earnhub/sponsored", component: EarnHubSponsoredView, meta: { requiresAuth: true, title: "Sponsored", keepAlive: true } },
  { path: "/earnhub/share-stream", component: EarnHubShareStreamView, meta: { requiresAuth: true, title: "Share Stream", keepAlive: true } },
  { path: "/earnhub/proof", component: EarnHubProofView, meta: { requiresAuth: true, title: "Proof", keepAlive: true } },

  // (optional) legacy aliases to prevent 404 from old frontend links
  { path: "/earn", redirect: { path: "/earnhub" } },
  { path: "/earnings", redirect: { path: "/earnhub" } },
  { path: "/earn/tasks", redirect: { path: "/earnhub" } },
  { path: "/earnings/tasks", redirect: { path: "/earnhub" } },

  // Live
  { path: "/dashboard/live", name: ROUTE_NAMES.LIVE_HUB, component: LiveStreamHubView, meta: { requiresAuth: true, title: "Live Hub", keepAlive: true } },
  { path: "/dashboard/live/settings", name: ROUTE_NAMES.LIVE_SETTINGS, component: LiveStreamSettingsView, meta: { requiresAuth: true, title: "Live Settings", keepAlive: true } },
  { path: "/live/lobby", name: ROUTE_NAMES.LIVE_LOBBY, component: LiveLobbyView, meta: { requiresAuth: true, title: "Live Lobby", layout: "plain", hideTabbar: true } },
  { path: "/live/room/:id?", name: ROUTE_NAMES.LIVE_ROOM, component: LiveRoomView, props: true, meta: { requiresAuth: true, title: "Live Room", layout: "plain", hideTabbar: true } },
  { path: "/live/chat/:id?", name: ROUTE_NAMES.LIVE_CHAT, component: LiveChatView, props: true, meta: { requiresAuth: true, title: "Live Chat", layout: "plain", hideTabbar: true } },
  { path: "/live/host/:id?", name: ROUTE_NAMES.LIVE_HOST_VIEW, component: LiveHostViewComp, props: true, meta: { requiresAuth: true, title: "Host View", layout: "plain", hideTabbar: true } },

  // Drones
  { path: "/dashboard/drone-monitor", name: ROUTE_NAMES.DRONE_MONITOR, component: DroneMonitorView, meta: { requiresAuth: true, title: "Drone Monitor", keepAlive: true } },
  { path: "/dashboard/drone-missions", name: ROUTE_NAMES.DRONE_MISSIONS, component: DroneMissionsPage, meta: { requiresAuth: true, title: "Missions", keepAlive: true } },

  // Affiliate
  { path: "/dashboard/affiliate", name: ROUTE_NAMES.AFFILIATE, component: AffiliateView, meta: { requiresAuth: true, title: "Affiliate Dashboard", keepAlive: true } },
  { path: "/dashboard/affiliate/home", name: ROUTE_NAMES.AFFILIATE_HOME, component: AffiliateHomeView, meta: { requiresAuth: true, title: "Affiliate Home", keepAlive: true } },

  // Followers
  { path: "/dashboard/followers", name: ROUTE_NAMES.FOLLOWERS, component: FollowersView, meta: { requiresAuth: true, title: "Followers", keepAlive: true } },

  // Promote
  { path: "/dashboard/promote", name: ROUTE_NAMES.PROMOTE, component: PromoteView, meta: { requiresAuth: true, title: "Promote", keepAlive: true } },
  { path: "/dashboard/store", name: ROUTE_NAMES.MY_STORE, component: MyStoreView, meta: { requiresAuth: true, title: "My Store", keepAlive: true } },

  // SmartCoin Wallet view (if you use it separately)
  { path: "/dashboard/smartcoin", name: ROUTE_NAMES.SMARTCOIN_WALLET, component: SmartCoinWalletView, meta: { requiresAuth: true, title: "SmartCoin Wallet", keepAlive: true } },

  // 404
  { path: "/:pathMatch(.*)*", name: ROUTE_NAMES.NOT_FOUND, component: NotFound, meta: { title: "Not Found", layout: "plain", hideTabbar: true } },
]

/* ────────────────────────────────────────────────────────────────────────────
 *  DEV ROUTES (TRULY GATED) ✅ PRODUCTION SAFE
 *  NOTE: uses devImport() (computed path + @vite-ignore) to avoid build resolution
 * ────────────────────────────────────────────────────────────────────────── */
const devRoutes = isDev
  ? [
      { path: "/dev", name: ROUTE_NAMES.DEV_ROOT, component: devImport("DevRoot.vue"), meta: { title: "Dev", layout: "plain", hideTabbar: true } },
      { path: "/dev/cohost-button", name: ROUTE_NAMES.DEV_BUTTON_COHOST, component: devImport("DevCohostButton.vue"), meta: { title: "Dev Cohost Button", layout: "plain", hideTabbar: true } },
      { path: "/dev/platform-card", name: ROUTE_NAMES.DEV_CARD_PLATFORM, component: devImport("DevPlatformCard.vue"), meta: { title: "Dev Platform Card", layout: "plain", hideTabbar: true } },
      { path: "/dev/hosts-panel", name: ROUTE_NAMES.DEV_HOSTS_PANEL, component: devImport("DevHostsPanel.vue"), meta: { title: "Dev Hosts Panel", layout: "plain", hideTabbar: true } },
      { path: "/dev/grid-panel", name: ROUTE_NAMES.DEV_GRID_PANEL, component: devImport("DevGridPanel.vue"), meta: { title: "Dev Grid Panel", layout: "plain", hideTabbar: true } },
      { path: "/dev/effect-confetti", name: ROUTE_NAMES.DEV_EFFECT_CONFETTI, component: devImport("DevConfettiEffect.vue"), meta: { title: "Dev Confetti", layout: "plain", hideTabbar: true } },
      { path: "/dev/effect-modal", name: ROUTE_NAMES.DEV_EFFECT_MODAL, component: devImport("DevEffectModal.vue"), meta: { title: "Dev Effect Modal", layout: "plain", hideTabbar: true } },
    ]
  : []

const routes = [...baseRoutes, ...devRoutes]

/* ────────────────────────────────────────────────────────────────────────────
 *  ROUTER INIT
 * ────────────────────────────────────────────────────────────────────────── */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: "smooth" }
    return { top: 0 }
  },
})

// expose router for SPA-safe forceLogout
try {
  window.__SMARTBIZ_ROUTER__ = router
} catch {}

initNavHistory(router)

try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual"
} catch {}

/* Listen to axios auth logout event */
try {
  window.addEventListener("smartbiz:auth:logout", (ev) => {
    const reason = ev?.detail?.reason || "unauthorized"
    forceLogout(true, { hard: false, reason })
  })
} catch {}

/* ────────────────────────────────────────────────────────────────────────────
 *  GLOBAL GUARDS
 * ────────────────────────────────────────────────────────────────────────── */
router.beforeEach(async (to, _from, next) => {
  try {
    NP?.start?.()
  } catch {}

  // normalize trailing slash (except root)
  if (to.path.length > 1 && to.path.endsWith("/")) {
    return next({ path: to.path.replace(/\/+$/, ""), query: to.query, hash: to.hash, replace: true })
  }

  // Title
  try {
    const i18n = await loadI18n()
    const t = (k) => (i18n ? i18n.global.t(k) : k)
    document.title = to.meta?.title ? `${t(to.meta.title)} • SmartBiz` : "SmartBiz"
  } catch {
    document.title = to.meta?.title ? `${to.meta.title} • SmartBiz` : "SmartBiz"
  }

  // guestOnly → redirect if logged in
  if (to.meta?.guestOnly && tokenIsUsable()) {
    const qnext = safeNextPath(to.query?.next) || safeNextPath(new URLSearchParams(location.search).get("next"))
    if (qnext) return next(qnext)
    return next(roleHome())
  }

  // requiresAuth → enforce session
  if (to.meta?.requiresAuth) {
    if (!tokenIsUsable()) return next({ name: ROUTE_NAMES.LOGIN, query: { next: to.fullPath || "/" } })
    try {
      await ensureSession(10_000)
    } catch {
      if (isOffline()) return next()
      return next({ name: ROUTE_NAMES.LOGIN, query: { next: to.fullPath || "/", reason: "session_expired" } })
    }
  }

  // roles gate
  if (to.meta?.requiresAuth && Array.isArray(to.meta.roles) && to.meta.roles.length) {
    try {
      const me = _meCache?.data || (await ensureSession(5000))
      const r = String(me?.role || me?.user?.role || safeLSGet("user_role") || "user").toLowerCase()
      if (!to.meta.roles.includes(r)) return next(roleHome(r))
    } catch {
      return next(roleHome())
    }
  }

  next()
})

router.afterEach(() => {
  try {
    NP?.done?.()
  } catch {}
})

/* Router errors: reload ONCE only for chunk failures */
let _reloadedOnce = false
router.onError((e) => {
  try {
    NP?.done?.()
  } catch {}

  const msg = String(e?.message || "")
  if (/Avoided redundant navigation|Navigation (cancelled|aborted)/i.test(msg)) return

  if (/Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
    if (_reloadedOnce) return
    _reloadedOnce = true
    location.reload()
    return
  }

  try {
    window.$toast?.error?.("Navigation error")
  } catch {}
})

export async function goToRoleHome(explicitRole) {
  const qnext = safeNextPath(new URLSearchParams(location.search).get("next"))
  if (qnext) return router.replace(qnext)
  return router.replace(roleHome(explicitRole))
}

export default router
