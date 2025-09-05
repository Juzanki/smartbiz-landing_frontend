<!-- src/components/UniversalModal.vue -->
<template>
  <teleport to="body">
    <transition name="um-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0"
        :style="{ zIndex: String(zIndex) }"
        role="dialog"
        :aria-labelledby="headingId"
        :aria-modal="true"
        @keydown.tab.prevent="onTabTrap"
      >
        <!-- DIM -->
        <div
          class="absolute inset-0 bg-black/75 md:bg-black/60 backdrop-blur-sm"
          :aria-hidden="true"
          @click="closeOnBackdrop ? close('backdrop') : null"
        />

        <!-- SHEET / DIALOG -->
        <section
          ref="sheet"
          class="um-sheet fixed md:static bottom-0 md:bottom-auto inset-x-0 md:inset-auto
                 mx-auto w-full md:max-w-[min(56rem,92vw)]
                 text-zinc-100 md:rounded-3xl rounded-t-3xl overflow-hidden
                 border border-white/10 bg-[rgba(22,22,28,.92)] md:bg-[rgba(22,22,28,.92)]
                 shadow-[0_30px_80px_rgba(0,0,0,.55)] um-border
                 pb-[env(safe-area-inset-bottom)]"
          :class="['max-h-[90vh] md:max-h-[86vh]', desktopCentered ? 'md:mt-16' : '']"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend.passive="onTouchEnd"
          @click.stop
        >
          <!-- HEADER -->
          <header
            class="sticky top-0 z-10 backdrop-blur-md bg-white/8 border-b border-white/10"
          >
            <div class="flex items-center justify-between px-4 pt-3 pb-3 md:px-6">
              <!-- drag handle (mobile) -->
              <div class="md:hidden absolute left-1/2 -translate-x-1/2 -top-1.5">
                <div class="h-1.5 w-12 rounded-full bg-white/20" />
              </div>

              <h2 :id="headingId" class="text-base md:text-xl font-extrabold text-indigo-300 flex items-center gap-2">
                <span>{{ modalIcon }}</span>
                <span class="capitalize">{{ titleMap[type] || customTitle || 'Panel' }}</span>
                <span v-if="subtitle" class="text-[11px] md:text-xs font-medium text-zinc-300/90 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {{ subtitle }}
                </span>
              </h2>

              <div class="flex items-center gap-1">
                <button
                  v-if="helpUrl"
                  class="icon-btn"
                  :aria-label="'Help'"
                  type="button"
                  @click="openHelp"
                >❓</button>
                <button
                  ref="closeBtn"
                  class="icon-btn"
                  :aria-label="'Close'"
                  type="button"
                  @click="close('button')"
                >✖</button>
              </div>
            </div>
          </header>

          <!-- CONTENT -->
          <main
            ref="contentRef"
            class="px-3 md:px-6 py-3 md:py-6 overflow-y-auto space-y-4
                   max-h-[calc(90vh-64px)] md:max-h-[calc(86vh-72px)]"
          >
            <!-- Mtumia slot maalum kama ukitaka -->
            <slot v-if="$slots.default" />
            <component
              v-else
              ref="innerRef"
              :is="componentMap[type] || FallbackPanel"
              v-bind="innerProps"
              @change="onInnerChange"
            />
          </main>

          <!-- FOOTER -->
          <footer class="px-3 md:px-6 pb-3 md:pb-5 pt-2 border-t border-white/10 bg-white/5 backdrop-blur-md">
            <div class="flex flex-wrap gap-2 justify-end">
              <button
                v-for="(btn, i) in footerButtons"
                :key="i"
                type="button"
                class="um-btn"
                :class="btn.kind || 'ghost'"
                :disabled="btn.disabled"
                @click="handleAction(btn)"
              >
                <span v-if="btn.icon" class="mr-1.5">{{ btn.icon }}</span>{{ btn.label }}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick, h } from 'vue'

/* ===================== PROPS ===================== */
const props = withDefaults(defineProps<{
  modelValue: boolean
  type: 'settings' | 'summary' | 'poll' | 'moderation' | 'background' | 'goals' | 'rules' | string
  customTitle?: string
  subtitle?: string
  zIndex?: number
  desktopCentered?: boolean
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  helpUrl?: string
  /** Ruhusu kuzuia kufunga: return false to block */
  beforeClose?: (reason: 'esc'|'backdrop'|'button'|'swipe'|'bus') => boolean | Promise<boolean>
  /** Props za ndani kwa panel husika (optional) */
  innerProps?: Record<string, any>
}>(), {
  modelValue: false,
  type: 'settings',
  zIndex: 70,
  desktopCentered: true,
  closeOnBackdrop: true,
  closeOnEsc: true,
  helpUrl: ''
})

const emit = defineEmits<{
  (e:'update:modelValue', v:boolean):void
  (e:'open'):void
  (e:'close', reason: string):void
  (e:'action', payload: { action: string, type: string }):void
  (e:'save', payload: any):void
}>()

/* ===================== HEAD / IDS ===================== */
const titleMap: Record<string, string> = {
  settings: 'Stream Settings',
  summary: 'Live Summary',
  poll: 'Live Polls',
  moderation: 'Moderation Tools',
  background: 'Background Selector',
  goals: 'Live Goals',
  rules: 'Community Rules'
}
const iconMap: Record<string, string> = {
  settings: '⚙️', summary: '📊', poll: '🗳️', moderation: '🛡️',
  background: '🌅', goals: '🎯', rules: '📜'
}
const modalIcon = computed(() => iconMap[props.type] || '🔧')
const headingId = `um-title-${Math.random().toString(36).slice(2,8)}`

/* ===================== COMPONENT MAP ===================== */
import StreamSettings from './LiveSettingsPanel.vue'
import SummaryPanel   from './LiveSummary.vue'
import PollPanel      from './PollPanel.vue'
import ModerationPanel from './ModerationPanel.vue'
import BackgroundPanel from './BackgroundPanel.vue'
import GoalPanel      from './AddGoal.vue'

/* ---- Inline Rules panel (kipekee) ---- */
const RulesPanel = {
  name:'RulesPanel',
  props:{ value: Object },
  data(){
    return {
      allow: {
        respect: true, kindness: true, topicOnly: true
      },
      forbid: {
        hate: true, harassment: true, nudity: true, illegal: true, spam: true, doxxing: true
      },
      enforce: {
        autoMuteProfanity: true,
        blockLinks: true,
        rateLimit: true,
        filterNSFW: true
      },
      agreed: false
    }
  },
  methods:{
    getConfig(){
      return {
        allow: this.allow,
        forbid: this.forbid,
        enforce: this.enforce,
        agreed: this.agreed,
        version: 1
      }
    }
  },
  render(){
    const L = (label:string, model:any, key:string) =>
      h('label',{class:'flex items-center gap-2 py-1.5'},
        [h('input',{type:'checkbox',checked:model[key],onInput:(e:any)=>model[key]=e.target.checked,class:'accent-indigo-500'}),
         h('span',null,label)]
      )
    return h('div', { class:'text-sm leading-relaxed space-y-6' }, [
      h('section', { class:'space-y-2' }, [
        h('h3',{class:'font-bold text-indigo-300 text-base flex items-center gap-2'},['✅ Vitu vinavyoruhusiwa']),
        L('Heshima na lugha ya staha', this.allow, 'respect'),
        L('Ukindness/kusaidia wengine', this.allow, 'kindness'),
        L('Kufuata mada ya kikao', this.allow, 'topicOnly'),
      ]),
      h('section', { class:'space-y-2' }, [
        h('h3',{class:'font-bold text-rose-300 text-base flex items-center gap-2'},['⛔ Visivyoruhusiwa']),
        L('Matamshi ya chuki / ubaguzi', this.forbid, 'hate'),
        L('Matusi / unyanyasaji / vitisho', this.forbid, 'harassment'),
        L('Ngono wazi / unyonyaji / ponografia', this.forbid, 'nudity'),
        L('Kuvunja sheria / dawa / uhalifu', this.forbid, 'illegal'),
        L('Spam / matangazo yasiyoombwa / links hatarishi', this.forbid, 'spam'),
        L('Kufichua taarifa binafsi (doxxing)', this.forbid, 'doxxing'),
      ]),
      h('section',{class:'space-y-2'},[
        h('h3',{class:'font-bold text-amber-300 text-base'},['🛡️ Utekelezaji otomatiki']),
        L('Auto-mute matusi (profanity filter)', this.enforce, 'autoMuteProfanity'),
        L('Zuia links zisizoidhinishwa', this.enforce, 'blockLinks'),
        L('Rate-limit ujumbe wa haraka sana', this.enforce, 'rateLimit'),
        L('Kagua/zuia maudhui NSFW', this.enforce, 'filterNSFW'),
      ]),
      h('label',{class:'flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3'},
        [h('input',{type:'checkbox',checked:this.agreed,onInput:(e:any)=>this.agreed=e.target.checked,class:'accent-emerald-500'}),
         h('span',null,'Ninakubali Sheria za Jumuiya na utekelezaji wake.')]),
      h('p',{class:'text-[11px] opacity-80'},'Ukiukaji unaweza kusababisha onyo, mute, kuondolewa hewani au kuripotiwa kulingana na uzito.')
    ])
  }
}

const componentMap: Record<string, any> = {
  settings: StreamSettings,
  summary:  SummaryPanel,
  poll:     PollPanel,
  moderation: ModerationPanel,
  background: BackgroundPanel,
  goals:    GoalPanel,
  rules:    RulesPanel
}

/* Fallback kama type haijulikani */
const FallbackPanel = {
  name:'FallbackPanel',
  props:{},
  render(){ return h('div',{class:'text-sm opacity-80'},'No content for this panel type.') }
}

/* ===================== STATE & LIFECYCLE ===================== */
const open = computed(()=> props.modelValue)
const sheet = ref<HTMLElement|null>(null)
const closeBtn = ref<HTMLButtonElement|null>(null)
const contentRef = ref<HTMLElement|null>(null)
const innerRef = ref<any|null>(null)

/* Scroll lock + focus */
const prevOverflow = ref('')
watch(open, async (isOpen) => {
  if (isOpen) {
    emit('open')
    prevOverflow.value = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    // initial focus
    closeBtn.value?.focus()
    collectFocusable()
  } else {
    document.body.style.overflow = prevOverflow.value || ''
  }
})

/* Focus trap (Tab cycling) */
let focusables: HTMLElement[] = []
function collectFocusable(){
  const root = sheet.value
  if(!root) return
  focusables = Array.from(root.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
}
function onTabTrap(e: KeyboardEvent){
  if(!open.value || !props.modelValue || !focusables.length) return
  const active = document.activeElement as HTMLElement
  const idx = focusables.indexOf(active)
  const next = e.shiftKey ? (idx <= 0 ? focusables.at(-1) : focusables[idx-1]) : (idx === focusables.length-1 ? focusables[0] : focusables[idx+1])
  next?.focus()
}

/* ESC */
function keyListener(e: KeyboardEvent){
  if(e.key === 'Escape' && props.closeOnEsc && open.value) close('esc')
}

/* Help */
function openHelp(){ if(props.helpUrl) window.open(props.helpUrl, '_blank') }

/* Close (with guard) */
async function close(reason:'esc'|'backdrop'|'button'|'swipe'|'bus'='button'){
  if (typeof props.beforeClose === 'function'){
    const ok = await Promise.resolve(props.beforeClose(reason))
    if (!ok) return
  }
  emit('update:modelValue', false)
  emit('close', reason)
}

/* Swipe-down (mobile) */
let startY = 0, currentY = 0, dragging = false
function onTouchStart(e: TouchEvent){ startY = e.touches[0].clientY; dragging = true }
function onTouchMove(e: TouchEvent){
  if(!dragging || !sheet.value) return
  currentY = e.touches[0].clientY
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = `translateY(${delta}px)`
}
function onTouchEnd(){
  if(!sheet.value) return
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = ''
  dragging = false
  if(delta > 120) close('swipe')
}

/* Event bus (remote control from LiveRoom) */
type BusEvt = { cmd:'open', type?:string } | { cmd:'close' } | { cmd:'toggle' } | { cmd:'set-type', type:string }
const BUS = 'um:modal'
function onBus(ev: Event){
  const d = (ev as CustomEvent<BusEvt>).detail
  if(!d) return
  if(d.cmd==='open'){ if(d.type) currentType.value = d.type; emit('update:modelValue', true) }
  else if(d.cmd==='close'){ close('bus') }
  else if(d.cmd==='toggle'){ emit('update:modelValue', !open.value) }
  else if(d.cmd==='set-type'){ currentType.value = d.type }
}
onMounted(()=>{
  document.addEventListener('keydown', keyListener)
  window.addEventListener(BUS, onBus as EventListener)
})
onBeforeUnmount(()=>{
  document.removeEventListener('keydown', keyListener)
  window.removeEventListener(BUS, onBus as EventListener)
  document.body.style.overflow = prevOverflow.value || ''
})

/* Runtime type (allow set-type) */
const currentType = ref<string>(props.type)
watch(()=>props.type, v => currentType.value = v)
const type = computed(()=> currentType.value)

/* ===================== FOOTER BUTTONS / ACTIONS ===================== */
type Btn = { label:string; action:string; kind?:'primary'|'danger'|'ghost'; icon?:string; disabled?:boolean }
const footerButtons = computed<Btn[]>(() => {
  const t = type.value
  const baseClose: Btn = { label:'Close', action:'close', kind:'ghost' }
  switch(t){
    case 'settings':    return [ { label:'Save', action:'save', kind:'primary', icon:'💾' }, baseClose ]
    case 'rules':       return [ { label:'Save Rules', action:'save', kind:'primary', icon:'✅', disabled: !rulesAgreed.value }, baseClose ]
    case 'poll':        return [ { label:'Start / Update', action:'save', kind:'primary', icon:'🗳️' }, baseClose ]
    case 'moderation':  return [ { label:'Apply', action:'save', kind:'primary', icon:'🛡️' }, baseClose ]
    case 'background':  return [ { label:'Apply', action:'save', kind:'primary', icon:'🌅' }, baseClose ]
    case 'goals':       return [ { label:'Save Goal', action:'save', kind:'primary', icon:'🎯' }, baseClose ]
    default:            return [ baseClose ]
  }
})

/* Track "agreed" for rules to enable button */
const rulesAgreed = computed(() => {
  const cfg = innerRef.value?.getConfig?.()
  return typeof cfg?.agreed === 'boolean' ? cfg.agreed : true
})

function handleAction(btn: Btn){
  emit('action', { action: btn.action, type: type.value })
  if (btn.action === 'save'){
    const payload = innerRef.value?.getConfig?.() ?? {}
    emit('save', { type: type.value, payload })
    // optional: auto close after save
    close('button')
  } else if (btn.action === 'close'){
    close('button')
  }
}

/* Bubble when inner content changes (if needed) */
function onInnerChange(_e:any){ /* hook available */ }
</script>

<style scoped>
/* ===== Fade bg ===== */
.um-fade-enter-active, .um-fade-leave-active { transition: opacity .22s ease; }
.um-fade-enter-from, .um-fade-leave-to { opacity: 0; }

/* ===== Sheet entrance ===== */
.um-sheet { transform: translateY(0); animation: um-up .28s cubic-bezier(.22,1,.36,1) both; }
@keyframes um-up { from{ transform: translateY(24px); opacity:.98 } to{ transform: translateY(0); opacity:1 } }

/* ===== Border sheen ===== */
.um-border{
  position: relative;
}
.um-border::before{
  content:''; position:absolute; inset:0; pointer-events:none; border-radius:inherit;
  background: linear-gradient(120deg, rgba(255,255,255,.18), rgba(255,255,255,.06));
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  padding:1px; border-radius:inherit;
}

/* ===== Buttons ===== */
.um-btn{
  --bg: rgba(255,255,255,.08);
  --bd: rgba(255,255,255,.18);
  --fg: #fff;
  padding: .5rem .9rem; border-radius: 9999px;
  border: 1px solid var(--bd); background: var(--bg); color: var(--fg);
  font-weight: 700; font-size: .875rem; backdrop-filter: blur(10px);
  transition: transform .16s ease, background .16s ease, box-shadow .16s ease, filter .16s ease;
}
.um-btn:hover{ transform: translateY(-1px) }
.um-btn:disabled{ opacity:.55; cursor: not-allowed }
.um-btn.primary{ --bg: linear-gradient(180deg, rgba(99,102,241,.4), rgba(99,102,241,.22)); --bd: rgba(99,102,241,.45) }
.um-btn.danger{ --bg: linear-gradient(180deg, rgba(239,68,68,.42), rgba(239,68,68,.22)); --bd: rgba(239,68,68,.45) }
.um-btn.ghost{ --bg: rgba(255,255,255,.08); --bd: rgba(255,255,255,.18) }

.icon-btn{
  border: 1px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  border-radius: 9999px; padding:.35rem .6rem; line-height:1; color:#fff;
  transition: transform .15s ease, background .15s ease;
}
.icon-btn:hover{ transform: translateY(-1px) }

/* ===== Scrollbars ===== */
.um-sheet ::-webkit-scrollbar { width: 8px }
.um-sheet ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 999px }

/* ===== Reduced motion ===== */
@media (prefers-reduced-motion: reduce){
  .um-sheet { animation: none !important }
}
</style>
