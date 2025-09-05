<template>
  <div class="page">
    <!-- Top navbar (dark green) -->
    <nav class="topbar">
      <router-link to="/" class="brand" aria-label="SmartBiz Home">
        <img
          src="/icons/logo.png"
          alt="SmartBiz"
          class="brand-logo"
          width="40"
          height="40"
          decoding="async"
          loading="eager"
        />
        <span class="brand-name">SmartBiz</span>
      </router-link>

      <div class="actions">
        <router-link to="/login" class="link-login">Login</router-link>
        <router-link to="/signup" class="btn-signup">Sign Up</router-link>
      </div>
    </nav>

    <div class="nav-spacer"></div>

    <!-- Hero -->
    <section class="hero">
      <h1 class="hero-title">Automate Messaging Across All Platforms</h1>
      <p class="hero-sub">WhatsApp, Telegram, SMS &amp; Email — unified in one dashboard.</p>

      <div class="hero-cta">
        <router-link to="/signup" class="btn-signup btn-hero">Get Started Free (1 Month)</router-link>
        <button type="button" class="btn-outline" @click="scrollToDemo">Watch Demo</button>
      </div>
    </section>

    <!-- Demo -->
    <section id="demo" class="demo">
      <div class="container text-center">
        <h2 class="section-heading section-heading--brand">See How It Works</h2>
        <video class="demo-video" controls src="https://www.w3schools.com/html/mov_bbb.mp4"></video>
        <p class="section-subtext">
          A quick tour on how SmartBiz automates your messaging workflow in real time.
        </p>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <div class="container grid">
        <div v-for="f in features" :key="f.id" class="feature-box reveal">
          <div class="feature__icon">{{ f.icon }}</div>
          <div class="feature__title">{{ f.title }}</div>
          <div class="feature__desc">{{ f.desc }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

const features = ref([
  { id: 1, icon: "📱", title: "WhatsApp Automation", desc: "Auto-reply and broadcast to clients on WhatsApp." },
  { id: 2, icon: "🤖", title: "Telegram Bots",       desc: "Engage users with customizable Telegram bots." },
  { id: 3, icon: "✉️", title: "SMS Campaigns",       desc: "Send bulk promotions and OTPs via SMS." },
  { id: 4, icon: "📧", title: "Email Sequences",     desc: "Automate marketing emails with rich templates." },
  { id: 5, icon: "📊", title: "Unified Analytics",   desc: "Get insights across all messaging channels." },
  { id: 6, icon: "🔗", title: "API & Webhooks",      desc: "Easily connect with your CRM or ERP systems." },
]);

const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const scrollToDemo = () => {
  const target = document.getElementById("demo") || document.querySelector("video");
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  target.focus?.();
};

let io;
const mountReveals = () => {
  io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("reveal--in");
        io.unobserve(e.target);
      }
    }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
};

onMounted(mountReveals);
onBeforeUnmount(() => io?.disconnect());
</script>

<style scoped>
/* ===== Theme tokens (dark green brand) ===== */
:root{
  --brand-900:#0B3D2E; /* dark green navbar & accents */
  --page-bg:#ffffff;
  --page-fg:#0f172a;
  --card-bg:#ffffff;
  --muted:#6b7280;
  --gold:#ffd700;
  --gold-2:#ffdd33;
  --gold-3:#ffec80;
}

/* ===== Page base ===== */
.page{ background:var(--page-bg); color:var(--page-fg); }

/* ===== Topbar (dark green) ===== */
.topbar{
  position:fixed; inset:0 0 auto 0; z-index:50;
  display:flex; align-items:center; justify-content:space-between;
  padding:.6rem .9rem;
  background:var(--brand-900); box-shadow:0 2px 10px rgba(0,0,0,.15);
}
.nav-spacer{ height:56px; }

.brand{ display:flex; align-items:center; gap:.55rem; text-decoration:none; }
.brand-name{ color:#fff; font-weight:800; letter-spacing:.2px; font-size:1.05rem; }

/* keep logo small & round regardless of global img styles */
.brand-logo{
  width:40px !important; height:40px !important; border-radius:50%;
  object-fit:contain; display:inline-block; background:#fff;
  border:2px solid var(--gold); box-shadow:0 2px 6px rgba(0,0,0,.25);
}

/* Actions (ensure contrast on green) */
.actions{ display:flex; align-items:center; gap:.5rem; }
.link-login{
  color:#fff; text-decoration:none; font-weight:600; font-size:.95rem;
  padding:.35rem .7rem; border:1px solid rgba(255,255,255,.75); border-radius:.55rem;
}
.link-login:hover{ background:#fff; color:var(--brand-900); }

.btn-signup{
  background:var(--gold); color:var(--brand-900); font-weight:800;
  padding:.45rem .8rem; border-radius:.6rem; text-decoration:none;
  box-shadow:0 4px 12px rgba(255,214,0,.35);
}
.btn-signup:hover{ background:var(--gold-2); }

/* ===== Hero ===== */
.hero{ text-align:center; padding:2.25rem 1rem 1.75rem; }
.hero-title{ font-size:1.45rem; line-height:1.3; font-weight:800; margin:0 0 .5rem; }
.hero-sub{ color:var(--muted); margin:0 0 1rem; }
.hero-cta{ display:flex; gap:.7rem; justify-content:center; flex-wrap:wrap; }
.btn-hero{ padding:.55rem 1rem; }
.btn-outline{
  border:1px solid rgba(15,23,42,.25); color:var(--page-fg);
  background:transparent; border-radius:.6rem; padding:.55rem 1rem;
}
.btn-outline:hover{ background:#f3f4f6; }

/* ===== Demo ===== */
.demo{ padding:1.75rem 0; background:#f8fafc; }
.container{ max-width:1040px; margin:0 auto; padding:0 1rem; }
.section-heading{ font-weight:800; margin-bottom:.75rem; }
.section-heading--brand{ color:var(--brand-900); }
.section-subtext{ color:var(--muted); font-size:.95rem; }
.demo-video{
  width:100%; border-radius:.75rem; box-shadow:0 10px 30px rgba(0,0,0,.08); margin-bottom:.6rem;
}

/* ===== Features ===== */
.features{ background:#fff; padding:2rem 0; }
.grid{ display:grid; grid-template-columns:repeat(1,minmax(0,1fr)); gap:1rem; }
.feature-box{
  border-radius:.9rem; padding:1.05rem; text-align:center;
  background:var(--card-bg); border:1px solid rgba(148,163,184,.25);
  transition:transform .2s ease, box-shadow .2s ease;
}
.feature-box:hover{ transform:translateY(-4px); box-shadow:0 12px 24px rgba(0,0,0,.08); }
.feature__icon{ font-size:1.6rem; margin-bottom:.25rem; color:var(--gold-2); }
.feature__title{ font-weight:700; margin-bottom:.15rem; }
.feature__desc{ color:var(--muted); font-size:.95rem; }

/* ===== Reveal animation ===== */
@keyframes fadeUp{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
.reveal{ opacity:0; transform:translateY(12px); }
.reveal--in{ animation:fadeUp .6s ease-out both; }

/* ===== A11y focus ===== */
a:focus-visible, button:focus-visible{
  outline:2px solid var(--gold); outline-offset:2px; border-radius:.35rem;
}

/* ===== Responsive ===== */
@media (min-width:768px){
  .nav-spacer{ height:64px; }
  .topbar{ padding:.7rem 1.1rem; }
  .brand-name{ font-size:1.15rem; }
  .hero-title{ font-size:2rem; }
  .grid{ grid-template-columns:repeat(3,minmax(0,1fr)); }
}
</style>
