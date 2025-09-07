<template>
  <!-- Accessible toggle button -->
  <button
    class="voice-btn"
    :class="[on ? 'on' : 'off', disabled ? 'is-disabled' : '']"
    type="button"
    role="switch"
    :aria-checked="String(on)"
    :aria-label="on ? onLabel : offLabel"
    :disabled="disabled || coolingDown"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <!-- Icon/indicator -->
    <span class="ico" aria-hidden="true">
      <span v-if="on">🎙️</span>
      <span v-else>🔇</span>
    </span>

    <!-- Label -->
    <span class="lbl">{{ on ? onLabel : offLabel }}</span>

    <!-- Tiny waveform while ON -->
    <span v-if="on" class="wave" aria-hidden="true">
      <i v-for="n in 4" :key="n" class="bar" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref, watch, withDefaults, defineProps, defineEmits } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: boolean
  disabled?: boolean
  onLabel?: string
  offLabel?: string
  cooldownMs?: number
}>(), {
  modelValue: false,
  disabled: false,
  onLabel: 'Voice On',
  offLabel: 'Voice Off',
  cooldownMs: 350
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'change', v: boolean): void
  (e: 'start'): void
  (e: 'stop'): void
}>()

const on = ref(!!props.modelValue)
const disabled = ref(!!props.disabled)
const onLabel = props.onLabel
const offLabel = props.offLabel
const coolingDown = ref(false)

watch(() => props.modelValue, v => { on.value = !!v })
watch(() => props.disabled, v => { disabled.value = !!v })

function toggle() {
  if (disabled.value || coolingDown.value) return
  on.value = !on.value
  emit('update:modelValue', on.value)
  emit('change', on.value)
  if (on.value) emit('start'); else emit('stop')

  // kidogo tu kuzuia double-click spam
  coolingDown.value = true
  setTimeout(() => (coolingDown.value = false), props.cooldownMs)
}
</script>

<style scoped>
.voice-btn{
  display:inline-flex; align-items:center; gap:.55rem;
  padding:.55rem .8rem;
  border-radius:.8rem; border:1px solid transparent;
  background: rgba(255,255,255,.08); color:#fff;
  transition: transform .12s ease, background .12s ease, border-color .12s ease, box-shadow .12s ease;
  font-size: 14px; font-weight: 700;
}
.voice-btn.on{
  background: linear-gradient(135deg,#22c55e,#16a34a);
  box-shadow: 0 8px 24px rgba(34,197,94,.25);
}
.voice-btn.off{
  background: rgba(255,255,255,.10);
  border-color: rgba(255,255,255,.18);
}
.voice-btn:hover{ transform: translateY(-1px) }
.voice-btn:focus{ outline:none; box-shadow:0 0 0 2px rgba(59,130,246,.6) }
.voice-btn.is-disabled{ opacity:.6; cursor:not-allowed; transform:none }

.ico{ font-size:18px; line-height:1 }
.lbl{ line-height:1 }

.wave{ display:inline-flex; align-items:flex-end; gap:2px; margin-left:.25rem }
.bar{
  display:block; width:3px; height:10px; border-radius:2px;
  background: rgba(255,255,255,.9); opacity:.9;
  animation: bounce 700ms ease-in-out infinite;
}
.bar:nth-child(2){ animation-delay: .1s }
.bar:nth-child(3){ animation-delay: .2s }
.bar:nth-child(4){ animation-delay: .3s }

@keyframes bounce{
  0%,100%{ transform: scaleY(.5) }
  50%{ transform: scaleY(1.25) }
}
</style>
