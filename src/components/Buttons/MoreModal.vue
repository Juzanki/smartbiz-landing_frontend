<!-- src/components/Buttons/MoreModal.vue -->
<template>
  <div class="inline-flex items-center">
    <!-- Kitufe: unaweza kukificha/kubadilisha -->
    <button
      type="button"
      class="px-3 py-2 rounded-full text-white bg-gradient-to-br from-slate-700 to-black
             border border-white/10 shadow active:scale-95 focus:outline-none focus:ring-2
             focus:ring-indigo-500/70"
      @click="open(defaultType)"
      aria-haspopup="dialog"
      :aria-expanded="String(show)"
    >
      ⋯ More
    </button>

    <!-- MODAL (self-contained; hakuna UniversalModal tena) -->
    <teleport to="body">
      <transition name="mm-fade">
        <div
          v-if="show"
          class="fixed inset-0"
          :style="{ zIndex: String(zIndex) }"
          role="dialog"
          :aria-modal="true"
          :aria-labelledby="headingId"
          @keydown.esc="onEsc"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/75 md:bg-black/60 backdrop-blur-sm"
            :aria-hidden="true"
            @click="close('backdrop')"
          />

          <!-- Sheet -->
          <section
            ref="sheet"
            class="mm-sheet fixed md:static bottom-0 md:bottom-auto inset-x-0 md:inset-auto
                   mx-auto w-full md:max-w-[min(56rem,92vw)]
                   text-zinc-100 md:rounded-3xl rounded-t-3xl overflow-hidden
                   border border-white/10 bg-[rgba(22,22,28,.92)] md:bg-[rgba(22,22,28,.92)]
                   shadow-[0_30px_80px_rgba(0,0,0,.55)] mm-border
                   pb-[env(safe-area-inset-bottom)]"
            :class="['max-h-[90vh] md:max-h-[86vh]', desktopCentered ? 'md:mt-16' : '']"
            @click.stop
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend.passive="onTouchEnd"
          >
            <!-- Header -->
            <header class="sticky top-0 z-10 backdrop-blur-md bg-white/8 border-b border-white/10">
              <div class="flex items-center justify-between px-4 pt-3 pb-3 md:px-6">
                <!-- drag handle (mobile) -->
                <div class="md:hidden absolute left-1/2 -translate-x-1/2 -top-1.5">
                  <div class="h-1.5 w-12 rounded-full bg-white/20" />
                </div>

                <h2 :id="headingId"
                    class="text-base md:text-xl font-extrabold text-indigo-300 flex items-center gap-2">
                  <span>{{ modalIcon }}</span>
                  <span class="capitalize">{{ resolvedTitle }}</span>
                  <span v-if="subtitle"
                        class="text-[11px] md:text-xs font-medium text-zinc-300/90 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {{ subtitle }}
                  </span>
                </h2>

                <div class="flex items-center gap-1">
                  <button class="icon-btn" :aria-label="'Close'" type="button" @click="close('button')">✖</button>
                </div>
              </div>
            </header>

            <!-- Content -->
            <main
              class="px-3 md:px-6 py-3 md:py-6 overflow-y-auto space-y-4
                     max-h-[calc(90vh-64px)] md:max-h-[calc(86vh-72px)]"
            >
              <component
                :is="panelMap[type] || FallbackPanel"
                ref="innerRef"
                v-bind="panelProps"
              />
            </main>

            <!-- Footer -->
            <footer class="px-3 md:px-6 pb-3 md:pb-5 pt-2 border-t border-white/10 bg-white/5 backdrop-blur-md">
              <div class="flex flex-wrap gap-2 justify-end">
                <button v-for="(btn, i) in footerButtons" :key="i"
                        type="button"
                        class="mm-btn"
                        :class="btn.kind || 'ghost'"
                        :disabled="btn.disabled"
                        @click="onAction(btn)">
                  <span v-if="btn.icon" class="mr-1.5">{{ btn.icon }}</span>{{ btn.label }}
                </button>
              </div>
            </footer>
          </section>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, h, nextTick } from 'vue'

/* ---------- Props / Emits ---------- */
type BuiltIn = 'settings'|'summary'|'poll'|'moderation'|'background'|'goals'|'rules'
type AnyType = BuiltIn | string

const props = withDefaults(defineProps<{
  initialType?: AnyType
  initialTitle?: string
  initialSubtitle?: string
  initialInnerProps?: Record<string, any>
  zIndex?: number
  desktopCentered?: boolean
}>(), {
  initialType: 'settings',
  initialTitle: '',
  initialSubtitle: '',
  initialInnerProps: () => ({}),
  zIndex: 70,
  desktopCentered: true
})

const emit = defineEmits<{
  (e:'save', payload:any): void
  (e:'close', reason:string): void
  (e:'open', payload:{ type: AnyType }): void
}>()

/* ---------- State ---------- */
const show = ref(false)
const type = ref<AnyType>(props.initialType)
const title = ref<string>(props.initialTitle)
const subtitle = ref<string>(props.initialSubtitle)
const panelProps = ref<Record<string, any>>({ ...props.initialInnerProps })

const defaultType = computed<AnyType>(() => props.initialType)
const desktopCentered = computed(() => props.desktopCentered)
const zIndex = computed(() => props.zIndex)

/* ---------- Titles / Icons ---------- */
const titleMap: Record<string,string> = {
  settings:'Stream Settings', summary:'Live Summary', poll:'Live Polls',
  moderation:'Moderation Tools', background:'Background Selector',
  goals:'Live Goals', rules:'Community Rules'
}
const iconMap: Record<string,string> = {
  settings:'⚙️', summary:'📊', poll:'🗳️', moderation:'🛡️', background:'🌅', goals:'🎯', rules:'📜'
}
const modalIcon = computed(() => iconMap[String(type.value)] || '🔧')
const resolvedTitle = computed(() => title.value || titleMap[String(type.value)] || 'Panel')
const headingId = `mm-title-${Math.random().toString(36).slice(2,8)}`

/* ---------- Open/Close API ---------- */
function open(t: AnyType = defaultType.value, inner:Record<string,any> = {}, opts?:{title?:string, subtitle?:string}){
  type.value = t
  panelProps.value = inner || {}
  title.value = opts?.title ?? ''
  subtitle.value = opts?.subtitle ?? ''
  show.value = true
  emit('open', { type: t })
  lockScroll(true)
  nextTick(() => focusTrapCollect())
}
function close(reason:'backdrop'|'button'|'esc'|'swipe'='button'){
  show.value = false
  lockScroll(false)
  emit('close', reason)
}
defineExpose({ open, close })

/* ---------- ESC ---------- */
function onEsc(){ if(show.value) close('esc') }

/* ---------- Scroll lock ---------- */
let prevOverflow = ''
function lockScroll(on:boolean){
  if (on){ prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
  else   { document.body.style.overflow = prevOverflow || '' }
}
onMounted(()=>{ window.addEventListener('keydown', keyListener) })
onBeforeUnmount(()=>{ window.removeEventListener('keydown', keyListener); lockScroll(false) })
function keyListener(e:KeyboardEvent){ if(e.key==='Escape') onEsc() }

/* ---------- Swipe-down (mobile) ---------- */
const sheet = ref<HTMLElement|null>(null)
let startY = 0, currentY = 0, dragging=false
function onTouchStart(e:TouchEvent){ startY = e.touches[0].clientY; dragging=true }
function onTouchMove(e:TouchEvent){
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

/* ---------- Panels (inline, render-function; hakuna template za ziada) ---------- */
const FallbackPanel = { render(){ return h('div',{class:'text-sm opacity-80'},'No content for this panel type.') } }

/* 1) Settings */
const SettingsPanel = {
  data(){ return { lowLatency:true, notifications:true, replay:false, autoPinTop:true, quality:'auto' as 'auto'|'720p'|'1080p' } },
  methods:{ getConfig(){ return { ...this.$data } } },
  render(){
    const Row=(lbl:string,key:string)=>h('label',{class:'flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 mb-2'},
      [h('span',{class:'text-sm'},lbl),
       h('input',{type:'checkbox',checked:(this as any)[key],onInput:(e:any)=>((this as any)[key]=e.target.checked),class:'accent-indigo-500'})])
    const Qual = ['auto','720p','1080p'].map(q =>
      h('label',{class:'px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[13px] cursor-pointer'},
        [h('input',{type:'radio',name:'quality',checked:(this as any).quality===q,onInput:()=>((this as any).quality=q),class:'mr-1 accent-indigo-500'}),q]))
    return h('div',{class:'space-y-3'},[
      Row('Low-latency mode','lowLatency'),
      Row('Enable notifications','notifications'),
      Row('Record replay (beta)','replay'),
      Row('Auto-pin top comment','autoPinTop'),
      h('div',{class:'bg-white/5 border border-white/10 rounded-xl p-3'},[
        h('div',{class:'text-sm mb-1 font-semibold text-indigo-300'},'Video Quality'),
        h('div',{class:'flex gap-2'}, Qual)
      ])
    ])
  }
}

/* 2) Summary */
const SummaryPanel = {
  props:{ stats:Object },
  methods:{ getConfig(){ return (this as any).stats || {} } },
  render(){
    const s:any = (this as any).stats || { viewers: 1240, likes: 8900, gifts: 42, duration: '01:23:12' }
    const Item=(k:string,v:any)=>h('div',{class:'px-3 py-2 bg-white/5 border border-white/10 rounded-xl'},[
      h('div',{class:'text-[11px] opacity-80'},k), h('div',{class:'text-lg font-extrabold'},String(v)) ])
    return h('div',{class:'grid grid-cols-2 sm:grid-cols-4 gap-2'},[
      Item('Viewers',s.viewers), Item('Likes',s.likes), Item('Gifts',s.gifts), Item('Duration',s.duration)
    ])
  }
}

/* 3) Poll */
const PollPanel = {
  data(){ return { question:'Which topic next?', options:['A','B','C'] as string[] } },
  methods:{
    add(){ (this as any).options.push('') }, del(i:number){ (this as any).options.splice(i,1) },
    getConfig(){ const d:any=this; return { question:d.question, options:d.options.filter(Boolean) } }
  },
  render(){
    const d:any=this
    const Opt = d.options.map((v:string,i:number)=>
      h('div',{class:'flex items-center gap-2 mb-2'},[
        h('input',{class:'flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm',
          value:v,onInput:(e:any)=>d.options[i]=e.target.value,placeholder:`Option #${i+1}`}),
        h('button',{class:'icon-btn',onClick:()=>d.del(i)},'✖')
      ]))
    return h('div',{class:'space-y-3'},[
      h('input',{class:'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2',
        value:d.question,onInput:(e:any)=>d.question=e.target.value,placeholder:'Poll question…'}),
      ...Opt,
      h('button',{class:'mm-btn ghost',onClick:d.add},'➕ Add Option')
    ])
  }
}

/* 4) Moderation */
const ModerationPanel = {
  data(){ return { micMuted:false, dataSaver:false, profanity:true, blockLinks:true, rateLimit:true, nsfw:true } },
  methods:{ getConfig(){ return { ...this.$data } } },
  render(){
    const Row=(lbl:string,key:string)=>h('label',{class:'flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 mb-2'},
      [h('span',{class:'text-sm'},lbl),
       h('input',{type:'checkbox',checked:(this as any)[key],onInput:(e:any)=>((this as any)[key]=e.target.checked),class:'accent-indigo-500'})])
    return h('div',{class:'space-y-1'},[
      Row('Mic muted','micMuted'), Row('Data saver','dataSaver'),
      h('div',{class:'text-xs opacity-80 mt-2 mb-1 font-semibold'},'Auto enforcement'),
      Row('Profanity filter','profanity'), Row('Block unknown links','blockLinks'),
      Row('Rate-limit spam','rateLimit'), Row('Filter NSFW','nsfw')
    ])
  }
}

/* 5) Background */
const BackgroundPanel = {
  data(){ return { type:'gradient' as 'gradient'|'image', gradient:'bg-gradient-to-br from-indigo-700/50 via-purple-700/40 to-pink-600/50', image:'' } },
  methods:{ getConfig(){ return { ...this.$data } } },
  render(){
    const d:any=this
    const Chip=(label:string,val:string)=>h('button',{class:'px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-sm',
      onClick:()=>d.gradient=val},label)
    return h('div',{class:'space-y-3'},[
      h('div',null,[
        h('label',{class:'mr-3 text-sm'},[h('input',{type:'radio',name:'btype',checked:d.type==='gradient',onInput:()=>d.type='gradient',class:'mr-1 accent-indigo-500'}),'Gradient']),
        h('label',{class:'text-sm'},[h('input',{type:'radio',name:'btype',checked:d.type==='image',onInput:()=>d.type='image',class:'mr-1 accent-indigo-500'}),'Image'])
      ]),
      d.type==='gradient'
        ? h('div',{class:'flex gap-2 flex-wrap'},[
            Chip('Indigo/Purple','bg-gradient-to-br from-indigo-700/50 via-purple-700/40 to-pink-600/50'),
            Chip('Blue/Cyan','bg-gradient-to-br from-blue-700/50 via-cyan-600/40 to-teal-600/50'),
            Chip('Sunset','bg-gradient-to-br from-amber-600/50 via-orange-600/40 to-rose-600/50')
          ])
        : h('input',{class:'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2',
            value:d.image,onInput:(e:any)=>d.image=e.target.value,placeholder:'https://image.url'})
    ])
  }
}

/* 6) Goals */
const GoalPanel = {
  data(){ return { goal:'' } },
  methods:{ getConfig(){ return { goal:(this as any).goal } } },
  render(){
    const d:any=this
    return h('div',{class:'space-y-2'},[
      h('input',{class:'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2',
        value:d.goal,onInput:(e:any)=>d.goal=e.target.value,placeholder:'Describe your live goal…'}),
      h('p',{class:'text-[11px] opacity-80'},'Mfano: “Tufikie likes 10k” au “Tukusanye coins 500 ndani ya dakika 30”.')
    ])
  }
}

/* 7) Rules */
const RulesPanel = {
  data(){ return {
    allow:{ respect:true, kindness:true, topicOnly:true },
    forbid:{ hate:true, harassment:true, nudity:true, illegal:true, spam:true, doxxing:true },
    enforce:{ autoMuteProfanity:true, blockLinks:true, rateLimit:true, filterNSFW:true },
    agreed:false
  }},
  methods:{ getConfig(){ return { ...this.$data, version:1 } } },
  render(){
    const L=(label:string, model:any, key:string)=>
      h('label',{class:'flex items-center gap-2 py-1.5'},
        [h('input',{type:'checkbox',checked:model[key],onInput:(e:any)=>model[key]=e.target.checked,class:'accent-indigo-500'}),h('span',null,label)])
    const d:any=this
    return h('div',{class:'text-sm leading-relaxed space-y-6'},[
      h('section',{class:'space-y-2'},[
        h('h3',{class:'font-bold text-indigo-300 text-base'},['✅ Vitu vinavyoruhusiwa']),
        L('Heshima na lugha ya staha', d.allow,'respect'),
        L('Ukarimu na kusaidiana', d.allow,'kindness'),
        L('Kufuata mada ya kikao', d.allow,'topicOnly'),
      ]),
      h('section',{class:'space-y-2'},[
        h('h3',{class:'font-bold text-rose-300 text-base'},['⛔ Visivyoruhusiwa']),
        L('Matamshi ya chuki / ubaguzi', d.forbid,'hate'),
        L('Matusi / unyanyasaji / vitisho', d.forbid,'harassment'),
        L('Ngono wazi / ponografia', d.forbid,'nudity'),
        L('Kuvunja sheria / uhalifu', d.forbid,'illegal'),
        L('Spam / links hatarishi', d.forbid,'spam'),
        L('Kufichua taarifa binafsi (doxxing)', d.forbid,'doxxing'),
      ]),
      h('section',{class:'space-y-2'},[
        h('h3',{class:'font-bold text-amber-300 text-base'},['🛡️ Utekelezaji otomatiki']),
        L('Auto-mute matusi', d.enforce,'autoMuteProfanity'),
        L('Zuia links zisizoidhinishwa', d.enforce,'blockLinks'),
        L('Rate-limit ujumbe wa haraka', d.enforce,'rateLimit'),
        L('Kagua/zuia NSFW', d.enforce,'filterNSFW'),
      ]),
      h('label',{class:'flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3'},
        [h('input',{type:'checkbox',checked:d.agreed,onInput:(e:any)=>d.agreed=e.target.checked,class:'accent-emerald-500'}),
         h('span',null,'Ninakubali Sheria za Jumuiya na utekelezaji wake.')]),
      h('p',{class:'text-[11px] opacity-80'},'Ukiukaji unaweza kusababisha onyo, mute, kuondolewa hewani au kuripoti kulingana na uzito.')
    ])
  }
}

/* Map ya paneli */
const panelMap: Record<string, any> = {
  settings: SettingsPanel,
  summary:  SummaryPanel,
  poll:     PollPanel,
  moderation: ModerationPanel,
  background: BackgroundPanel,
  goals:    GoalPanel,
  rules:    RulesPanel
}

/* ---------- Footer buttons ---------- */
type Btn = { label:string; action:'save'|'close'; kind?:'primary'|'danger'|'ghost'; icon?:string; disabled?:boolean }
const innerRef = ref<any>(null)
const footerButtons = computed<Btn[]>(() => {
  const baseClose:Btn={ label:'Close', action:'close', kind:'ghost' }
  const save:Btn={ label:'Save', action:'save', kind:'primary', icon:'💾' }
  if (type.value === 'rules'){
    const agreed = !!innerRef.value?.getConfig?.().agreed
    return [ { ...save, label:'Save Rules', icon:'✅', disabled: !agreed }, baseClose ]
  }
  if (type.value === 'background') return [ { ...save, label:'Apply', icon:'🌅' }, baseClose ]
  if (type.value === 'moderation') return [ { ...save, label:'Apply', icon:'🛡️' }, baseClose ]
  if (type.value === 'goals') return [ { ...save, label:'Save Goal', icon:'🎯' }, baseClose ]
  if (type.value === 'poll') return [ { ...save, label:'Start / Update', icon:'🗳️' }, baseClose ]
  return [ save, baseClose ]
})
function onAction(btn:Btn){
  if (btn.action==='close') return close('button')
  if (btn.action==='save'){
    const payload = innerRef.value?.getConfig?.() ?? {}
    emit('save', { type: type.value, payload })
    close('button')
  }
}

/* ---------- Focus trap kidogo ---------- */
let focusables:HTMLElement[]=[]
function focusTrapCollect(){
  const root = sheet.value
  if(!root) return
  focusables = Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
}
</script>

<style scoped>
/* Fade */
.mm-fade-enter-active, .mm-fade-leave-active { transition: opacity .22s ease; }
.mm-fade-enter-from, .mm-fade-leave-to { opacity: 0; }

/* Entrances */
.mm-sheet { transform: translateY(0); animation: mm-up .28s cubic-bezier(.22,1,.36,1) both; }
@keyframes mm-up { from{ transform: translateY(24px); opacity:.98 } to{ transform: translateY(0); opacity:1 } }

/* Border sheen */
.mm-border{ position: relative; }
.mm-border::before{
  content:''; position:absolute; inset:0; pointer-events:none; border-radius:inherit;
  background: linear-gradient(120deg, rgba(255,255,255,.18), rgba(255,255,255,.06));
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  padding:1px; border-radius:inherit;
}

/* Buttons */
.mm-btn{
  --bg: rgba(255,255,255,.08);
  --bd: rgba(255,255,255,.18);
  --fg: #fff;
  padding: .5rem .9rem; border-radius: 9999px;
  border: 1px solid var(--bd); background: var(--bg); color: var(--fg);
  font-weight: 700; font-size: .875rem; backdrop-filter: blur(10px);
  transition: transform .16s ease, background .16s ease, box-shadow .16s ease, filter .16s ease;
}
.mm-btn:hover{ transform: translateY(-1px) }
.mm-btn:disabled{ opacity:.55; cursor: not-allowed }
.mm-btn.primary{ --bg: linear-gradient(180deg, rgba(99,102,241,.4), rgba(99,102,241,.22)); --bd: rgba(99,102,241,.45) }
.mm-btn.danger{ --bg: linear-gradient(180deg, rgba(239,68,68,.42), rgba(239,68,68,.22)); --bd: rgba(239,68,68,.45) }
.mm-btn.ghost{ --bg: rgba(255,255,255,.08); --bd: rgba(255,255,255,.18) }
.icon-btn{
  border: 1px solid rgba(255,255,255,.2);
  background: rgba(255,255,255,.08);
  border-radius: 9999px; padding:.35rem .6rem; line-height:1; color:#fff;
  transition: transform .15s ease, background .15s ease;
}
.icon-btn:hover{ transform: translateY(-1px) }

/* Scrollbars */
.mm-sheet ::-webkit-scrollbar { width: 8px }
.mm-sheet ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 999px }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .mm-sheet { animation: none !important }
}
</style>
