<!-- MobileTextField.vue -->
<template>
  <div class="w-full">
    <!-- Label -->
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-semibold mb-1 text-zinc-800 dark:text-zinc-100"
    >
      {{ label }}
      <span v-if="required" class="text-rose-600">*</span>
    </label>

    <!-- Field wrapper -->
    <div
      class="group relative flex items-center rounded-2xl border bg-white dark:bg-zinc-900
             focus-within:ring-2 transition
             min-h-[44px] px-3"
      :class="[
        error
          ? 'border-rose-400 ring-rose-300'
          : 'border-zinc-300 dark:border-zinc-700 focus-within:ring-indigo-400 dark:focus-within:ring-indigo-500'
      ]"
    >
      <!-- Prefix icon/slot -->
      <div v-if="$slots.prefix || icon" class="mr-2 shrink-0 text-zinc-500 dark:text-zinc-400">
        <slot name="prefix">
          <!-- Fallback emoji/icon text; replace with your icon component if needed -->
          <span class="text-lg leading-none">{{ icon }}</span>
        </slot>
      </div>

      <!-- Input -->
      <input
        ref="inputEl"
        :id="inputId"
        :name="name || inputId"
        :type="inputType"
        :value="stringValue"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :inputmode="inputmode || undefined"
        :autocomplete="autocomplete || undefined"
        :readonly="readonly"
        :disabled="disabled"
        class="peer w-full bg-transparent outline-none text-[15px] text-zinc-900 dark:text-zinc-100
               placeholder:text-zinc-400 dark:placeholder:text-zinc-500
               py-2"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
        @input="onInput"
        @change="$emit('change', $event)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
        @keydown.enter="$emit('enter', stringValue)"
        v-bind="$attrs"
      />

      <!-- Suffix slot -->
      <div v-if="$slots.suffix" class="ml-2 shrink-0 text-zinc-500 dark:text-zinc-400">
        <slot name="suffix" />
      </div>

      <!-- Clear button -->
      <button
        v-if="clearable && !disabled && !readonly && stringValue.length"
        type="button"
        class="ml-2 shrink-0 h-8 w-8 grid place-items-center rounded-full
               text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white
               hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition"
        aria-label="Clear text"
        @click="clear"
      >
        ×
      </button>

      <!-- Password toggle -->
      <button
        v-if="passwordToggle"
        type="button"
        class="ml-1 shrink-0 h-8 w-8 grid place-items-center rounded-full
               text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white
               hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        @click="togglePassword"
      >
        <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3l18 18"/><path d="M10.6 10.6a3 3 0 104.2 4.2M9.9 4.2A10.7 10.7 0 0121 12s-4 7-9 7a9.6 9.6 0 01-5.2-1.6"/><path d="M7.5 7.5A10.7 10.7 0 003 12s4 7 9 7"/>
        </svg>
      </button>
    </div>

    <!-- Helper row: hint + counter + error -->
    <div class="mt-1 flex items-center justify-between gap-2">
      <p v-if="hint && !error" class="text-[12px] text-zinc-500" :id="hintId">{{ hint }}</p>
      <p v-if="error" class="text-[12px] text-rose-600" :id="errorId">{{ error }}</p>
      <p v-if="showCounter && maxlength" class="text-[12px] text-zinc-500 ml-auto">
        {{ stringValue.length }}/{{ maxlength }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

/* Props */
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },       // text | email | number | password | tel | url …
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  icon: { type: String, default: '' },           // shown only if no prefix slot
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  passwordToggle: { type: Boolean, default: undefined }, // if undefined, auto-enable for type=password
  maxlength: { type: Number, default: null },
  showCounter: { type: Boolean, default: true },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  autocomplete: { type: String, default: '' },
  inputmode: { type: String, default: '' },
  name: { type: String, default: '' },
  id: { type: String, default: '' }
})

/* Emits */
const emit = defineEmits(['update:modelValue','change','focus','blur','enter','clear','toggle'])

/* State */
const inputEl = ref(null)
const uid = Math.random().toString(36).slice(2, 8)
const inputId = computed(() => props.id || `mtf-${uid}`)
const hintId = `hint-${uid}`
const errorId = `err-${uid}`
const describedBy = computed(() => {
  const ids = []
  if (props.hint && !props.error) ids.push(hintId)
  if (props.error) ids.push(errorId)
  return ids.join(' ') || undefined
})

/* v-model normalization */
const stringValue = computed({
  get: () => (props.modelValue ?? '').toString(),
  set: v => emit('update:modelValue', v)
})

/* Password toggle */
const showPassword = ref(false)
const isPassword = computed(() => props.type === 'password')
const allowToggle = computed(() =>
  props.passwordToggle === undefined ? isPassword.value : props.passwordToggle
)
const inputType = computed(() => (allowToggle.value && showPassword.value ? 'text' : props.type))
function togglePassword(){
  if (!allowToggle.value) return
  showPassword.value = !showPassword.value
  emit('toggle', showPassword.value)
}

/* Actions */
function onInput(e){
  stringValue.value = e.target.value
}
function clear(){
  stringValue.value = ''
  emit('clear')
  // keep focus for fast re-entry
  requestAnimationFrame(() => inputEl.value?.focus?.())
}
</script>

<style scoped>
/* Better mobile autofill contrast */
input:-webkit-autofill,
input:-webkit-autofill:focus{
  -webkit-text-fill-color: inherit;
  transition: background-color 9999s ease-out;
}

/* Reduce iOS tap highlight */
:host, input { -webkit-tap-highlight-color: transparent; }
</style>
