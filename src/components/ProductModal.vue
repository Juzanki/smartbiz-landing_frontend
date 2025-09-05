<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="ids.title"
      @click.self="onBackdrop"
    >
      <div
        ref="card"
        class="w-full max-w-sm bg-white text-black rounded-2xl shadow-2xl p-5 sm:p-6 mx-2 my-3 sm:my-6 relative"
        :style="safeArea"
      >
        <!-- Close -->
        <button
          class="absolute top-2 right-2 h-9 w-9 grid place-items-center rounded-full hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          @click="cancel"
          aria-label="Close"
        >✖</button>

        <h3 :id="ids.title" class="text-base font-extrabold text-center">🛍️ Set Product</h3>

        <!-- Errors -->
        <transition name="fade">
          <p v-if="err" class="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
            {{ err }}
          </p>
        </transition>

        <form @submit.prevent="confirm" class="mt-3 grid gap-3">
          <!-- Name -->
          <div class="grid gap-1.5">
            <label :for="ids.name" class="label">Name <span class="req">*</span></label>
            <input
              ref="nameEl"
              :id="ids.name"
              v-model.trim="local.name"
              type="text"
              placeholder="Product Name"
              class="input"
              :aria-invalid="!!v.name"
              required
            />
            <p v-if="v.name" class="hint-err">{{ v.name }}</p>
          </div>

          <!-- Price -->
          <div class="grid gap-1.5">
            <label :for="ids.price" class="label">Price (TZS) <span class="req">*</span></label>
            <div class="flex items-center gap-2">
              <span class="rounded-xl px-2 py-2 text-sm bg-black/5">TSh</span>
              <input
                :id="ids.price"
                v-model.number="local.price"
                inputmode="decimal"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="input flex-1"
                :aria-invalid="!!v.price"
                required
              />
            </div>
            <div class="text-[11px] text-slate-500">
              {{ formattedTZS }}
            </div>
            <p v-if="v.price" class="hint-err">{{ v.price }}</p>
          </div>

          <!-- Image -->
          <div class="grid gap-1.5">
            <label class="label">Image</label>
            <div
              class="border border-dashed border-slate-300 rounded-xl p-3 text-center text-xs text-slate-600 bg-white"
              @dragover.prevent
              @drop.prevent="onDrop"
            >
              <input ref="fileEl" type="file" accept="image/*" class="hidden" @change="onPick" />
              <button type="button" class="btn-soft" @click="fileEl?.click()">Upload</button>
              <span class="ml-2">or drag & drop (max 1)</span>
            </div>

            <div v-if="previewUrl" class="relative mt-2">
              <img :src="previewUrl" alt="Preview" class="h-36 w-full object-cover rounded-xl border border-black/10" />
              <button type="button" class="abs-del" @click="clearImage" aria-label="Remove image">✖</button>
            </div>
          </div>

          <!-- Position -->
          <div class="grid gap-1.5">
            <label class="label">Position</label>
            <div class="seg">
              <button
                v-for="opt in positions"
                :key="opt.value"
                type="button"
                class="seg-btn"
                :class="{ 'seg-active': local.position === opt.value }"
                @click="local.position = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <!-- Screen reader fallback -->
            <select v-model="local.position" class="sr-only" aria-hidden="true">
              <option v-for="opt in positions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <!-- Sticky actions (inside card) -->
          <div class="mt-2 grid grid-cols-2 gap-3 sticky bottom-0 pt-2 bg-white">
            <button type="button" class="btn-secondary" @click="cancel">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="submitting || !isValid">
              <span v-if="!submitting">Set</span>
              <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Saving…</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/** Props & emits */
const props = defineProps({
  modelValue: { type: Boolean, default: true },
  product: {
    type: Object,
    default: () => ({ name: '', price: null, image: '', position: 'center' })
  },
  positions: {
    type: Array,
    default: () => ([
      { label: 'Top', value: 'top' },
      { label: 'Center', value: 'center' },
      { label: 'Bottom', value: 'bottom' },
    ])
  }
})
const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

/** Visibility */
const visible = ref(!!props.modelValue)
watch(() => props.modelValue, v => visible.value = v)
watch(visible, v => {
  emit('update:modelValue', v)
  toggleScroll(!v) // lock scroll when open
})

/** Local state */
const local = reactive({
  name: props.product?.name || '',
  price: props.product?.price ?? null,
  image: props.product?.image || '',     // base64/blob URL; you decide upstream
  position: props.product?.position || 'center'
})

/** Validation */
const v = reactive({ name: '', price: '' })
const isValid = computed(() => {
  v.name = local.name?.trim() ? '' : 'Name is required.'
  const ok = Number(local.price) >= 0 && local.price !== null && local.price !== ''
  v.price = ok ? '' : 'Price must be a number ≥ 0.'
  return !(v.name || v.price)
})

/** Price helper (TZS formatting) */
const formattedTZS = computed(() => {
  const n = Number(local.price || 0)
  try {
    return new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n)
  } catch { return `TSh ${n.toLocaleString()}` }
})

/** Image handling */
const fileEl = ref(null)
const nameEl = ref(null)
const previewUrl = ref(props.product?.image || '')
function onPick(e){ const f = e.target.files?.[0]; if (f) loadImage(f); e.target.value = '' }
function onDrop(e){ const f = e.dataTransfer.files?.[0]; if (f) loadImage(f) }
async function loadImage(file){
  if (!/^image\//.test(file.type)) return
  const { dataUrl } = await compressImage(file, 1000, 1000, 0.85)
  local.image = dataUrl
  previewUrl.value = dataUrl
}
function clearImage(){ local.image = ''; previewUrl.value = '' }

/** Submit / Cancel */
const submitting = ref(false)
const err = ref('')
async function confirm(){
  err.value = ''
  if (!isValid.value) return
  submitting.value = true
  try {
    // Normalize payload; keep API shape simple
    const payload = { ...local }
    emit('submit', payload)
    visible.value = false
  } catch (e) {
    err.value = e?.message || 'Failed to set product.'
  } finally {
    submitting.value = false
  }
}
function cancel(){
  visible.value = false
  emit('cancel')
}

/** Accessibility & UX */
const ids = {
  title: 'dlg-title-' + rnd(),
  name:  'name-' + rnd(),
  price: 'price-' + rnd()
}
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

function onBackdrop(){ cancel() }
function onKey(e){
  if (e.key === 'Escape') cancel()
  if ((e.key === 'Enter' || e.key === 'NumpadEnter') && visible.value && isValid.value) confirm()
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await nextTick()
  nameEl.value?.focus()
  toggleScroll(false)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  toggleScroll(true)
})

/** Helpers */
function rnd(){ return Math.random().toString(36).slice(2,7) }
function toggleScroll(enable){ try{ document.documentElement.style.overflow = enable ? '' : 'hidden' }catch{} }

/** Tiny client-side compression (canvas) */
function compressImage(file, maxW=1000, maxH=1000, quality=0.85){
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => { img.src = reader.result }
    reader.onerror = reject
    img.onload = () => {
      let { width, height } = img
      const ratio = Math.min(maxW/width, maxH/height, 1)
      const w = Math.round(width * ratio)
      const h = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ dataUrl, width: w, height: h })
    }
    reader.readAsDataURL(file)
  })
}
</script>

<style scoped>
/* Utilities */
.label { @apply text-[12px] font-semibold text-slate-700; }
.req { @apply text-rose-600; }
.input { @apply h-11 w-full px-3 rounded-xl border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.btn-primary { @apply h-11 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:translate-y-[1px]; }
.btn-secondary { @apply h-11 rounded-xl font-semibold border border-black/10 bg-black/5 hover:bg-black/10 active:translate-y-[1px]; }
.btn-soft { @apply h-9 px-3 rounded-xl border border-black/10 bg-white hover:bg-black/5; }
.hint-err { @apply text-[11px] text-rose-700; }

/* Segmented control */
.seg { @apply grid grid-cols-3 bg-black/5 rounded-xl p-1; }
.seg-btn { @apply h-10 rounded-lg text-sm font-semibold; }
.seg-active { @apply bg-indigo-600 text-white; }

/* Image remove */
.abs-del { @apply absolute top-1 right-1 h-7 w-7 grid place-items-center rounded-full bg-black/60 text-white; }

/* Spinner */
.spinner { width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .2s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
