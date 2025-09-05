// giftHelpers.js 🚀 SmartBiz Live Gift Engine — Enhanced with Special Glow
// Mobile-first, hi-tech upgrades while preserving your API

/* ------------------------------------------------------------------ *
 *  Environment & tiny utils (mobile-first awareness)
 * ------------------------------------------------------------------ */
const env = {
  reducedMotion:
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  saveData: !!(navigator && navigator.connection && navigator.connection.saveData),
  effectiveType:
    (navigator && navigator.connection && navigator.connection.effectiveType) || '4g',
  deviceMemory: (navigator && navigator.deviceMemory) || 4,
  canVibrate: !!(navigator && navigator.vibrate),
};

const isSlowNet = ['slow-2g', '2g', '3g'].includes(env.effectiveType);
const isConstrained = env.reducedMotion || env.saveData || isSlowNet || env.deviceMemory < 3;

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function ms(n) { return Number(n) || 0; }
function haptic(pattern = [8]) { try { env.canVibrate && navigator.vibrate(pattern); } catch {} }

/* ------------------------------------------------------------------ *
 *  🎨 Unique Animations by Tier (unchanged keys; added light variants)
 * ------------------------------------------------------------------ */
const animationByTier = {
  Lite: 'float-up',
  Rare: 'spiral-spark',
  Epic: 'orbit-flip',
  Legendary: 'crown-zoom',
  Mythic: 'shine-rise',
  Supreme: 'kingdom-power',
  Default: 'float-up',

  // Light variants used automatically on constrained devices
  _lite: {
    Lite: 'fade-in',
    Rare: 'tilt-in',
    Epic: 'slide-up',
    Legendary: 'pop-in',
    Mythic: 'glow-in',
    Supreme: 'glow-in',
    Default: 'fade-in',
  }
};

// 🔊 Sounds Only for Premium Tiers (original kept)
const soundByTier = {
  Epic: '/sounds/epic-swish.mp3',
  Mythic: '/sounds/blast.mp3',
  Supreme: '/sounds/legendary.mp3'
};

// 💠 Ultra Glow Effects by Coin Value (original kept; adds light fallback when constrained)
function getSpecialGlowEffect(coins) {
  if (coins >= 5000) return '/effects/universe-blast.svg';
  if (coins >= 2000) return '/effects/fusion-orb.svg';
  if (coins >= 1000) return '/effects/fullscreen-burst.svg';
  if (coins >= 500) return '/effects/ring-wave.svg';
  if (coins >= 200) return '/effects/ray-glow.svg';
  if (coins >= 100) return '/effects/soft-glow.svg';
  return null;
}

// ⏱️ Duration Based on Coin Value (mobile-aware scaling but same thresholds)
function getDurationByCoins(coins) {
  let d =
    coins >= 5000 ? 6000 :
    coins >= 2000 ? 5000 :
    coins >= 1000 ? 4000 :
    coins >= 200  ? 3000 :
    coins >= 50   ? 2500 :
    coins >= 10   ? 2000 : 1600;

  // On constrained devices, shorten slightly for responsiveness & battery
  if (isConstrained) d = Math.round(d * 0.75);
  return clamp(d, 900, 7000);
}

// 🔮 Fallback for Gift Visual Effects (kept; now considers constrained devices)
function getDefaultEffect(gift) {
  if (gift.effect) return gift.effect;
  const glow = getSpecialGlowEffect(gift.coins);
  if (isConstrained) {
    // Prefer lighter SVG glow over heavier fx on constrained devices
    return glow || (['Mythic', 'Supreme', 'Legendary'].includes(gift.tier) ? '/effects/sparkle-glow.svg' : null);
  }
  if (glow) return glow;
  if (['Mythic', 'Supreme', 'Legendary'].includes(gift.tier)) {
    return '/effects/sparkle-glow.svg';
  }
  return null;
}

// 🖥️ Display Mode by Value (kept; degrades on constrained devices)
function getDisplayMode(coins) {
  if (coins >= 1000) return isConstrained ? 'glow' : 'fullscreen';
  if (coins >= 200) return 'glow';
  return 'center';
}

/* ------------------------------------------------------------------ *
 *  🔊 Audio engine (mobile-safe) — no API change to playGiftSound
 * ------------------------------------------------------------------ */

// Simple pooled HTMLAudio to reduce allocations on mobile
const _audioPool = [];
let _lastPlayAt = 0;
const _cooldownMs = 200; // prevent rapid stacking

function getAudio() {
  const a = _audioPool.find(x => x.paused) || new Audio();
  if (!_audioPool.includes(a)) _audioPool.push(a);
  a.currentTime = 0;
  a.volume = 0.85;
  return a;
}

// 🔊 Play Gift Sound (safe across platforms) — original export name kept
function playGiftSound(gift) {
  if (!gift?.sound) return;
  const now = performance.now ? performance.now() : Date.now();
  if (now - _lastPlayAt < _cooldownMs) return; // rate limit
  _lastPlayAt = now;

  try {
    const audio = getAudio();
    if (audio.src !== gift.sound) audio.src = gift.sound;

    const play = audio.play();
    if (play && typeof play.then === 'function') {
      play.catch(err => {
        // Auto-unmute patterns often require user gesture; just warn quietly
        console.warn('🔇 Sound blocked or failed:', err);
      });
    }
  } catch (error) {
    console.warn('🎧 Gift sound error:', error);
  }
}

/* ------------------------------------------------------------------ *
 *  🧬 Generate Smart Gift Object (same export name; richer defaults)
 * ------------------------------------------------------------------ */
function getDefaultAnimation(tier) {
  if (isConstrained) return animationByTier._lite[tier] || animationByTier._lite.Default;
  return animationByTier[tier] || animationByTier.Default;
}

function stableId(rawGift) {
  if (rawGift.id) return String(rawGift.id);
  // stable-ish fallback using name+coins
  return ('gift-' + (rawGift.name || 'x') + '-' + (rawGift.coins || 0))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 🧬 same export, backwards compatible
function buildGift(rawGift) {
  const now = Date.now();
  const id = stableId(rawGift);

  const duration = ms(rawGift.duration) || getDurationByCoins(rawGift.coins);
  const animation = rawGift.animation || getDefaultAnimation(rawGift.tier);
  const effect = getDefaultEffect(rawGift);
  const sound = rawGift.sound || soundByTier[rawGift.tier] || null;
  const mode = getDisplayMode(rawGift.coins);

  // Priority helps your renderer schedule (e.g., queue fullscreen first)
  const priority =
    rawGift.coins >= 20000 ? 100 :
    rawGift.coins >= 10000 ? 80  :
    rawGift.coins >=  5000 ? 60  :
    rawGift.coins >=   500 ? 40  : 20;

  // Layer hint: fullscreen > glow > center (for z-index)
  const layer = mode === 'fullscreen' ? 30 : mode === 'glow' ? 20 : 10;

  // Gentle haptic tap for premium tiers on capable devices
  if (['Epic','Legendary','Mythic','Supreme'].includes(rawGift.tier)) haptic([8, 20, 8]);

  return Object.freeze({
    id,
    ...rawGift,
    animation,
    duration,
    effect,
    sound,
    mode,
    priority,
    layer,
    timestamp: now
  });
}

/* ------------------------------------------------------------------ *
 *  🌐 Polite preloading (icons / video / effect svg) — optional helpers
 * ------------------------------------------------------------------ */
function addPrefetch(href, as) {
  try {
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = href;
    if (as) l.as = as;
    document.head.appendChild(l);
  } catch {}
}

function prefetchGift(gift, { video = false, effect = true } = {}) {
  if (gift.icon) addPrefetch(gift.icon, 'image');
  if (effect && gift.effect) addPrefetch(gift.effect, 'image');
  if (video && gift.video) {
    // keep light — one primary src only
    const src = gift.video.webm || gift.video.mp4;
    if (src) addPrefetch(src, 'video');
  }
}

/* ------------------------------------------------------------------ *
 *  Exports (all original names preserved; extras are additive)
 * ------------------------------------------------------------------ */
export {
  animationByTier,
  soundByTier,
  getSpecialGlowEffect,
  getDurationByCoins,
  getDefaultEffect,
  getDisplayMode,
  buildGift,
  getDefaultAnimation,
  playGiftSound,
  // extras
  prefetchGift,
  haptic,
  env as _giftEnv // optional: inspect environment in UI
};
