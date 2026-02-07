<!-- src/views/DashboardUser.vue -->
<template>
  <div class="Dashboard">
    <!-- ========= MOBILE TOPBAR (white, neural-ready) ========= -->
    <header class="MobileTopbar d-md-none">
      <!-- Left: menu -->
      <button class="IconBtn" aria-label="Open navigation menu" @click="sidebarOpen = true">
        <svg class="Ico" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 6h18M3 12h18M3 18h18"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
      </button>

      <!-- Center: brand -->
      <router-link to="/" class="Brand" aria-label="SmartBiz home">
        <img
          src="/icons/logo.png"
          alt="SmartBiz"
          class="Logo"
          width="28"
          height="28"
          decoding="async"
          loading="eager"
        />
        <span class="BrandText">
          SmartBiz
          <span class="BrandSub">Neural Console</span>
        </span>
      </router-link>

      <!-- Right: overflow menu -->
      <div class="Menu" data-neural-menu>
        <button
          class="IconBtn"
          type="button"
          aria-label="Open quick menu"
          @click="menuOpen = !menuOpen"
        >
          <svg class="Ico" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="19" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>

        <transition name="fade">
          <ul
            v-if="menuOpen"
            class="Dropdown shadow-sm rounded-3"
            role="menu"
            aria-label="User quick menu"
          >
            <li role="none">
              <router-link
                class="dropdown-item"
                role="menuitem"
                to="/dashboard/profile"
              >
                My Profile
              </router-link>
            </li>
            <li role="none">
              <router-link
                class="dropdown-item"
                role="menuitem"
                to="/dashboard/settings"
              >
                Settings
              </router-link>
            </li>
            <li role="none">
              <hr />
            </li>
            <li role="none">
              <button
                class="dropdown-item text-danger"
                type="button"
                role="menuitem"
                @click="logout"
              >
                Log out
              </button>
            </li>
          </ul>
        </transition>
      </div>
    </header>

    <!-- spacer for fixed topbar on mobile -->
    <div class="d-md-none" style="height: 54px"></div>

    <!-- ===================== MOBILE DRAWER (white) ===================== -->
    <transition name="fade">
      <div
        v-if="sidebarOpen"
        class="DrawerMask"
        aria-label="Sidebar backdrop"
        @click.self="sidebarOpen = false"
      >
        <aside
          class="Drawer"
          role="navigation"
          aria-label="Mobile dashboard navigation"
        >
          <!-- drawer header -->
          <div class="DrawerHead">
            <img
              src="/icons/logo.png"
              alt="SmartBiz"
              class="Logo DrawerLogo"
              width="36"
              height="36"
              decoding="async"
            />
            <span class="DrawerBrand">
              {{ appName }}
              <span class="DrawerBrandSub">Meta-Intelligence</span>
            </span>

            <button
              class="IconBtn Light ms-auto"
              aria-label="Close navigation menu"
              type="button"
              @click="sidebarOpen = false"
            >
              <svg class="Ico" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  fill="none"
                />
              </svg>
            </button>
          </div>

          <hr class="DrawerRule" />

          <!-- drawer scroll body -->
          <div class="DrawerBody">
            <ul class="DrawerNav">
              <li
                v-for="link in navLinks"
                :key="link.path"
                class="DrawerItem"
              >
                <router-link
                  :to="link.path"
                  class="DrawerLink"
                  :class="{ Active: isActive(link.path) }"
                  @click="sidebarOpen = false"
                >
                  <span class="DrawerIco" aria-hidden="true">
                    {{ link.icon }}
                  </span>
                  <span class="DrawerTxt">
                    {{ link.label }}
                  </span>
                </router-link>
              </li>
            </ul>
          </div>

          <hr class="DrawerRule" />

          <!-- drawer footer -->
          <div class="DrawerFoot">
            <div class="UserRow">
              <div class="AvatarCircle" aria-hidden="true">
                {{ avatarLetter }}
              </div>
              <strong class="UserName">
                {{ displayName }}
              </strong>
            </div>

            <button
              class="DrawerLogoutBtn"
              type="button"
              @click="logout"
            >
              ⎋ Log out
            </button>
            <div class="DrawerCopy">
              © {{ year }} SmartBiz
            </div>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ===================== DESKTOP SIDEBAR (white) ===================== -->
    <aside
      class="Sidebar d-none d-md-flex"
      role="navigation"
      aria-label="Desktop dashboard navigation"
    >
      <div class="SideHead">
        <img
          src="/icons/logo.png"
          alt="SmartBiz"
          class="Logo"
          width="40"
          height="40"
          decoding="async"
        />
        <span class="SideBrand">
          {{ appName }}
          <span class="SideBrandSub">Neural Hub</span>
        </span>
      </div>

      <hr class="SideRule" />

      <ul class="SideNav">
        <li
          v-for="link in navLinks"
          :key="link.path"
          class="SideItem"
        >
          <router-link
            :to="link.path"
            class="SideLink"
            :class="{ Active: isActive(link.path) }"
          >
            <span class="SideIco" aria-hidden="true">
              {{ link.icon }}
            </span>
            <span class="SideTxt">
              {{ link.label }}
            </span>
          </router-link>
        </li>
      </ul>

      <hr class="SideRule" />

      <div class="SideFoot">
        <div class="SideUserRow">
          <div class="AvatarCircle" aria-hidden="true">
            {{ avatarLetter }}
          </div>
          <div class="SideUserName">
            {{ displayName }}
          </div>
        </div>

        <button
          class="SideLogoutBtn"
          type="button"
          @click="logout"
        >
          ⎋ Log out
        </button>

        <div class="SideCopy">
          © {{ year }} SmartBiz
        </div>
      </div>
    </aside>

    <!-- ===================== MAIN ===================== -->
    <main class="Main" role="main">
      <!-- ===== page intro / greeting row ===== -->
      <div class="IntroRow">
        <div class="IntroText">
          <div class="HelloTitle">
            <span class="Wave" aria-hidden="true">👋</span>
            <span class="HelloLabel">Welcome back,</span>
            <span class="HelloName">{{ displayName }}</span>
          </div>
          <div class="HelloSub">
            Your unified Neural Meta-Intelligence hub for commerce, wallet, and live sales.
          </div>
        </div>

        <div class="IntroBtns d-none d-sm-flex">
          <router-link
            class="TopBtn Outline"
            to="/dashboard/settings"
          >
            ⚙ Settings
          </router-link>
          <router-link
            class="TopBtn Outline"
            to="/dashboard/profile"
          >
            👤 My Profile
          </router-link>
          <button
            class="TopBtn Warn"
            type="button"
            @click="logout"
          >
            ⎋ Log out
          </button>
        </div>
      </div>

      <!-- ************* DESKTOP GRID WRAPPER (mobile: stacked) ************* -->
      <div class="DeskGrid">
        <!-- ===== HERO / MARKETPLACE QUICK ACCESS ===== -->
        <section
          class="Card HeroCard grid-hero"
          aria-label="SmartBiz marketplace and neural insights"
        >
          <div class="HeroLeft">
            <h3 class="HeroTitle">
              Sell faster with SmartBiz Neural Marketplace
            </h3>
            <p class="HeroSub">
              Explore AI-curated trends, manage your store, and earn with intelligent promote links.
            </p>

            <div class="HeroActions">
              <router-link
                class="HeroBtn Primary"
                to="/explore"
              >
                🧭 Explore
              </router-link>
              <router-link
                class="HeroBtn"
                to="/my-store"
              >
                🏪 My Store
              </router-link>
              <router-link
                class="HeroBtn"
                to="/promote"
              >
                💸 Promote
              </router-link>
            </div>
          </div>

          <!-- Safe hero image with graceful fallback -->
          <div
            class="HeroImgWrap"
            aria-hidden="true"
          >
            <img
              v-if="showHero"
              class="HeroImg"
              :src="heroSrc"
              alt=""
              decoding="async"
              fetchpriority="low"
              @error="onHeroErr"
            />
            <div v-else class="HeroFallback">
              SmartBiz Neural
            </div>
          </div>
        </section>

        <!-- ===== WALLET (sticky on desktop) ===== -->
        <section
          class="Card WalletCard grid-wallet"
          aria-label="SmartBiz Wallet summary"
        >
          <div class="WalletHeader">
            <div class="WalletLeft">
              <div class="WalletLabel">
                SmartBiz Wallet
              </div>
              <div class="WalletBalance">
                <span class="CoinText">
                  {{ coinsDisplay }} SC
                </span>
              </div>
              <div class="WalletHint">
                Neural-secure wallet for spending, withdrawing and sending across SmartBiz.
              </div>
            </div>

            <div class="WalletRight">
              <div class="MiniSection">
                <div class="MiniLabel">
                  Est. Value (USD)
                </div>
                <div class="MiniValue">
                  ${{ formatMoney(usdEstimate) }}
                </div>
              </div>
              <div class="MiniSection">
                <div class="MiniLabel">
                  24h Activity
                </div>
                <div class="MiniValue AccentGood">
                  +{{ todayEarned }} SC
                </div>
              </div>
            </div>
          </div>

          <div class="WalletActions">
            <button
              class="WalletBtn Primary"
              type="button"
              @click="goRecharge"
            >
              ➕ Top Up
            </button>
            <button
              class="WalletBtn PrimaryAlt"
              type="button"
              @click="goWithdraw"
            >
              ⬇ Withdraw
            </button>
            <button
              class="WalletBtn Soft"
              type="button"
              @click="goHistory"
            >
              📜 History
            </button>
          </div>
        </section>

        <!-- ===== KPIs ===== -->
        <section
          class="Card StatGrid grid-kpis"
          aria-label="Key performance indicators"
        >
          <div
            v-for="stat in uiStats"
            :key="stat.key"
            class="KpiBox"
          >
            <div class="KpiIcon" aria-hidden="true">
              {{ stat.icon }}
            </div>
            <div class="KpiLabel">
              {{ stat.title }}
            </div>

            <div
              v-if="!loading"
              class="KpiValue"
            >
              {{ stat.value }}
            </div>
            <div
              v-else
              class="SkeletonBlock"
              aria-label="Loading metric"
            ></div>
          </div>
        </section>

        <!-- ===== EARNHUB (NEW) ===== -->
        <section
          class="Card EarnHubCard grid-earn"
          aria-label="EarnHub SmartCoins"
        >
          <div class="EH-Head">
            <div class="EH-Icon" aria-hidden="true">
              🏆
            </div>
            <div class="EH-Titles">
              <div class="EH-Title">
                EarnHub — Earn SmartCoins
              </div>
              <div class="EH-Sub">
                Complete tasks, referrals, and daily streaks powered by neural suggestions.
              </div>
            </div>

            <!-- main EarnHub route now uses /earn -->
            <router-link
              class="EH-Link"
              to="/earn"
            >
              Open EarnHub →
            </router-link>
          </div>

          <div class="EH-Body">
            <div class="EH-Left">
              <div class="EH-StatRow">
                <div class="EH-Stat">
                  <div class="EH-StatLabel">
                    Today
                  </div>
                  <div class="EH-StatValue">
                    +{{ earnStats.today_sc }} SC
                  </div>
                </div>
                <div class="EH-Stat">
                  <div class="EH-StatLabel">
                    This Week
                  </div>
                  <div class="EH-StatValue">
                    +{{ earnStats.week_sc }} SC
                  </div>
                </div>
                <div class="EH-Stat">
                  <div class="EH-StatLabel">
                    This Month
                  </div>
                  <div class="EH-StatValue">
                    +{{ earnStats.month_sc }} SC
                  </div>
                </div>
              </div>

              <div class="EH-Progress">
                <div class="EH-ProgressTop">
                  <div class="EH-ProgressLabel">
                    Daily goal
                  </div>
                  <div class="EH-ProgressVal">
                    {{ earnStats.today_sc }}/{{ earnStats.daily_goal }} SC
                  </div>
                </div>
                <div
                  class="EH-ProgressBar"
                  role="progressbar"
                  :aria-valuenow="dailyPct"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    class="EH-ProgressFill"
                    :style="{ width: dailyPct + '%' }"
                  ></div>
                </div>
              </div>

              <div class="EH-Actions">
                <!-- direct to main EarnHub (tasks section handled in-page) -->
                <router-link
                  class="EH-Btn Primary"
                  to="/earn"
                >
                  Start Tasks
                </router-link>
                <router-link
                  class="EH-Btn Dark"
                  to="/earn?view=referrals"
                >
                  Refer &amp; Earn
                </router-link>
                <button
                  class="EH-Btn Soft"
                  type="button"
                  @click="goDailyCheckin"
                >
                  Daily Check-in
                </button>
              </div>
            </div>

            <div class="EH-Right">
              <div class="EH-TasksHead">
                Quick Tasks
              </div>
              <ul class="EH-Tasks">
                <li
                  v-for="t in quickTasks"
                  :key="t.id"
                  class="EH-Task"
                >
                  <div class="EH-TaskMain">
                    <div class="EH-TaskTitle">
                      {{ t.title }}
                    </div>
                    <div class="EH-TaskMeta">
                      +{{ t.reward_sc }} SC • ~{{ t.eta_min }}m
                    </div>
                  </div>
                  <!-- use /earn/tasks/:id which matches router -->
                  <router-link
                    class="EH-TaskBtn"
                    :to="`/earn/tasks/${t.slug || t.id}`"
                  >
                    Start
                  </router-link>
                </li>

                <li
                  v-if="!quickTasks.length && !loading"
                  class="EH-TaskEmpty"
                >
                  No tasks right now — neural engine is preparing more.
                </li>
                <li
                  v-if="loading && !quickTasks.length"
                  class="EH-TaskSkel"
                  aria-label="Loading quick tasks"
                ></li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ===== MARKETPLACE PREVIEW ===== -->
        <section
          class="Card MarketPreview grid-explore"
          aria-label="Explore trending products"
        >
          <div class="CardHeadRow">
            <div class="CardHeadLeft">
              <div class="CardHeadIcon" aria-hidden="true">
                🧭
              </div>
              <div class="CardHeadText">
                <div class="CardHeadTitle">
                  Explore — Trending now
                </div>
                <div class="CardHeadSub">
                  Live, AI-ranked feed from other SmartBiz sellers.
                </div>
              </div>
            </div>
            <router-link
              class="SeeAllBtn"
              to="/explore"
            >
              See all →
            </router-link>
          </div>

          <div class="Gallery" role="list">
            <article
              v-for="p in explorePreview"
              :key="p.id"
              class="GalleryCard"
              role="listitem"
              @click="router.push(`/p/${slugify(p.title)}`)"
            >
              <div
                class="Badge"
                :class="p.badge"
              >
                {{ p.badge }}
              </div>
              <img
                :src="p.image"
                :alt="p.title"
                class="GImg"
                loading="lazy"
                decoding="async"
              />
              <div
                class="GTitle"
                :title="p.title"
              >
                {{ p.title }}
              </div>
              <div class="GMeta">
                <span class="GSeller">
                  @{{ p.seller }}
                </span>
                <span class="GPrice">
                  TZS {{ p.price.toLocaleString() }}
                </span>
              </div>
            </article>

            <div
              v-if="!explorePreview.length && !loading"
              class="GalleryEmpty"
            >
              No items yet — your neural marketplace will wake up soon.
            </div>
            <div
              v-if="loading && !explorePreview.length"
              class="GallerySkeleton"
              aria-label="Loading explore preview"
            ></div>
          </div>
        </section>

         <!-- ===== QUICK ACTIONS ===== -->
        <section
          class="Card QuickCard grid-actions"
          aria-label="Quick actions"
        >
          <div class="CardHeadRow">
            <div class="CardHeadLeft">
              <div class="CardHeadIcon" aria-hidden="true">
                ⚡
              </div>
              <div class="CardHeadText">
                <div class="CardHeadTitle">
                  Quick Actions
                </div>
                <div class="CardHeadSub">
                  Neural shortcuts to move fast and sell faster.
                </div>
              </div>
            </div>
          </div>

          <div class="ActionGrid">
            <router-link
              class="ActionBtn"
              to="/dashboard/customers"
            >
              👥 <span>Customers</span>
            </router-link>
            <router-link
              class="ActionBtn"
              to="/dashboard/products"
            >
              🛒 <span>Products</span>
            </router-link>
            <router-link
              class="ActionBtn"
              to="/dashboard/orders"
            >
              📦 <span>Orders</span>
            </router-link>
            <router-link
              class="ActionBtn"
              to="/dashboard/messages"
            >
              ✉ <span>Inbox</span>
            </router-link>
            <router-link
              class="ActionBtn"
              to="/dashboard/analytics"
            >
              📊 <span>Analytics</span>
            </router-link>
            <router-link
              class="ActionBtn"
              to="/dashboard/live_stream"
            >
              📺 <span>Go Live</span>
            </router-link>
            <router-link
              class="ActionBtn"
              to="/explore"
            >
              🧭 <span>Explore</span>
            </router-link>
            <router-link
              class="ActionBtn"
              to="/my-store"
            >
              🏪 <span>My Store</span>
            </router-link>
            <router-link
              class="ActionBtn"
              to="/promote"
            >
              💸 <span>Promote</span>
            </router-link>
            <!-- point EarnHub to /earn (spa-safe + aliases) -->
            <router-link
              class="ActionBtn"
              to="/earn"
            >
              🏆 <span>EarnHub</span>
            </router-link>
          </div>
        </section>

        <!-- ===== PLATFORM CONNECTIONS ===== -->
        <section
          class="Card IntegrationsCard grid-channels"
          aria-label="Connected channels"
        >
          <div class="CardHeadRow">
            <div class="CardHeadLeft">
              <div class="CardHeadIcon" aria-hidden="true">
                🔗
              </div>
              <div class="CardHeadText">
                <div class="CardHeadTitle">
                  Channels
                </div>
                <div class="CardHeadSub">
                  Where you're currently selling and talking in real-time.
                </div>
              </div>
            </div>
          </div>

          <div class="PlatformGrid">
            <div
              v-for="p in platforms"
              :key="p.name"
              class="PlatformCard"
            >
              <div class="PlatformIcon" aria-hidden="true">
                {{ p.icon }}
              </div>
              <div class="PlatformName">
                {{ p.name }}
              </div>
              <div
                class="PlatformStatus"
                :class="p.connected ? 'Good' : 'Bad'"
              >
                {{ p.connected ? 'Connected' : 'Offline' }}
              </div>
            </div>

            <div
              v-if="!platforms.length && !loading"
              class="PlatformEmpty"
            >
              No channels linked yet — connect your first neural channel.
            </div>
            <div
              v-if="loading && !platforms.length"
              class="PlatformSkeleton"
              aria-label="Loading channels"
            ></div>
          </div>
        </section>

        <!-- ===== RECENT MESSAGES ===== -->
        <section
          class="Card MessagesCard grid-messages"
          aria-label="Recent messages"
        >
          <div class="CardHeadRow">
            <div class="CardHeadLeft">
              <div class="CardHeadIcon" aria-hidden="true">
                💬
              </div>
              <div class="CardHeadText">
                <div class="CardHeadTitle">
                  Recent Messages
                </div>
                <div class="CardHeadSub">
                  Latest conversations across all connected channels.
                </div>
              </div>
            </div>

            <router-link
              class="SeeAllBtn"
              to="/dashboard/messages"
            >
              View all →
            </router-link>
          </div>

          <ul class="MsgList">
            <li
              v-for="m in recentMessages"
              :key="m.id"
              class="MsgRow"
            >
              <div class="MsgLeft">
                <div class="MsgPlatform" aria-hidden="true">
                  {{ m.platform?.icon || '✉' }}
                </div>
                <div class="MsgBody">
                  <div class="MsgSender">
                    {{ m.sender }}
                  </div>
                  <div class="MsgText">
                    {{ m.text }}
                  </div>
                </div>
              </div>
              <div class="MsgTime">
                {{ m.timestamp }}
              </div>
            </li>

            <li
              v-if="!loading && recentMessages.length === 0"
              class="MsgEmpty"
            >
              No messages yet — your neural inbox is waiting for the first ping.
            </li>
            <li
              v-if="loading && recentMessages.length === 0"
              class="MsgSkeleton"
              aria-label="Loading recent messages"
            ></li>
          </ul>
        </section>
      </div>
      <!-- ************* /DeskGrid ************* -->

      <!-- footer legal -->
      <footer class="Legal" aria-label="Legal and branding">
        <div class="LegalText">
          SmartBiz Wallet • Neural-secure • Cross-border • Creator friendly
        </div>
        <div class="LegalCopy">
          © {{ year }} SmartBiz. All rights reserved.
        </div>
      </footer>

      <div class="BottomSpacer"></div>
    </main>

    <!-- ===================== MOBILE BOTTOM NAV (white) ===================== -->
    <nav
      class="BottomNav d-md-none"
      aria-label="Primary mobile navigation"
    >
      <button
        class="BNBtn"
        :class="{ Active: isHomeActive }"
        type="button"
        @click="router.push('/dashboard')"
      >
        <span class="BNIco" aria-hidden="true">🏠</span>
        <span class="BNTxt">Home</span>
      </button>

      <button
        class="BNBtn"
        :class="{ Active: isMessagesActive }"
        type="button"
        @click="router.push('/dashboard/messages')"
      >
        <span class="BNIco" aria-hidden="true">✉</span>
        <span class="BNTxt">Inbox</span>
      </button>

      <button
        class="BNBtn BNPrimary"
        :class="{ Active: isLiveActive }"
        type="button"
        @click="router.push('/dashboard/live_stream')"
      >
        <span class="BNIco" aria-hidden="true">📺</span>
        <span class="BNTxt">Live</span>
      </button>

      <button
        class="BNBtn"
        :class="{ Active: isOrdersActive }"
        type="button"
        @click="router.push('/dashboard/orders')"
      >
        <span class="BNIco" aria-hidden="true">📦</span>
        <span class="BNTxt">Orders</span>
      </button>

      <button
        class="BNBtn"
        :class="{ Active: isProfileActive }"
        type="button"
        @click="router.push('/dashboard/profile')"
      >
        <span class="BNIco" aria-hidden="true">👤</span>
        <span class="BNTxt">Me</span>
      </button>
    </nav>

    <!-- spacer for fixed bottomnav -->
    <div class="d-md-none" style="height: 66px"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ────────────────────────────────────────────────────────────────────
 *  Router & brand context
 * ────────────────────────────────────────────────────────────────── */
const route = useRoute()
const router = useRouter()

const appName = 'SmartBiz'

/* ────────────────────────────────────────────────────────────────────
 *  ENV / API targets (fallback-friendly, production-ready)
 * ────────────────────────────────────────────────────────────────── */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_BACKEND_BASE ||
  ''

const ENDPOINTS = {
  overview: ['/dashboard/overview', '/stats/overview'],
  platforms: ['/connections', '/platforms', '/platforms/status', '/integrations/list'],
  messages: [
    '/messages/recent?limit=10',
    '/messages?limit=10&order=desc',
    '/messages/list?limit=10',
    '/api/messages?limit=10',
    '/conversations/recent?limit=10',
    '/inbox/recent?limit=10'
  ],
  earn_stats: ['/earnhub/overview', '/earn/stats', '/earnings/overview'],
  earn_tasks: ['/earnhub/tasks?limit=6', '/earn/tasks?limit=6', '/earnings/tasks?limit=6'],
  explore_preview: ['/explore/preview?limit=4', '/products/trending?limit=4']
} as const

/* ────────────────────────────────────────────────────────────────────
 *  Auth helpers
 * ────────────────────────────────────────────────────────────────── */
function getToken(): string {
  return (
    localStorage.getItem('auth:access') ||
    sessionStorage.getItem('auth:access') ||
    localStorage.getItem('sbz_token') ||
    sessionStorage.getItem('sbz_token') ||
    ''
  )
}

/** Ensure only authenticated users see this dashboard */
onMounted(() => {
  const token = getToken()
  if (!token) {
    const next = encodeURIComponent(route.fullPath || '/dashboard')
    router.replace(`/login?next=${next}`)
  }
})

/* ────────────────────────────────────────────────────────────────────
 *  HTTP GET with fallback chain (Neural-resilient)
 * ────────────────────────────────────────────────────────────────── */
function joinUrl(base: string, path: string) {
  if (!base) return path
  if (base.endsWith('/') && path.startsWith('/')) return base + path.slice(1)
  if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path
  return base + path
}

async function apiGet<T = any>(paths: string[]): Promise<T> {
  const token = getToken()
  let lastErr: unknown = null

  for (const p of paths) {
    try {
      const res = await fetch(joinUrl(API_BASE, p), {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json'
        }
      })

      if (res.ok) {
        return (await res.json()) as T
      }

      lastErr = new Error(`GET ${p} -> ${res.status}`)
      // try next fallback path
      continue
    } catch (e) {
      lastErr = e
    }
  }

  throw lastErr ?? new Error('Unknown network error')
}

/* ────────────────────────────────────────────────────────────────────
 *  UI state (menu, sidebar, year, keyboard)
 * ────────────────────────────────────────────────────────────────── */
const menuOpen = ref(false)
const sidebarOpen = ref(false)
const year = new Date().getFullYear()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    sidebarOpen.value = false
    menuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})

watch(sidebarOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

/* ────────────────────────────────────────────────────────────────────
 *  User info from storage (Smart identity)
 * ────────────────────────────────────────────────────────────────── */
type StoredUser = {
  full_name?: string
  name?: string
  username?: string
} | null

function readStoredUser(): StoredUser {
  try {
    const raw =
      localStorage.getItem('sbz_user') ||
      sessionStorage.getItem('sbz_user') ||
      'null'
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const storedUser = readStoredUser()

const displayName = computed<string>(() => {
  return (
    storedUser?.full_name ||
    storedUser?.name ||
    storedUser?.username ||
    localStorage.getItem('user_name') ||
    'User'
  )
})

const avatarLetter = computed<string>(() => {
  return displayName.value?.charAt(0)?.toUpperCase() || 'U'
})

/* ────────────────────────────────────────────────────────────────────
 *  Wallet state (neural-aware, with offline fallback)
 * ────────────────────────────────────────────────────────────────── */
const coins = ref<number>(0)

/** local inference from recharge/withdraw history, used only as fallback */
function inferWalletBalance(): number {
  let bal = 0
  try {
    const hist = JSON.parse(localStorage.getItem('recharge_history') || '[]')
    for (const row of hist) if (row?.coins) bal += Number(row.coins) || 0
  } catch {
    // ignore
  }
  try {
    const w = JSON.parse(localStorage.getItem('withdraw_history') || '[]')
    for (const row of w) if (row?.sc) bal -= Number(row.sc) || 0
  } catch {
    // ignore
  }
  return bal < 0 ? 0 : bal
}

/** Tanzanian shilling anchored conversion (can be tuned without breaking UI) */
const TSH_PER_SC = 15
const TSH_PER_USD = 2600
const SC_PER_USD = TSH_PER_USD / TSH_PER_SC

function SCtoUSD(sc: number) {
  return sc / SC_PER_USD
}

const coinsDisplay = computed(() =>
  (coins.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
)
const usdEstimate = computed(() => SCtoUSD(coins.value || 0))

function formatMoney(n: number | string) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/* ────────────────────────────────────────────────────────────────────
 *  EarnHub state (Neural streaks)
 * ────────────────────────────────────────────────────────────────── */
type EarnStats = {
  today_sc: number
  week_sc: number
  month_sc: number
  daily_goal: number
}

const earnStats = ref<EarnStats>({
  today_sc: 0,
  week_sc: 0,
  month_sc: 0,
  daily_goal: 200
})
const earnTasks = ref<any[]>([])

const dailyPct = computed(() => {
  const goal = Math.max(1, Number(earnStats.value.daily_goal || 0))
  const done = Math.max(0, Number(earnStats.value.today_sc || 0))
  return Math.min(100, Math.round((done / goal) * 100))
})

/** Used in wallet card for “24h Activity” */
const todayEarned = computed(() => earnStats.value.today_sc || 0)

const quickTasks = computed(() => {
  const list = earnTasks.value.slice(0, 4)
  return list.map((t: any, i: number) => ({
    id: t.id || t._id || i,
    title: t.title || t.name || 'Task',
    reward_sc: Number(t.reward_sc ?? t.reward ?? 10),
    eta_min: Number(t.eta_min ?? 2),
    slug: t.slug
  }))
})

/* ────────────────────────────────────────────────────────────────────
 *  Navigation links (dashboard neural map)
 * ────────────────────────────────────────────────────────────────── */
const navLinks = [
  { label: 'Home',           path: '/dashboard/user',                icon: '🏠' },
  { label: 'Explore',        path: '/explore',                       icon: '🧭' },
  { label: 'My Store',       path: '/my-store',                      icon: '🏪' },
  { label: 'Promote',        path: '/promote',                       icon: '💸' },
  { label: 'EarnHub',        path: '/earn',                          icon: '🏆' },
  { label: 'Customers',      path: '/dashboard/customers',           icon: '👥' },
  { label: 'Products',       path: '/dashboard/products',            icon: '🛒' },
  { label: 'Orders',         path: '/dashboard/orders',              icon: '📦' },
  { label: 'Inbox',          path: '/dashboard/messages',            icon: '✉' },
  {
    label: 'Promotions',
    path: '/dashboard/campaigns/scheduled',
    icon: '📅'
  },
  { label: 'Support',        path: '/dashboard/support',             icon: '🆘' },
  { label: 'Affiliate',      path: '/dashboard/affiliate_dashboard', icon: '🤝' },
  { label: 'Live Stream',    path: '/dashboard/live_stream',         icon: '📺' },
  {
    label: 'Drone Missions',
    path: '/dashboard/drone_tracking/missions',
    icon: '🚁'
  },
  { label: 'Analytics',      path: '/dashboard/analytics',           icon: '📊' },
  {
    label: 'Wallet: Top Up',
    path: '/dashboard/wallet/recharge',
    icon: '➕'
  },
  {
    label: 'Wallet: Withdraw',
    path: '/dashboard/wallet/withdrawals',
    icon: '⬇'
  },
  { label: 'Settings',       path: '/dashboard/settings',            icon: '⚙' },
  {
    label: 'My Profile',
    path: '/dashboard/profile',
    icon: '👤'
  },
  {
    label: 'Notifications',
    path: '/dashboard/notifications',
    icon: '🔔'
  },
  {
    label: 'Rewards',
    path: '/dashboard/loyalty_rewards',
    icon: '🎁'
  },
  { label: 'Billing',        path: '/dashboard/billing',             icon: '💳' },
  {
    label: 'Activity Log',
    path: '/dashboard/activity_log',
    icon: '📜'
  },
  {
    label: 'AI Assistant',
    path: '/dashboard/assistant',
    icon: '🤖'
  }
]

function isActive(path: string) {
  // handle redirects (e.g. /dashboard/my/profile → /dashboard/profile)
  if (path === '/dashboard/profile') {
    return (
      route.path === '/dashboard/profile' ||
      route.path.startsWith('/dashboard/profile/')
    )
  }
  if (path === '/earn') {
    return route.path === '/earn' || route.path.startsWith('/earn/')
  }
  return route.path === path || route.path.startsWith(path + '/')
}

/* active states for mobile bottom nav */
const isHomeActive = computed(() => {
  return route.path === '/dashboard' || route.path.startsWith('/dashboard/user')
})
const isMessagesActive = computed(() => route.path.startsWith('/dashboard/messages'))
const isLiveActive = computed(() => route.path.startsWith('/dashboard/live_stream'))
const isOrdersActive = computed(() => route.path.startsWith('/dashboard/orders'))
const isProfileActive = computed(() =>
  route.path.startsWith('/dashboard/profile') ||
  route.path.startsWith('/dashboard/my/profile')
)

/* ────────────────────────────────────────────────────────────────────
 *  Live data state
 * ────────────────────────────────────────────────────────────────── */
const loading = ref(true)

type Overview = {
  messages_sent?: number
  response_rate?: number
  active_platforms_connected?: number
  active_platforms_total?: number
  users_total?: number
} | null

const overview = ref<Overview>(null)

type PlatformItem = { name: string; icon: string; connected: boolean }
const platforms = ref<PlatformItem[]>([])

type RecentMessage = {
  id: string | number
  platform: { name: string; icon: string }
  sender: string
  text: string
  timestamp: string
}
const recentMessages = ref<RecentMessage[]>([])

/* Marketplace preview (remote-first, with graceful fallback) */
type ExploreItem = {
  id: number | string
  title: string
  price: number
  image: string
  seller: string
  badge: string
}

const explorePreview = ref<ExploreItem[]>([
  {
    id: 1,
    title: 'Ring Light',
    price: 19000,
    image: '/img/d1.webp',
    seller: 'aisha',
    badge: 'TRENDING'
  },
  {
    id: 2,
    title: 'Phone Tripod',
    price: 15000,
    image: '/img/d2.webp',
    seller: 'juma',
    badge: 'NEW'
  },
  {
    id: 3,
    title: 'USB Mic',
    price: 42000,
    image: '/img/d3.webp',
    seller: 'neema',
    badge: 'VERIFIED'
  },
  {
    id: 4,
    title: 'Studio Headset',
    price: 68000,
    image: '/img/d4.webp',
    seller: 'joseph',
    badge: 'LIVE'
  }
])

/* ────────────────────────────────────────────────────────────────────
 *  KPI metrics (Neural summary)
 * ────────────────────────────────────────────────────────────────── */
function num(v: unknown, d = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

function percent(v: unknown, dflt = '0%') {
  const n = Number(v)
  if (!Number.isFinite(n)) return dflt
  const base = n <= 1 ? Math.round(n * 100) : Math.round(n)
  return `${base}%`
}

function formatNum(n: number) {
  return n.toLocaleString()
}

const uiStats = computed(() => {
  const ms = num(overview.value?.messages_sent)
  const rr = percent(overview.value?.response_rate)
  const apC = num(overview.value?.active_platforms_connected)
  const apT = num(overview.value?.active_platforms_total || 5)

  return [
    { key: 'messages', icon: '📨', title: 'Messages Sent', value: formatNum(ms) },
    {
      key: 'platforms',
      icon: '🔌',
      title: 'Active Platforms',
      value: `${apC}/${apT}`
    },
    { key: 'response', icon: '🚀', title: 'Response Rate', value: rr }
  ]
})

/* ────────────────────────────────────────────────────────────────────
 *  Loaders (Neural polling loop)
 * ────────────────────────────────────────────────────────────────── */
async function loadOverview() {
  try {
    const data = await apiGet<any>(ENDPOINTS.overview)
    overview.value = {
      messages_sent:
        data?.messages_sent ?? data?.messages?.sent ?? data?.counts?.messages ?? 0,
      response_rate:
        data?.response_rate ??
        data?.rates?.response ??
        data?.response_rate_pct ??
        0,
      active_platforms_connected:
        data?.active_platforms_connected ??
        data?.platforms?.active ??
        data?.connected ??
        0,
      active_platforms_total:
        data?.active_platforms_total ??
        data?.platforms?.total ??
        5,
      users_total: data?.users_total ?? data?.users?.total ?? undefined
    }
  } catch {
    // keep a safe default overview so UI still renders meaningfully
    overview.value = {
      messages_sent: 0,
      response_rate: 0,
      active_platforms_connected: 0,
      active_platforms_total: 5
    }
  }
}

function iconForPlatform(name: string) {
  const n = String(name || '').toLowerCase()
  if (n.includes('whats')) return '📱'
  if (n.includes('telegram')) return '✈'
  if (n.includes('email')) return '📧'
  if (n.includes('sms')) return '📲'
  if (n.includes('instagram') || n.includes('ig')) return '📸'
  if (n.includes('facebook') || n.includes('fb')) return '📘'
  if (n.includes('tiktok')) return '🎵'
  return '🔗'
}

async function loadPlatforms() {
  try {
    const arr = await apiGet<any[]>(ENDPOINTS.platforms)
    platforms.value = (arr || []).map((p: any) => {
      const name = p.name || p.platform || 'unknown'
      return {
        name,
        icon: iconForPlatform(name),
        connected: !!(p.connected ?? (p.status === 'connected') ?? p.active)
      }
    })
  } catch {
    platforms.value = []
  }
}

async function loadMessages() {
  try {
    const res = await apiGet<any>(ENDPOINTS.messages)
    const list = Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
      ? res
      : res?.data ?? []

    recentMessages.value = list.map((m: any, i: number) => ({
      id: m.id || m._id || i,
      platform: {
        name: m.platform || m.channel || 'unknown',
        icon: iconForPlatform(m.platform || m.channel)
      },
      sender: m.sender || m.from || m.user || '—',
      text: m.text || m.message || m.body || '',
      timestamp: m.timestamp || m.created_at || m.time || ''
    }))
  } catch {
    recentMessages.value = []
  }
}

async function loadEarn() {
  try {
    const stats = await apiGet<any>(ENDPOINTS.earn_stats)
    earnStats.value = {
      today_sc: Number(stats?.today_sc ?? stats?.today ?? 0),
      week_sc: Number(stats?.week_sc ?? stats?.week ?? 0),
      month_sc: Number(stats?.month_sc ?? stats?.month ?? 0),
      daily_goal: Number(stats?.daily_goal ?? 200)
    }
  } catch {
    earnStats.value = {
      today_sc: 0,
      week_sc: 0,
      month_sc: 0,
      daily_goal: 200
    }
  }

  try {
    const tasks = await apiGet<any>(ENDPOINTS.earn_tasks)
    const arr = Array.isArray(tasks?.items)
      ? tasks.items
      : Array.isArray(tasks)
      ? tasks
      : tasks?.data ?? []
    earnTasks.value = arr
  } catch {
    earnTasks.value = []
  }
}

async function loadExplorePreview() {
  try {
    const res = await apiGet<any>(ENDPOINTS.explore_preview)
    const arr = Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
      ? res
      : res?.data ?? []

    if (arr.length) {
      explorePreview.value = arr.map((p: any, i: number) => ({
        id: p.id ?? p._id ?? i,
        title: p.title ?? p.name ?? 'Product',
        price: Number(p.price ?? 0),
        image: p.image ?? p.thumbnail ?? '/img/d1.webp',
        seller: p.seller ?? p.owner ?? 'seller',
        badge: p.badge ?? p.tag ?? 'TRENDING'
      }))
    }
  } catch {
    // keep existing local preview as fallback
  }
}

/** Use overview and/or storage to populate wallet safely */
function hydrateWalletFromOverview() {
  const fromOverview = (overview.value as any)?.wallet_sc
  if (typeof fromOverview === 'number' && Number.isFinite(fromOverview)) {
    coins.value = Math.max(0, fromOverview)
    return
  }
  coins.value = inferWalletBalance()
}

/* Global poll (Neural heartbeat) */
let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([
      loadOverview(),
      loadPlatforms(),
      loadMessages(),
      loadEarn(),
      loadExplorePreview()
    ])
    hydrateWalletFromOverview()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAll()
  pollTimer = setInterval(loadAll, 15000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

/* ────────────────────────────────────────────────────────────────────
 *  Wallet / Earn CTA handlers
 * ────────────────────────────────────────────────────────────────── */
function goRecharge() {
  router.push('/dashboard/wallet/recharge')
}
function goWithdraw() {
  router.push('/dashboard/wallet/withdrawals')
}
function goHistory() {
  router.push('/dashboard/wallet/recharge')
}
function goDailyCheckin() {
  // SPA-safe: EarnHub view will interpret this query
  router.push('/earn?view=checkin')
}

/* ────────────────────────────────────────────────────────────────────
 *  Auth: logout
 * ────────────────────────────────────────────────────────────────── */
function logout() {
  localStorage.removeItem('auth:access')
  sessionStorage.removeItem('auth:access')
  localStorage.removeItem('sbz_token')
  sessionStorage.removeItem('sbz_token')
  localStorage.removeItem('sbz_user')
  sessionStorage.removeItem('sbz_user')
  router.replace('/login')
}

/* ────────────────────────────────────────────────────────────────────
 *  Utils
 * ────────────────────────────────────────────────────────────────── */
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/* ===== Hero image fallback (no build break if missing) ===== */
const showHero = ref(true)
const heroSrc = ref<string>('/img/market/hero.webp')

function onHeroErr() {
  heroSrc.value = '/assets/bg-city.jpg'
  showHero.value = true

  // defensive: hide if still broken
  setTimeout(() => {
    const el = document.querySelector<HTMLImageElement>('.HeroImg')
    if (el && el.naturalWidth === 0) {
      showHero.value = false
    }
  }, 0)
}
</script>

<style scoped>
/* ========= GLOBAL LAYOUT TOKENS ========= */
/* White-mode only (no auto-dark) */
:root {
  --bg-page: #ffffff;
  --bg-card: #ffffff;
  --bg-soft: #f7f8fa;
  --border: rgba(15, 23, 42, 0.08);
  --border-strong: rgba(15, 23, 42, 0.14);
  --text-main: #0f172a;
  --text-dim: #64748b;
  --text-faint: #94a3b8;
  --brand: #2563eb; /* primary blue */
  --brand-2: #0ea5e9; /* cyan */
  --accent-good: #10b981;
  --radius-lg: 16px;
  --radius-md: 12px;
  --font-stack: system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Roboto',
    'Segoe UI', sans-serif;

  /* Neural Meta-Intelligence micro-glow */
  --neural-ring: 0 0 0 1px rgba(37, 99, 235, 0.08);
  --neural-glow-soft: 0 18px 40px rgba(15, 23, 42, 0.06);
  --neural-glow-strong: 0 24px 60px rgba(15, 23, 42, 0.12);
  --tap-scale: 0.97;
}

.Dashboard {
  min-height: 100vh;
  background: radial-gradient(circle at top, #f5f7ff 0%, #ffffff 52%, #ffffff 100%);
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  font-family: var(--font-stack);
  -webkit-font-smoothing: antialiased;
}

/* layout split: sidebar + main */
.Sidebar {
  width: 260px;
  min-height: 100vh;
  background: #ffffff;
  color: var(--text-main);
  border-right: 1px solid var(--border-strong);
  display: flex;
  flex-direction: column;
  padding: 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 16px);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  box-shadow: var(--neural-ring);
}

.Main {
  flex-grow: 1;
  max-width: 100%;
  padding: 16px 16px 100px;
  width: 100%;
  margin: 0 auto;
  max-width: 680px;
}
@media (min-width: 768px) {
  .Main {
    padding: 24px 24px 120px;
    max-width: 1000px;
  }
}

/* ========= TOPBAR (MOBILE HEADER, white) ========= */
.MobileTopbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1050;
  background: #ffffff;
  color: var(--text-main);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-strong);
  backdrop-filter: blur(12px);
}

.Brand {
  display: flex;
  align-items: center;
  min-width: 0;
  color: var(--text-main);
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
}
.BrandText {
  margin-left: 8px;
  white-space: nowrap;
}
.Logo {
  border-radius: 50%;
  border: 2px solid #e2e8f0;
  background: #ffffff;
  object-fit: contain;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.3);
}

.IconBtn {
  appearance: none;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--border);
  width: 42px;
  height: 42px;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: 0;
  color: var(--text-main);
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out, background-color 0.12s ease-out;
}
.IconBtn.Light {
  background: #ffffff;
  border-color: var(--border);
  color: var(--text-main);
}
.IconBtn:hover {
  border-color: rgba(37, 99, 235, 0.25);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.09);
}
.IconBtn:active {
  transform: scale(var(--tap-scale));
}
.Ico {
  width: 24px;
  height: 24px;
  color: currentColor;
}

.Menu {
  position: relative;
}
.Dropdown {
  position: absolute;
  right: 0;
  top: 46px;
  background: #ffffff;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 6px;
  min-width: 180px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
}
.Dropdown .dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--text-main);
  font-weight: 500;
  text-decoration: none;
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: background-color 0.12s ease-out, color 0.12s ease-out;
}
.Dropdown .dropdown-item:hover {
  background: var(--bg-soft);
}
.Dropdown hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 6px 2px;
}
.Dropdown .text-danger {
  color: #b91c1c;
}

/* ========= DRAWER ========= */
.DrawerMask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.48);
  z-index: 2000;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
}
.Drawer {
  background: #ffffff;
  color: var(--text-main);
  width: 85%;
  max-width: 320px;
  border-top-right-radius: 16px;
  border-bottom-right-radius: 16px;
  box-shadow: 8px 0 24px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 100dvh;
  height: 100%;
  padding: 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 16px);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  border-right: 1px solid var(--border-strong);
}
.DrawerHead {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-size: 1rem;
  font-weight: 700;
}
.DrawerLogo {
  margin-right: 8px;
}
.DrawerBrand {
  font-weight: 700;
  font-size: 1rem;
  flex-grow: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.DrawerRule {
  border-color: var(--border-strong) !important;
  opacity: 1;
  margin: 8px 0;
}
.DrawerBody {
  flex-grow: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
  padding-right: 4px;
}
.DrawerBody::-webkit-scrollbar {
  width: 5px;
}
.DrawerBody::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.DrawerNav {
  list-style: none;
  margin: 0;
  padding: 0;
}
.DrawerItem + .DrawerItem {
  margin-top: 4px;
}
.DrawerLink {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--text-main);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background-color 0.12s ease-out, color 0.12s ease-out,
    transform 0.12s ease-out;
}
.DrawerLink:hover {
  background: rgba(148, 163, 184, 0.15);
}
.DrawerLink.Active {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}
.DrawerIco {
  font-size: 1.1rem;
}
.DrawerTxt {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.DrawerFoot {
  flex-shrink: 0;
  font-size: 0.85rem;
  line-height: 1.2rem;
  text-align: left;
}
.UserRow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.DrawerLogoutBtn {
  width: 100%;
  appearance: none;
  background: #ffffff;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  padding: 8px 12px;
  color: var(--text-main);
  font-size: 0.95rem;
  font-weight: 700;
  text-align: center;
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out;
}
.DrawerLogoutBtn:hover {
  border-color: rgba(220, 38, 38, 0.4);
  box-shadow: 0 10px 28px rgba(220, 38, 38, 0.16);
}
.DrawerLogoutBtn:active {
  transform: scale(var(--tap-scale));
}
.DrawerCopy {
  margin-top: 12px;
  text-align: center;
  opacity: 0.7;
}
.AvatarCircle {
  background: radial-gradient(circle at 20% 0%, #bfdbfe 0%, #eff6ff 40%, #ffffff 100%);
  color: #1d4ed8;
  font-weight: 800;
  border-radius: 999px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  line-height: 1;
  box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s linear;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========= DESKTOP SIDEBAR SUBBLOCKS ========= */
.SideHead {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.SideBrand {
  font-size: 1.1rem;
  font-weight: 800;
  margin-left: 8px;
  white-space: nowrap;
}
.SideRule {
  border-color: var(--border-strong) !important;
  margin: 8px 0 16px;
}
.SideNav {
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
  flex-grow: 1;
}
.SideItem + .SideItem {
  margin-top: 4px;
}
.SideLink {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3rem;
  border-radius: 10px;
  text-decoration: none;
  padding: 10px 12px;
  border: 1px solid transparent;
  transition: background-color 0.12s ease-out, border-color 0.12s ease-out,
    color 0.12s ease-out, transform 0.12s ease-out;
}
.SideLink:not(.Active):hover {
  background: var(--bg-soft);
  border-color: var(--border);
}
.SideLink.Active {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  border-color: rgba(37, 99, 235, 0.25);
}
.SideIco {
  font-size: 1.1rem;
}
.SideTxt {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.SideFoot {
  margin-top: auto;
  font-size: 0.85rem;
  line-height: 1.2rem;
}
.SideUserRow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 800;
}
.SideUserName {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.SideLogoutBtn {
  width: 100%;
  appearance: none;
  background: #ffffff;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  padding: 8px 12px;
  color: var(--text-main);
  font-size: 0.95rem;
  font-weight: 800;
  text-align: center;
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out;
}
.SideLogoutBtn:hover {
  border-color: rgba(220, 38, 38, 0.4);
  box-shadow: 0 10px 28px rgba(220, 38, 38, 0.15);
}
.SideLogoutBtn:active {
  transform: scale(var(--tap-scale));
}
.SideCopy {
  margin-top: 12px;
  text-align: center;
  opacity: 0.7;
}

/* ========= INTRO ========= */
.IntroRow {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.IntroText {
  min-width: 0;
}
.HelloTitle {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  flex-wrap: wrap;
  column-gap: 6px;
  row-gap: 4px;
  line-height: 1.4;
}
.Wave {
  font-size: 18px;
}
.HelloLabel {
  color: var(--text-dim);
  font-weight: 700;
}
.HelloName {
  color: var(--text-main);
}
.HelloSub {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-dim);
  font-weight: 600;
  max-width: 420px;
}
.IntroBtns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.TopBtn {
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 800;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--text-main);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
  text-decoration: none;
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out, background-color 0.12s ease-out;
}
.TopBtn.Outline {
  background: var(--bg-soft);
}
.TopBtn.Warn {
  border-color: rgba(220, 38, 38, 0.25);
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
}
.TopBtn:hover {
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.11);
  border-color: rgba(148, 163, 184, 0.7);
}
.TopBtn:active {
  transform: scale(var(--tap-scale));
}

/* ========= CARD BASE ========= */
.Card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--neural-glow-soft);
  padding: 16px;
  margin-bottom: 16px;
  transition: box-shadow 0.14s ease-out, transform 0.14s ease-out,
    border-color 0.14s ease-out, background-color 0.14s ease-out;
}
.Card:hover {
  box-shadow: var(--neural-glow-strong);
  border-color: rgba(37, 99, 235, 0.22);
  transform: translateY(-1px);
}
@media (min-width: 768px) {
  .Card {
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 20px;
  }
}

/* ========= DESKTOP GRID (PC polish only) ========= */
.DeskGrid {
  display: block;
}
@media (min-width: 1024px) {
  .DeskGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px; /* main + aside */
    gap: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .grid-hero {
    grid-column: 1 / 2;
  }
  .grid-kpis {
    grid-column: 1 / 2;
  }
  .grid-earn {
    grid-column: 1 / 2;
  }
  .grid-explore {
    grid-column: 1 / 2;
  }
  .grid-actions {
    grid-column: 1 / 2;
  }
  .grid-channels {
    grid-column: 1 / 2;
  }
  .grid-messages {
    grid-column: 1 / 2;
  }
  .grid-wallet {
    grid-column: 2 / 3;
    position: sticky;
    top: 16px;
    height: max-content;
  }
}

/* ========= HERO ========= */
.HeroCard {
  display: flex;
  gap: 16px;
  align-items: center;
  overflow: hidden;
}
.HeroLeft {
  min-width: 0;
  flex: 1;
}
.HeroTitle {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}
.HeroSub {
  color: var(--text-dim);
  font-size: 12px;
  margin-top: 4px;
  max-width: 520px;
}
.HeroActions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.HeroBtn {
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  padding: 10px 12px;
  font-weight: 800;
  font-size: 13px;
  text-decoration: none;
  color: var(--text-main);
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out, background-color 0.12s ease-out;
}
.HeroBtn.Primary {
  background: linear-gradient(90deg, var(--brand), var(--brand-2));
  border: 0;
  color: #ffffff;
}
.HeroBtn:hover {
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  border-color: rgba(148, 163, 184, 0.8);
}
.HeroBtn:active {
  transform: scale(var(--tap-scale));
}
.HeroImgWrap {
  flex: 0 0 160px;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  display: none;
  background: #0b1220;
}
.HeroImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.HeroFallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #93c5fd;
  font-weight: 900;
  letter-spacing: 0.1em;
}
@media (min-width: 700px) {
  .HeroImgWrap {
    display: block;
  }
}

/* ========= WALLET ========= */
.WalletCard {
  background: #ffffff;
  position: relative;
  overflow: hidden;
}
.WalletHeader {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
}
.WalletLeft {
  min-width: 0;
  flex: 1 1 200px;
}
.WalletLabel {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-dim);
  line-height: 1.3;
}
.WalletBalance {
  font-size: 22px;
  line-height: 1.2;
  font-weight: 900;
  margin-top: 4px;
}
.CoinText {
  background-image: linear-gradient(90deg, var(--brand), var(--brand-2));
  -webkit-background-clip: text;
  color: transparent;
}
.WalletHint {
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.4;
  margin-top: 4px;
  max-width: 280px;
}
.WalletRight {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16px;
  min-width: 0;
}
.MiniSection {
  min-width: 90px;
}
.MiniLabel {
  font-size: 11px;
  line-height: 1.3;
  color: var(--text-faint);
  font-weight: 700;
}
.MiniValue {
  font-size: 14px;
  font-weight: 900;
  color: var(--text-main);
}
.AccentGood {
  color: var(--accent-good);
}
.WalletActions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.WalletBtn {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.2;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text-main);
  text-align: center;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out, background-color 0.12s ease-out;
}
.WalletBtn.Primary {
  background-image: linear-gradient(90deg, var(--brand), var(--brand-2));
  border: 0;
  color: #ffffff;
}
.WalletBtn.PrimaryAlt {
  background: #111827;
  color: #ffffff;
  border: 0;
}
.WalletBtn.Soft {
  background: var(--bg-soft);
}
.WalletBtn:hover {
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
  border-color: rgba(148, 163, 184, 0.8);
}
.WalletBtn:active {
  transform: scale(var(--tap-scale));
}

/* ========= KPI GRID ========= */
.StatGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 400px) {
  .StatGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.KpiBox {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-soft);
  padding: 12px;
  text-align: left;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.03);
  min-height: 94px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.KpiIcon {
  font-size: 16px;
  line-height: 1;
}
.KpiLabel {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 800;
  margin-top: 6px;
  line-height: 1.3;
}
.KpiValue {
  font-size: 16px;
  font-weight: 900;
  color: var(--text-main);
  line-height: 1.2;
  margin-top: 6px;
}
.SkeletonBlock {
  width: 60%;
  height: 20px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.08) 0%,
    rgba(0, 0, 0, 0.02) 40%,
    rgba(0, 0, 0, 0.08) 80%
  );
  background-size: 300% 100%;
  animation: shimmer 1.2s infinite;
}

/* ========= EARNHUB ========= */
.EarnHubCard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.EH-Head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.EH-Icon {
  font-size: 20px;
}
.EH-Titles {
  min-width: 0;
}
.EH-Title {
  font-size: 14px;
  font-weight: 900;
  line-height: 1.3;
}
.EH-Sub {
  font-size: 12px;
  color: var(--text-faint);
  font-weight: 700;
  max-width: 520px;
}
.EH-Link {
  font-size: 12px;
  color: var(--brand);
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;
}
.EH-Link:hover {
  text-decoration: underline;
}
.EH-Body {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  align-items: stretch;
}
@media (min-width: 900px) {
  .EH-Body {
    grid-template-columns: 1fr 1fr;
  }
}
.EH-Left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.EH-StatRow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.EH-Stat {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-soft);
  padding: 12px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.03);
}
.EH-StatLabel {
  font-size: 11px;
  color: var(--text-faint);
  font-weight: 800;
}
.EH-StatValue {
  font-size: 16px;
  font-weight: 900;
  margin-top: 4px;
}
.EH-Progress {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  background: #ffffff;
}
.EH-ProgressTop {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.EH-ProgressLabel {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-dim);
}
.EH-ProgressVal {
  font-size: 12px;
  font-weight: 900;
}
.EH-ProgressBar {
  height: 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  overflow: hidden;
  border: 1px solid rgba(37, 99, 235, 0.18);
}
.EH-ProgressFill {
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, var(--brand), var(--brand-2));
}
.EH-Actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.EH-Btn {
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.2;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  background: var(--bg-soft);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out, background-color 0.12s ease-out;
}
.EH-Btn.Primary {
  background: linear-gradient(90deg, var(--brand), var(--brand-2));
  border: 0;
  color: #ffffff;
}
.EH-Btn.Dark {
  background: #111827;
  color: #ffffff;
  border: 0;
}
.EH-Btn.Soft {
  background: var(--bg-soft);
}
.EH-Btn:hover {
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.13);
  border-color: rgba(148, 163, 184, 0.9);
}
.EH-Btn:active {
  transform: scale(var(--tap-scale));
}
.EH-Right {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
}
.EH-TasksHead {
  font-size: 12px;
  font-weight: 900;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.EH-Tasks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.EH-Task {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-soft);
  padding: 10px;
}
.EH-TaskTitle {
  font-size: 13px;
  font-weight: 900;
}
.EH-TaskMeta {
  font-size: 11px;
  color: var(--text-faint);
  font-weight: 700;
  margin-top: 2px;
}
.EH-TaskBtn {
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
  color: #ffffff;
  background: #0f172a;
  border-radius: 10px;
  padding: 8px 10px;
  border: 0;
  display: inline-block;
}
.EH-TaskEmpty {
  font-size: 12px;
  color: var(--text-faint);
  text-align: center;
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 14px;
}
.EH-TaskSkel {
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.08),
    rgba(0, 0, 0, 0.02),
    rgba(0, 0, 0, 0.08)
  );
  background-size: 300% 100%;
  animation: shimmer 1.2s infinite;
}

/* ========= MARKETPLACE PREVIEW ========= */
.MarketPreview .Gallery {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 2px;
}
.MarketPreview .Gallery::-webkit-scrollbar {
  height: 6px;
}
.MarketPreview .Gallery::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 999px;
}
.GalleryCard {
  position: relative;
  flex: 0 0 160px;
  border: 1px solid var(--border);
  border-radius: 12px;
  scroll-snap-align: start;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  padding: 8px;
  cursor: pointer;
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out;
}
.GalleryCard:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.14);
  border-color: rgba(37, 99, 235, 0.24);
}
.GImg {
  width: 100%;
  height: 110px;
  border-radius: 8px;
  object-fit: cover;
}
.GTitle {
  font-weight: 800;
  font-size: 12px;
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.GMeta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
  font-size: 11px;
}
.GSeller {
  color: var(--text-dim);
}
.GPrice {
  font-weight: 900;
}
.Badge {
  position: absolute;
  left: 8px;
  top: 8px;
  font-size: 10px;
  font-weight: 900;
  padding: 4px 6px;
  border-radius: 999px;
  background: #111827;
  color: #ffffff;
}
.Badge.NEW {
  background: #2563eb;
}
.Badge.TRENDING {
  background: #f59e0b;
}
.Badge.VERIFIED {
  background: #10b981;
}
.Badge.LIVE {
  background: #ef4444;
}
.GalleryEmpty,
.GallerySkeleton {
  flex: 1 0 auto;
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  color: var(--text-faint);
  min-width: 220px;
}
.GallerySkeleton {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.06),
    rgba(0, 0, 0, 0.02),
    rgba(0, 0, 0, 0.06)
  );
  background-size: 300% 100%;
  animation: shimmer 1.2s infinite;
}

/* ========= QUICK ACTIONS ========= */
.CardHeadRow {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.CardHeadLeft {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  min-width: 0;
}
.CardHeadIcon {
  font-size: 20px;
  line-height: 1;
}
.CardHeadText {
  min-width: 0;
}
.CardHeadTitle {
  font-size: 14px;
  font-weight: 900;
  line-height: 1.3;
}
.CardHeadSub {
  font-size: 12px;
  line-height: 1.3;
  color: var(--text-faint);
  font-weight: 700;
  max-width: 220px;
}
.ActionGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
@media (min-width: 480px) {
  .ActionGrid {
    grid-template-columns: repeat(6, 1fr);
  }
}
.ActionBtn {
  border-radius: 12px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.2;
  color: var(--text-main);
  padding: 12px 8px;
  text-align: center;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    border-color 0.12s ease-out, background-color 0.12s ease-out;
}
.ActionBtn span {
  display: block;
  white-space: nowrap;
}
.ActionBtn:hover {
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
  border-color: rgba(148, 163, 184, 0.9);
}
.ActionBtn:active {
  transform: scale(var(--tap-scale));
}

/* ========= INTEGRATIONS ========= */
.PlatformGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
@media (min-width: 480px) {
  .PlatformGrid {
    grid-template-columns: repeat(3, 1fr);
  }
}
.PlatformCard {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
  padding: 12px;
  text-align: center;
}
.PlatformIcon {
  font-size: 20px;
  line-height: 1;
}
.PlatformName {
  font-size: 13px;
  font-weight: 900;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.PlatformStatus {
  font-size: 11px;
  font-weight: 900;
  margin-top: 2px;
}
.PlatformStatus.Good {
  color: #10b981;
}
.PlatformStatus.Bad {
  color: #dc2626;
}
.PlatformEmpty {
  grid-column: 1/-1;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 20px 12px;
  font-weight: 700;
}
.PlatformSkeleton {
  grid-column: 1/-1;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.08) 0%,
    rgba(0, 0, 0, 0.02) 40%,
    rgba(0, 0, 0, 0.08) 80%
  );
  background-size: 300% 100%;
  animation: shimmer 1.2s infinite;
}

/* ========= MESSAGES ========= */
.SeeAllBtn {
  font-size: 12px;
  color: var(--brand);
  font-weight: 900;
  text-decoration: none;
}
.SeeAllBtn:hover {
  text-decoration: underline;
}
.SeeAllBtn:active {
  opacity: 0.7;
}
.MsgList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.MsgRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-soft);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
  padding: 12px;
}
.MsgLeft {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.MsgPlatform {
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
}
.MsgBody {
  min-width: 0;
}
.MsgSender {
  font-size: 13px;
  font-weight: 900;
  line-height: 1.3;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.MsgText {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-dim);
  font-weight: 700;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.MsgTime {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-faint);
  font-weight: 700;
  line-height: 1.3;
  text-align: right;
  min-width: 60px;
}
.MsgEmpty {
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 20px 12px;
  font-weight: 700;
}
.MsgSkeleton {
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.08) 0%,
    rgba(0, 0, 0, 0.02) 40%,
    rgba(0, 0, 0, 0.08) 80%
  );
  background-size: 300% 100%;
  animation: shimmer 1.2s infinite;
}

/* ========= FOOTER ========= */
.Legal {
  text-align: center;
  color: var(--text-faint);
  margin-top: 24px;
}
.LegalText {
  font-size: 12px;
  line-height: 1.4;
  font-weight: 700;
}
.LegalCopy {
  font-size: 11px;
  line-height: 1.4;
  font-weight: 700;
  margin-top: 4px;
}
.BottomSpacer {
  height: 80px;
}

/* ========= BOTTOM NAV (white) ========= */
.BottomNav {
  position: fixed;
  z-index: 1100;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  border-top: 1px solid var(--border-strong);
  color: var(--text-main);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
  padding-top: 6px;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 60px;
  backdrop-filter: blur(18px);
}
.BNBtn {
  background: transparent;
  border: 0;
  padding: 0;
  color: var(--text-main);
  font-size: 0.75rem;
  line-height: 1rem;
  text-align: center;
  flex: 1 1 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: 800;
  transition: transform 0.12s ease-out, background-color 0.12s ease-out,
    color 0.12s ease-out;
}
.BNBtn:active {
  transform: scale(var(--tap-scale));
}
.BNIco {
  font-size: 1.2rem;
  line-height: 1.2rem;
}
.BNTxt {
  margin-top: 2px;
  font-size: 0.7rem;
  line-height: 0.8rem;
  color: var(--text-dim);
}
.BNPrimary {
  background: rgba(37, 99, 235, 0.08);
  border-radius: 12px;
  padding: 4px 6px 6px;
}
.BNPrimary .BNIco {
  filter: saturate(1.1);
}
.BNPrimary .BNTxt {
  color: #1d4ed8;
  font-weight: 900;
}
.BNBtn.Active .BNIco,
.BNBtn.Active .BNTxt {
  color: #1d4ed8;
  font-weight: 900;
}
.BNBtn.Active {
  background: rgba(37, 99, 235, 0.08);
  border-radius: 12px;
}

/* shimmer anim */
@keyframes shimmer {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
