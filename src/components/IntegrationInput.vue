<template>
  <div class="w-full">
    <!-- Label (floating) -->
    <div class="flex items-center justify-between mb-1.5">
      <label
        :for="id"
        class="text-[13px] font-semibold text-slate-700 dark:text-slate-300"
      >
        {{ label }}
        <span v-if="required" class="text-rose-500" aria-hidden="true">*</span>
      </label>

      <!-- Optional counter -->
      <span v-if="showCounter && maxlength"
            class="text-[11px] text-slate-500 dark:text-slate-400">
        {{ (model?.length || 0) }}/{{ maxlength }}
      </span>
    </div>

    <!-- Input Shell -->
    <div
      class="relative group"
      :class="[
        sizeClass,
        disabled ? 'opacity-60 pointer-events-none' : '',
      ]"
    >
      <!-- Prefix -->
      <div v-if="$slots.prefix || leading"
           class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
        <slot name="prefix">{{ leading }}</slot>
      </div>

      <!-- Input -->
      <input
        :id="id"
        :name="name || id"
        :type="computedType"
        v-model="model"
        :placeholder="floatLabel ? ' ' : placeholder"
        :inputmode="inputMode"
        :autocomplete="autocomplete"
        :enterkeyhint="enterKeyHint"
        :maxlength="maxlength"
        :minlength="minlength"
        :readonly="readonly"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
        class="peer w-full rounded-2xl bg-white dark:bg-slate-900/60
               border text-[14px] text-slate-900 dark:text-white
               placeholder-slate-400 dark:placeholder-slate-500
               focus:outline-none transition
               border-slate-200 dark:border-white/10
               focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300/40
               pr-12"
        :class="[paddingXClass, paddingYClass, error
                ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-300/40'
                : (success ? 'border-emerald-300 focus:ring-emerald-300/40' : '')]"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter.prevent="onEnter"
      />

      <!-- Floating label (inside) -->
      <label
        v-if="floatLabel"
        :for="id"
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2
               text-[13px] text-slate-500 dark:text-slate-400 transition-all
               peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-indigo-500
               peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-[11px]
               bg-white dark:bg-slate-900/60 px-1 rounded"
        :class="leading ? 'ml-6' : ''"
      >
        {{ placeholder || label }}
      </label>

      <!-- Clear button -->
      <button
        v-if="clearable && (model?.length || 0) > 0 && !isPassword"
        type="button"
        class="abs-btn right-2"
        @click="clear"
        aria-label="Clear"
        title="Clear"
      >✖️</button>

      <!-- Password toggle -->
      <button
        v-if="isPassword && showPasswordToggle"
        type="button"
        class="abs-btn right-2"
        @click="togglePwd"
        :aria-label="pwdVisible ? 'Hide password' : 'Show password'"
        :title="pwdVisible ? 'Hide' : 'Show'"
      >{{ pwdVisible ? '🙈' : '👁️' }}</button>

      <!-- Suffix slot (after toggle/clear if provided) -->
      <div v-if="$slots.suffix || trailing"
           class="absolute right-9 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
        <slot name="suffix">{{ trailing }}</slot>
      </div>
    </div>

    <!-- Strength meter (optional for password) -->
    <div v-if="isPassword && showStrength" class="mt-1">
      <div class="h-1 w-full rounded bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div class="h-full transition-all"
             :style="{ width: strength.pct + '%'}"
             :class="strength.barClass"></div>
      </div>
      <div class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        Strength: <b :class="strength.textClass">{{ strength.label }}</b>
      </div>
    </div>

    <!-- Helper / Error -->
    <div class="mt-1 text-[12px] leading-snug">
      <p v-if="error" :id="errorId" class="text-rose-500">{{ error }}</p>
      <p v-else-if="hint" :id="hintId" class="text-slate-500 dark:text-slate-400">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

/* PROPS */
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: 'Label' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' }, // text, email, password, number, tel, url
  name: { type: String, default: '' },

  // UX
  size: { type: String, default: 'md', validator: v => ['sm','md','lg'].includes(v) },
  floatLabel: { type: Boolean, default: true },
  leading: { type: String, default: '' },    // e.g. '🔎'
  trailing: { type: String, default: '' },   // e.g. 'TZS'
  clearable: { type: Boolean, default: true },

  // Validation / state
  required: { type: Boolean, default: false },
  minlength: { type: Number, default: undefined },
  maxlength: { type: Number, default: undefined },
  error: { type: String, default: '' },
  success: { type: Boolean, default: false },
  hint: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },

  // Mobile-friendly attributes
  autocomplete: { type: String, default: 'off' },
  enterKeyHint: { type: String, default: 'send' }, // e.g. 'done','next','search','send'
  inputmode: { type: String, default: '' },        // override inputmode

  // Password extras
  showPasswordToggle: { type: Boolean, default: true },
  showStrength: { type: Boolean, default: false }
})

/* EMITS */
const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'enter', 'clear', 'toggle-password'])

/* ID / ARIA */
const id = `tf_${Math.random().toString(36).slice(2,9)}`
const hintId = `${id}_hint`
const errorId = `${id}_err`
const describedBy = computed(() => props.error ? errorId : (props.hint ? hintId : undefined))

/* v-model */
const model = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

/* Size classes */
const sizeClass = computed(() => {
  return {
    sm: 'text-[14px]',
    md: 'text-[15px]',
    lg: 'text-[16px]'
  }[props.size]
})
const paddingYClass = computed(() => ({ sm: 'py-2', md: 'py-3', lg: 'py-3.5' }[props.size]))
const paddingXClass = computed(() => {
  const leftPad = props.leading ? 'pl-10' : 'pl-4'
  const rightPad = (props.trailing || (isPassword.value && props.showPasswordToggle) || (props.clearable && (model.value?.length||0)>0))
                   ? 'pr-12' : 'pr-4'
  return `${leftPad} ${rightPad}`
})

/* Input mode (mobile keyboards) */
const inputMode = computed(() => {
  if (props.inputmode) return props.inputmode
  const t = props.type
  if (t === 'email') return 'email'
  if (t === 'tel') return 'tel'
  if (t === 'url') return 'url'
  if (t === 'number') return 'numeric'
  return 'text'
})

/* Password visibility */
const pwdVisible = ref(false)
const isPassword = computed(() => props.type === 'password')
const computedType = computed(() => (isPassword.value && pwdVisible.value) ? 'text' : props.type)
function togglePwd(){
  pwdVisible.value = !pwdVisible.value
  emit('toggle-password', pwdVisible.value)
}

/* Password strength (simple heuristic) */
const strength = computed(() => {
  if (!isPassword.value) return { pct: 0, label: '', barClass:'', textClass:'' }
  const v = String(model.value || '')
  let score = 0
  if (v.length >= 8) score += 1
  if (/[A-Z]/.test(v)) score += 1
  if (/[a-z]/.test(v)) score += 1
  if (/\d/.test(v)) score += 1
  if (/[^A-Za-z0-9]/.test(v)) score += 1
  const pct = [0,20,40,60,80,100][score]
  const label = ['Very weak','Weak','Okay','Good','Strong','Excellent'][score]
  const barClass = [
    'bg-rose-400','bg-rose-400','bg-amber-400','bg-yellow-400','bg-emerald-400','bg-emerald-500'
  ][score]
  const textClass = score >= 4 ? 'text-emerald-500' : (score >= 2 ? 'text-amber-500' : 'text-rose-500')
  return { pct, label, barClass, textClass }
})

/* Counter */
const showCounter = computed(() => Boolean(props.maxlength))

/* Events */
function onFocus(e){ emit('focus', e) }
function onBlur(e){ emit('blur', e) }
function onEnter(){ emit('enter', model.value) }

/* Clear */
function clear(){
  model.value = ''
  emit('clear')
}
</script>

<style scoped>
.abs-btn{
  @apply absolute top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center
         rounded-full bg-black/5 dark:bg-white/10
         border border-black/10 dark:border-white/10
         text-[14px] text-slate-600 dark:text-slate-300
         active:bg-black/10 dark:active:bg-white/20;
}
</style>
