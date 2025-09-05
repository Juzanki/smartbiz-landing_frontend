<template>
  <!-- Root: div | button | a (mobile-first) -->
  <component
    :is="Tag"
    :href="isLink ? href : undefined"
    :target="isExternal ? '_blank' : undefined"
    :rel="isExternal ? 'noopener noreferrer' : undefined"
    class="wi-root"
    :class="[
      variantClass,
      disabled && 'wi-disabled',
      clickable && 'wi-pressable',
      collapsed && 'wi-collapsed',
      elevated && 'wi-elevated'
    ]"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-expanded="collapsible ? String(!collapsed) : undefined"
    :tabindex="!isNativeInteractive ? 0 : undefined"
    @click="onClick"
    @keydown.enter.prevent="onEnter"
    @keydown.space.prevent="onEnter"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <!-- Ripple -->
    <span v-if="clickable && !disabled" class="wi-ripple" :style="rippleStyle" />

    <!-- Icon -->
    <i class="wi-icon" :class="iconBgClass">
      <slot name="icon" />
      <span v-if="badge" class="wi-badge">{{ badge }}</span>
    </i>

    <!-- Content -->
    <div class="wi-details">
      <header class="wi-header">
        <h3 class="wi-title">
          <template v-if="!loading">
            <slot name="title" />
          </template>
          <span v-else class="wi-skel wi-skel-title"></span>
        </h3>

        <!-- Trailing actions / chevron -->
        <div class="wi-trailing">
          <slot name="trailing" />
          <button
            v-if="collapsible"
            class="wi-chevron"
            type="button"
            aria-label="Toggle section"
            @click.stop="toggleCollapse"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" :class="collapsed ? '' : 'wi-rot'">
              <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Meta (small line) -->
      <div class="wi-meta" v-if="$slots.meta || meta">
        <slot name="meta">{{ meta }}</slot>
      </div>

      <!-- Body -->
      <div class="wi-body" v-show="!collapsible || !collapsed">
        <template v-if="!loading">
          <slot />
        </template>
        <template v-else>
          <div class="wi-skel wi-skel-line"></div>
          <div class="wi-skel wi-skel-line"></div>
        </template>

        <!-- Actions row -->
        <div class="wi-actions" v-if="$slots.actions || ctaLabel">
          <slot name="actions" />
          <button
            v-if="ctaLabel"
            class="wi-btn"
            type="button"
            :disabled="disabled"
            @click.stop="$emit('cta')"
          >{{ ctaLabel }}</button>
        </div>
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({ name: 'WelcomeItem' })

/** Props */
const props = withDefaults(defineProps<{
  href?: string               // if provided -> renders as <a>
  external?: boolean          // force external
  clickable?: boolean         // treat as pressable card (button semantics)
  disabled?: boolean
  variant?: 'card' | 'line'   // visual style
  collapsible?: boolean
  openDefault?: boolean
  loading?: boolean
  meta?: string
  badge?: string              // tiny label over icon
  iconBg?: 'none'|'blue'|'green'|'amber'|'pink'|'indigo'
  elevated?: boolean
  ctaLabel?: string
}>(), {
  href: undefined,
  external: undefined,
  clickable: false,
  disabled: false,
  variant: 'card',
  collapsible: false,
  openDefault: true,
  loading: false,
  meta: '',
  badge: '',
  iconBg: 'none',
  elevated: false,
  ctaLabel: ''
})

/** Emits */
defineEmits<{ (e:'click'): void; (e:'longpress'): void; (e:'cta'): void }>()

/** Derived */
const isLink = computed(() => !!props.href && !props.disabled)
const isExternal = computed(() => props.external ?? (props.href ? /^https?:\/\//.test(props.href) : false))
const clickable = computed(() => props.clickable || isLink.value)
const Tag = computed(() => (isLink.value ? 'a' : props.clickable ? 'button' : 'div'))
const isNativeInteractive = computed(() => Tag.value !== 'div')

const collapsed = ref(!props.openDefault && props.collapsible)
function toggleCollapse(){ if (props.collapsible) collapsed.value = !collapsed.value }

const variantClass = computed(() => (props.variant === 'line' ? 'wi-line' : 'wi-card'))

/** Icon background accents */
const iconBgClass = computed(() => ({
  'wi-icon-blue': props.iconBg === 'blue',
  'wi-icon-green': props.iconBg === 'green',
  'wi-icon-amber': props.iconBg === 'amber',
  'wi-icon-pink': props.iconBg === 'pink',
  'wi-icon-indigo': props.iconBg === 'indigo'
}))

/** Ripple + longpress */
const rippleStyle = ref<Record<string,string>>({})
let holdTimer: number | null = null
function onPointerDown(e: PointerEvent){
  if (!clickable.value || props.disabled) return
  // ripple
  const el = (e.currentTarget as HTMLElement)
  const rect = el.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  rippleStyle.value = { '--r-x': `${x}px`, '--r-y': `${y}px` } as any
  // long press
  holdTimer = window.setTimeout(() => {
    holdTimer = null
    navigator.vibrate?.([8, 60, 8])
    // expose event for menus, etc.
    emitLong()
  }, 450) as unknown as number
}
function onPointerUp(){
  if (holdTimer){ clearTimeout(holdTimer); holdTimer = null }
}
function emitLong(){ /* expose as custom event */
  const ev = new CustomEvent('longpress', { bubbles: true })
  ;(document.activeElement || document.body).dispatchEvent(ev)
}

/** Click/keyboard */
function onClick(e: MouseEvent){
  if (props.disabled) { e.preventDefault(); e.stopPropagation(); return }
  // If collapsible and not a link, allow header-tap toggle when user clicks the chevron region only (handled above)
  navigator.vibrate?.([10])
  // Re-emit for parent analytics
  // @ts-ignore
  emit('click')
}
function onEnter(){ if (clickable.value && !props.disabled) (document.activeElement as HTMLElement)?.click?.() }
</script>

<style scoped>
/* Root */
.wi-root{
  --wi-bg: var(--color-background, #fff);
  --wi-fg: var(--color-text, #0f172a);
  --wi-border: var(--color-border, #e5e7eb);
  --wi-muted: #64748b;

  display:flex; position:relative; gap:.75rem;
  background: var(--wi-bg);
  color: var(--wi-fg);
  padding: .9rem .95rem;
  border: 1px solid var(--wi-border);
  border-radius: 1rem;
  transition: background .2s ease, border-color .2s ease, box-shadow .2s ease, transform .15s ease;
  touch-action: manipulation;
}

/* Card vs line (timeline on larger screens) */
.wi-card { box-shadow: 0 1px 0 rgba(0,0,0,.02); }
.wi-card.wi-pressable:hover { border-color: #d1d5db }
.wi-card.wi-pressable:active { transform: scale(.99) }
.wi-elevated { box-shadow: 0 10px 24px rgba(0,0,0,.08) }

.wi-line { background: transparent; border-color: transparent; padding-left: .5rem; }
@media (min-width: 1024px){
  .wi-line { padding: .4rem 0 1rem calc(var(--section-gap, 4rem) / 2); }
  .wi-line .wi-icon{
    position:absolute; left:-26px; top: calc(50% - 25px);
    width:50px; height:50px; border-radius: .75rem;
    border:1px solid var(--wi-border); background: var(--wi-bg);
  }
  .wi-line::before, .wi-line::after{
    content:""; position:absolute; left:0; border-left: 1px solid var(--wi-border);
  }
  .wi-line::before{ bottom: calc(50% + 25px); height: calc(50% - 25px); }
  .wi-line::after{ top: calc(50% + 25px); height: calc(50% - 25px); }
  .wi-line:first-of-type::before{ display:none }
  .wi-line:last-of-type::after{ display:none }
}

/* Disabled */
.wi-disabled{ opacity:.55; pointer-events:none }

/* Icon */
.wi-icon{
  display:grid; place-items:center; width:40px; height:40px; min-width:40px; border-radius:.8rem;
  color: inherit; background: #f8fafc;
  position: relative;
}
.wi-icon-blue   { background: #dbeafe; color: #1d4ed8; }
.wi-icon-green  { background: #dcfce7; color: #166534; }
.wi-icon-amber  { background: #fef3c7; color: #92400e; }
.wi-icon-pink   { background: #fce7f3; color: #9d174d; }
.wi-icon-indigo { background: #e0e7ff; color: #3730a3; }

.wi-badge{
  position:absolute; top:-6px; right:-6px;
  background:#ef4444; color:white; border-radius:9999px;
  font-size:10px; padding:.1rem .35rem; line-height:1; box-shadow:0 0 0 2px var(--wi-bg);
}

/* Details */
.wi-details{ flex:1; min-width:0 }
.wi-header{ display:flex; align-items:center; gap:.5rem }
.wi-title{ font-size:1rem; font-weight:600; margin:0; color: var(--color-heading, #0b1220); }
.wi-trailing{ margin-left:auto; display:flex; align-items:center; gap:.25rem }
.wi-chevron{
  border:1px solid var(--wi-border); background:transparent; border-radius:.6rem; padding:.25rem .35rem; color: var(--wi-muted);
}
.wi-rot{ transform: rotate(180deg); transition: transform .2s ease; }

.wi-meta{ margin-top:.15rem; font-size:.78rem; color: var(--wi-muted); }
.wi-body{ margin-top:.35rem; font-size:.92rem; line-height:1.45; color: var(--wi-fg) }
.wi-actions{ margin-top:.6rem; display:flex; flex-wrap:wrap; gap:.5rem }

/* CTA */
.wi-btn{
  height:2.25rem; padding:0 .8rem; border-radius:.6rem; border:1px solid #dbeafe;
  background:#e0f2fe; color:#075985; font-weight:600;
}
.wi-btn:active{ transform: scale(.98) }

/* Collapsed */
.wi-collapsed .wi-body{ display:none }

/* Pressable ripple */
.wi-pressable{ cursor:pointer; user-select:none; }
.wi-ripple{
  position:absolute; inset:0; overflow:hidden; border-radius:inherit; pointer-events:none;
}
.wi-ripple::after{
  content:""; position:absolute; width:280px; height:280px; border-radius:9999px;
  left: calc(var(--r-x, 50%) - 140px); top: calc(var(--r-y, 50%) - 140px);
  background: radial-gradient(closest-side, rgba(0,0,0,.08), transparent);
  transform: scale(0); opacity:0; animation: wi-r 480ms ease-out;
}
@keyframes wi-r{ 0%{ transform:scale(.4); opacity:.35 } 100%{ transform:scale(1); opacity:0 } }

/* Skeletons */
.wi-skel{ position:relative; overflow:hidden; background:linear-gradient(90deg, rgba(0,0,0,.06), rgba(0,0,0,.03), rgba(0,0,0,.06)); background-size:200% 100%; animation: wi-sh 1.1s linear infinite; border-radius:.4rem; }
.wi-skel-title{ width:55%; height:1.1rem; }
.wi-skel-line{ margin-top:.4rem; height:.8rem; width:90%; }
@keyframes wi-sh{ 0%{ background-position: 200% 0 } 100%{ background-position: -200% 0 } }

/* Safe-area nudge for phones with notches when used as first element */
@supports(padding:max(0px)){
  .wi-root{ margin-top: max(0rem, env(safe-area-inset-top, 0px)); }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .wi-root{ transition: none }
  .wi-ripple::after{ animation: none; opacity: .08; transform:none }
}
</style>
