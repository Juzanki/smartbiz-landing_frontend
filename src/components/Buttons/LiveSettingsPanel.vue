<!-- src/components/Buttons/LiveSettingsPanel.vue -->
<template>
  <section class="panel" role="dialog" aria-modal="false" aria-label="Live Settings">
    <!-- Header -->
    <header class="hdr">
      <h2 class="title">⚙️ Live Settings</h2>
      <button class="icon" type="button" title="Close" @click="emit('close')">✖</button>
    </header>

    <!-- AUDIO -->
    <fieldset class="group" aria-labelledby="g-audio">
      <legend id="g-audio">🎙️ Audio</legend>
      <div class="row">
        <label class="switch">
          <input type="checkbox" :checked="s.micMuted" @change="upd('micMuted', $event.target.checked)" />
          <span>Mic muted</span>
        </label>

        <div class="slider">
          <label>
            Mic gain
            <input type="range" min="0" max="100" :value="s.micGain" @input="upd('micGain', +$event.target.value)" />
            <span class="val">{{ s.micGain }}%</span>
          </label>
        </div>
      </div>
    </fieldset>

    <!-- VIDEO -->
    <fieldset class="group" aria-labelledby="g-video">
      <legend id="g-video">🎥 Video</legend>

      <div class="row stack">
        <label class="switch">
          <input type="checkbox" :checked="s.dataSaver" @change="upd('dataSaver', $event.target.checked)" />
          <span>Data saver</span>
        </label>

        <div class="select">
          <label>
            Quality
            <select :value="s.quality" @change="upd('quality', $event.target.value)">
              <option value="auto">Auto</option>
              <option value="low">Low (360p)</option>
              <option value="high">High (720p)</option>
              <option value="ultra">Ultra (1080p)</option>
            </select>
          </label>
        </div>

        <label class="switch">
          <input type="checkbox" :checked="s.showFx" @change="upd('showFx', $event.target.checked)" />
          <span>Show effects</span>
        </label>

        <div class="slider">
          <label>
            Effects intensity
            <input type="range" min="0" max="100" :value="s.effectsIntensity" @input="upd('effectsIntensity', +$event.target.value)" />
            <span class="val">{{ s.effectsIntensity }}%</span>
          </label>
        </div>

        <label class="switch">
          <input type="checkbox" :checked="s.showFaceFilters" @change="upd('showFaceFilters', $event.target.checked)" />
          <span>Enable face filters</span>
        </label>

        <div class="select">
          <label>
            Face filter
            <select :value="s.selectedFilter" @change="upd('selectedFilter', $event.target.value)" :disabled="!s.showFaceFilters">
              <option value="">None</option>
              <option value="beauty">Beauty ✨</option>
              <option value="studio">Studio 🎛️</option>
              <option value="bw">B/W ⚫⚪</option>
              <option value="warm">Warm 🌤️</option>
              <option value="cool">Cool ❄️</option>
              <option value="neon">Neon 🟣</option>
            </select>
          </label>
        </div>
      </div>
    </fieldset>

    <!-- NOTIFICATIONS -->
    <fieldset class="group" aria-labelledby="g-notif">
      <legend id="g-notif">🔔 Notifications</legend>
      <div class="row">
        <label class="switch">
          <input type="checkbox" :checked="s.notifSound" @change="upd('notifSound', $event.target.checked)" />
          <span>Sound</span>
        </label>
        <label class="switch">
          <input type="checkbox" :checked="s.haptics" @change="upd('haptics', $event.target.checked)" />
          <span>Haptics</span>
        </label>
        <button class="btn" type="button" @click="testNotif">Test</button>
      </div>
    </fieldset>

    <!-- APPEARANCE -->
    <fieldset class="group" aria-labelledby="g-appearance">
      <legend id="g-appearance">🎨 Appearance</legend>
      <div class="row">
        <div class="select">
          <label>
            Theme
            <select :value="s.theme" @change="upd('theme', $event.target.value)">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>

        <div class="select">
          <label>
            Language
            <select :value="s.language" @change="upd('language', $event.target.value)">
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </label>
        </div>
      </div>
    </fieldset>

    <!-- Actions -->
    <footer class="actions">
      <button class="btn ghost" type="button" @click="resetToDefaults">Reset</button>
      <div class="sp"></div>
      <button class="btn" type="button" @click="apply">Apply</button>
      <button class="btn primary" type="button" @click="apply(true)">Apply & Close</button>
    </footer>

    <!-- SR -->
    <div class="sr-only" aria-live="polite">{{ sr }}</div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, withDefaults } from 'vue'

type Settings = {
  micMuted: boolean
  micGain: number
  dataSaver: boolean
  quality: 'auto' | 'low' | 'high' | 'ultra'
  showFx: boolean
  effectsIntensity: number
  showFaceFilters: boolean
  selectedFilter: string
  notifSound: boolean
  haptics: boolean
  language: 'en' | 'sw'
  theme: 'system' | 'light' | 'dark'
}

const DEFAULTS: Settings = {
  micMuted: false,
  micGain: 70,
  dataSaver: false,
  quality: 'auto',
  showFx: true,
  effectsIntensity: 65,
  showFaceFilters: true,
  selectedFilter: '',
  notifSound: true,
  haptics: true,
  language: 'en',
  theme: 'system',
}

const props = withDefaults(defineProps<{
  modelValue?: Partial<Settings>
  /** key ya localStorage; weka '' kuzima persistence */
  storageKey?: string
}>(), {
  modelValue: () => ({}),
  storageKey: 'live:settings'
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: Settings): void
  (e: 'apply', v: Settings): void
  (e: 'close'): void
  (e: 'test'): void
}>()

/* ===== state ===== */
const s = ref<Settings>({ ...DEFAULTS, ...props.modelValue })
const sr = ref('')

/* load from localStorage (kama iko) */
if (props.storageKey && typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(props.storageKey)
    if (raw) s.value = { ...DEFAULTS, ...(JSON.parse(raw) as Settings), ...props.modelValue }
  } catch {}
}

/* persist na ku-emit */
watch(s, (v) => {
  emit('update:modelValue', v)
  if (props.storageKey && typeof window !== 'undefined') {
    try { localStorage.setItem(props.storageKey, JSON.stringify(v)) } catch {}
  }
}, { deep: true })

function upd<K extends keyof Settings>(k: K, v: Settings[K]) {
  s.value = { ...s.value, [k]: v }
}

function testNotif(){
  if (s.value.haptics) { try { navigator.vibrate?.(15) } catch {} }
  if (s.value.notifSound) {
    try {
      const a = new Audio()
      a.src = 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAABkYXRhAAAAAA==' // tiny beep
      a.play().catch(()=>{})
    } catch {}
  }
  sr.value = 'Notification test'
  setTimeout(() => sr.value = '', 800)
  emit('test')
}

function resetToDefaults(){ s.value = { ...DEFAULTS }; sr.value = 'Settings reset' }
function apply(close = false){
  emit('apply', s.value)
  sr.value = 'Settings applied'
  if (close) emit('close')
}
</script>

<style scoped>
.panel{
  width:min(96vw,620px);
  background:linear-gradient(180deg,rgba(2,6,23,.96),rgba(0,0,0,.96));
  border:1px solid rgba(255,255,255,.12);
  border-radius:1rem;
  color:#fff;
  padding:1rem;
  box-shadow:0 16px 60px rgba(0,0,0,.55);
}
.hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem}
.title{font-weight:800;font-size:1.05rem}
.icon{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:.5rem;color:#fff;padding:.2rem .5rem}

.group{margin-top:.7rem;border:1px solid rgba(255,255,255,.1);border-radius:.8rem;padding:.6rem}
legend{font-weight:700;color:#cbd5e1;padding:0 .35rem}
.row{display:flex;gap:.7rem;align-items:center;flex-wrap:wrap}
.row.stack{flex-direction:column;align-items:stretch}
.switch{display:flex;align-items:center;gap:.45rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);padding:.45rem .6rem;border-radius:.7rem}
.slider label{display:flex;align-items:center;gap:.45rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);padding:.45rem .6rem;border-radius:.7rem}
.slider input[type="range"]{width:160px}
.val{opacity:.9;font-variant-numeric:tabular-nums}
.select label{display:flex;align-items:center;gap:.45rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);padding:.45rem .6rem;border-radius:.7rem}
.select select{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:.4rem;padding:.25rem .4rem}
.actions{display:flex;align-items:center;gap:.5rem;margin-top:.9rem}
.btn{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:.6rem;padding:.5rem .8rem;font-weight:700}
.btn.primary{background:rgba(59,130,246,.3);border-color:rgba(59,130,246,.45)}
.btn.ghost{background:rgba(255,255,255,.06)}
.sp{flex:1}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
