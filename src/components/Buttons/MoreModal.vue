<template>
  <div class="inline-flex items-center">
    <!-- Mfano wa kitufe cha kufungua (unaweza kukibadilisha) -->
    <button
      type="button"
      class="px-3 py-2 rounded-full text-white bg-gradient-to-br from-slate-700 to-black border border-white/10 shadow active:scale-95"
      @click="open('settings')"
    >
      ⋯ More
    </button>

    <!-- Universal modal: hutumia paneli zilizojengwa ndani -->
    <UniversalModal
      v-model="show"
      :type="type"
      :custom-title="title"
      :subtitle="subtitle"
      :inner-props="panelProps"
      :close-on-backdrop="true"
      :close-on-esc="true"
      @save="onSave"
      @close="onClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
/** MUHIMU: path sahihi (case-sensitive kwenye Linux/Netlify) */
import UniversalModal from '../UniversalModal.vue'

/**
 * props (optional): unaweza kupitisha default type kutoka kwa mzazi.
 */
const props = defineProps<{
  initialType?: 'settings'|'summary'|'poll'|'moderation'|'background'|'goals'|'rules'|string
}>()

const emit = defineEmits<{
  (e:'save', payload: any): void
  (e:'close', reason: string): void
}>()

/* state */
const show = ref(false)
const type = ref<string>(props.initialType ?? 'settings')
const title = ref<string>('')        // ukitaka kuweka kichwa “custom”
const subtitle = ref<string>('')     // na maelezo madogo
const panelProps = ref<Record<string, any>>({}) // props za ndani ya paneli

/**
 * Fungua modal kwa paneli fulani. Unaweza kuita <MoreModal ref="mm" /> kisha mm.open('moderation', { micMuted:true })
 */
function open(t: string, inner: Record<string, any> = {}, opts?: { title?: string; subtitle?: string }) {
  type.value = t
  panelProps.value = inner || {}
  title.value = opts?.title ?? ''
  subtitle.value = opts?.subtitle ?? ''
  show.value = true
}

/* toa method hii ili mzazi aweze kuifungua programmatically */
defineExpose({ open })

function onSave(e: any) {
  // e.g. { type:'settings', payload:{ ... } }
  emit('save', e)
}

function onClose(reason: string) {
  emit('close', reason)
}
</script>

<style scoped>
/* hakuna css maalum kwa sasa; tumia Tailwind utilites juu */
</style>
