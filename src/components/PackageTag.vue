<template>
  <component
    :is="asTag"
    :to="isRouterLink ? to : undefined"
    :href="!isRouterLink && asTag === 'a' ? to : undefined"
    :type="asTag === 'button' ? 'button' : undefined"
    class="inline-flex items-center gap-1 rounded-full uppercase tracking-wide font-bold select-none
           focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
           transition active:scale-[.98] whitespace-nowrap"
    :class="[sizeClass, baseClass, glow ? glowClass : '', outlined ? outlineClass : '', clickable ? 'cursor-pointer' : '']"
    :aria-label="aria"
    @click="$emit('click', $event)"
  >
    <!-- Icon / dot -->
    <i v-if="iconResolved" :class="iconResolved + ' text-[1em]'" aria-hidden="true" />
    <span v-else-if="dot" class="h-1.5 w-1.5 rounded-full" :class="dotClass" aria-hidden="true"></span>

    <!-- Label -->
    <slot>
      <span class="truncate max-w-[12ch] sm:max-w-[16ch]">{{ label }}</span>
    </slot>
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },          // e.g. "ProBot"
  size: { type: String, default: 'sm' },           // xs | sm | md
  glow: { type: Boolean, default: true },
  outlined: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },    // adds pointer + active scale
  dot: { type: Boolean, default: false },          // show small status dot if no icon
  icon: { type: [String, Boolean], default: undefined }, // e.g. 'i-tabler-robot-face' | false
  to: { type: String, default: '' },               // '/route' or 'https://...'
  as: { type: String, default: '' },               // force: 'span'|'button'|'a'
  srLabel: { type: String, default: '' },          // custom aria label
})

defineEmits(['click'])

/* Presets per badge name */
const presets = {
  BasicBot:  { bg:'bg-slate-100 dark:bg-slate-700',   text:'text-slate-800 dark:text-white',   border:'border-slate-300/60 dark:border-white/20', dot:'bg-slate-500',   icon:'i-tabler-robot-face' },
  ProBot:    { bg:'bg-blue-100 dark:bg-blue-700',     text:'text-blue-900 dark:text-white',    border:'border-blue-300/60 dark:border-white/20',  dot:'bg-blue-400',    icon:'i-tabler-sparkles'   },
  EliteBot:  { bg:'bg-purple-100 dark:bg-purple-700 elite-shine', text:'text-purple-900 dark:text-white', border:'border-purple-300/60 dark:border-white/20', dot:'bg-purple-400', icon:'i-tabler-trophy'     },
  CustomBot: { bg:'bg-amber-100 dark:bg-amber-700',   text:'text-amber-900 dark:text-white',   border:'border-amber-300/60 dark:border-white/20', dot:'bg-amber-400',   icon:'i-tabler-tools'      },
  default:   { bg:'bg-indigo-100 dark:bg-indigo-700', text:'text-indigo-900 dark:text-white',  border:'border-indigo-300/60 dark:border-white/20', dot:'bg-indigo-400',  icon:'i-tabler-bolt'       },
}

const preset = computed(() => presets[props.name] || presets.default)
const label  = computed(() => props.name)
const aria   = computed(() => props.srLabel || `${label.value} badge`)

/* Size map */
const sizeClass = computed(() => {
  const map = {
    xs:'text-[10px] px-2 py-0.5',
    sm:'text-[11px] px-3 py-1',
    md:'text-xs px-3.5 py-1.5'
  }
  return map[props.size] || map.sm
})

/* Colors & frame */
const baseClass = computed(() => ['border shadow-sm', preset.value.bg, preset.value.text, preset.value.border].join(' '))
const glowClass = 'shadow-[0_0_0_1px_rgba(255,255,255,.4)_inset,0_2px_10px_rgba(0,0,0,.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,.08)_inset,0_2px_10px_rgba(0,0,0,.5)]'
const outlineClass = 'ring-1 ring-black/10 dark:ring-white/20'
const dotClass = computed(() => preset.value.dot)

/* Icon resolution */
const iconResolved = computed(() => {
  if (props.icon === false) return ''
  if (typeof props.icon === 'string') return props.icon
  return preset.value.icon // default icon per preset
})

/* Tag routing */
const isRouterLink = computed(() => !!props.to && props.to.startsWith('/'))
const asTag = computed(() => {
  if (props.as) return props.as
  if (props.to) return isRouterLink.value ? 'RouterLink' : 'a'
  return props.clickable ? 'button' : 'span'
})
</script>

<style scoped>
/* Subtle shine for Elite */
@keyframes shine {
  0% { background-position: -150% 0; }
  100% { background-position: 250% 0; }
}
.elite-shine {
  background-image:
    linear-gradient(90deg, rgba(255,255,255,0) 0%,
      rgba(255,255,255,.25) 50%,
      rgba(255,255,255,0) 100%);
  background-size: 200% 100%;
  animation: shine 2.2s linear infinite;
}
</style>
