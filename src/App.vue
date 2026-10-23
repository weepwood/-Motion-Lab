<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { flyText, motionPresets, systemReducedMotion, type MotionPreset } from './motion'

type Message = { id: number; text: string; time: string; mine: boolean; reaction?: string }
type Chat = { id: number; name: string; handle: string; avatar: string; color: string; preview: string; time: string; online?: boolean }
const chats: Chat[] = [
  {id:1,name:'Motion Design',handle:'动效研究小组',avatar:'✦',color:'#2d90b5',preview:'丝滑感来自细节和反馈',time:'现在',online:true},
  {id:2,name:'Alex Chen',handle:'设计师 · 在线',avatar:'AC',color:'#a174ce',preview:'你试过这个动画曲线吗？',time:'14:28',online:true},
  {id:3,name:'Product Team',handle:'产品讨论',avatar:'PT',color:'#4b9476',preview:'新的视觉稿已经准备好了',time:'昨天'},
  {id:4,name:'Motion Notes',handle:'我的收藏',avatar:'◇',color:'#c08b5a',preview:'Spring 和 Easing 的区别',time:'周三'},
  {id:5,name:'UI Inspiration',handle:'设计灵感',avatar:'UI',color:'#7989d4',preview:'试试看共享元素转场',time:'周二'}
]
const data = reactive<Record<number, Message[]>>({
  1: [
    {id:11,text:'欢迎来到 Motion Lab！这里是 Telegram 风格的微交互实验室。',time:'14:20',mine:false},
    {id:12,text:'我想研究一下，为什么 Telegram 的动画看起来这么自然？',time:'14:21',mine:true},
    {id:13,text:'秘诀不只是缓动曲线，更是连续的反馈、可中断的状态和精确的时间安排。',time:'14:22',mine:false},
    {id:14,text:'试试发送消息、切换会话、长按气泡和向右滑动回复。',time:'14:23',mine:false,reaction:'✨'},
    {id:15,text:'这就是我想要的丝滑感！',time:'14:24',mine:true,reaction:'💙'}
  ],
  2: [
    {id:21,text:'嗨！刚研究了几组不错的缓动参数。',time:'14:25',mine:false},
    {id:22,text:'cubic-bezier(.23, 1, .32, 1) 在快速界面过渡中效果很好。',time:'14:26',mine:false},
    {id:23,text:'我去试试。',time:'14:28',mine:true}
  ],
  3: [{id:31,text:'页面切换应该保持上下文，而不是突然跳到新界面。',time:'11:10',mine:false},{id:32,text:'同意，我们先实现高质量的基础动画。',time:'11:12',mine:true}],
  4: [{id:41,text:'动效原则：及时、连续、克制、可预测。',time:'09:40',mine:false}],
  5: [{id:51,text:'越快的响应，不代表越短的每一个动画。',time:'08:30',mine:false}]
})
const activeId = ref(1)
const activeChat = computed(() => chats.find(c => c.id === activeId.value) ?? chats[0]!)
const messages = computed(() => data[activeId.value] ?? [])
const query = ref('')
const filtered = computed(() => chats.filter(c => (c.name + c.handle + c.preview).toLowerCase().includes(query.value.toLowerCase())))
const text = ref('')
const preset = ref<MotionPreset>('telegram')
const duration = ref(320)
const reduce = ref(false)
const lowPower = ref(false)
const osReduced = ref(false)
const compact = ref(false)
const mobileChats = ref(false)
const showEmoji = ref(false)
const showAbout = ref(false)
const reply = ref<Message | null>(null)
const pending = reactive(new Set<number>())
const activeDemo = ref('send')
const composer = ref<HTMLTextAreaElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const menu = ref<{ id: number; x: number; y: number } | null>(null)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
let nextId = 100
let media: MediaQueryList | undefined
let touchTimer: ReturnType<typeof setTimeout> | undefined
let swipe: { id: number; pointer: number; x: number; y: number; dx: number; el: HTMLElement } | null = null
const easing = computed(() => motionPresets[preset.value].ease)
const reduced = computed(() => reduce.value || osReduced.value)
const ms = computed(() => reduced.value ? 0 : lowPower.value ? Math.round(duration.value * .6) : duration.value)
const vars = computed(() => ({ '--duration': ms.value + 'ms', '--fast': Math.round(ms.value * .62) + 'ms', '--ease': easing.value }))
const now = () => new Intl.DateTimeFormat('zh-CN', { hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date())
function notice(value: string) {
  toast.value = value
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.value = '', 2400)
}
function scrollBottom() {
  const el = scrollEl.value
  if (el) el.scrollTop = el.scrollHeight
}
function changeChat(id: number) {
  if (id === activeId.value) return
  activeId.value = id
  mobileChats.value = false
  menu.value = null
  showEmoji.value = false
  reply.value = null
  activeDemo.value = 'page'
  void nextTick(scrollBottom)
}
async function send(forced?: string) {
  const content = (forced ?? text.value).trim()
  if (!content) { composer.value?.focus(); return }
  const from = composer.value?.getBoundingClientRect()
  const chatId = activeId.value
  const id = ++nextId
  if (!forced) text.value = ''
  showEmoji.value = false
  reply.value = null
  if (ms.value && from) pending.add(id)
  data[chatId]?.push({ id, text: content, time: now(), mine: true })
  await nextTick()
  scrollBottom()
  await nextTick()
  const target = document.querySelector<HTMLElement>('.bubble[data-mid="' + id + '"]')
  try {
    if (from && target && ms.value && chatId === activeId.value) {
      await flyText(content, from, target.getBoundingClientRect(), ms.value, easing.value)
    }
  } finally {
    pending.delete(id)
  }
  activeDemo.value = 'send'
}
function onComposerKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    void send()
  }
}
function openMenuByRect(id: number, r: DOMRect) {
  const w = 220, h = 204
  menu.value = { id, x: Math.max(14, Math.min(window.innerWidth - w - 14, r.right - w + 18)), y: Math.max(14, Math.min(window.innerHeight - h - 14, r.top + 8)) }
  activeDemo.value = 'popover'
}
function openMenu(e: Event, m: Message) {
  e.preventDefault()
  e.stopPropagation()
  const bubble = (e.currentTarget as HTMLElement).closest('.bubble')
  if (bubble) openMenuByRect(m.id, bubble.getBoundingClientRect())
}
function lastMenu() {
  const last = messages.value[messages.value.length - 1]
  if (!last) return
  const el = document.querySelector<HTMLElement>('.bubble[data-mid="' + last.id + '"]')
  if (el) openMenuByRect(last.id, el.getBoundingClientRect())
}
function addReaction(m: Message, emoji = '💙') {
  m.reaction = m.reaction === emoji ? undefined : emoji
  menu.value = null
  activeDemo.value = 'reaction'
  void nextTick(() => {
    const node = document.querySelector<HTMLElement>('.bubble[data-mid="' + m.id + '"] .reaction-chip')
    if (node && ms.value) {
      node.animate([{transform:'scale(.5)',opacity:.1},{transform:'scale(1.25)',opacity:1,offset:.64},{transform:'scale(1)',opacity:1}], {duration:ms.value,easing:easing.value})
      if (!lowPower.value) {
        const box = node.getBoundingClientRect()
        for (let i = 0; i < 4; i++) {
          const particle = document.createElement('span')
          particle.className = 'particle'
          particle.textContent = emoji
          particle.style.left = box.left + box.width / 2 + 'px'
          particle.style.top = box.top + 'px'
          document.body.append(particle)
          void particle.animate([{transform:'translate(0,0) scale(.4)',opacity:1},{transform:'translate(' + ((i - 1.5) * 29) + 'px,-48px) scale(1)',opacity:0}], {duration:480,easing:'ease-out'}).finished.catch(() => {}).finally(() => particle.remove())
        }
      }
    }
  })
}
function doMenu(kind: 'copy' | 'reply' | 'react', emoji?: string) {
  const id = menu.value?.id
  menu.value = null
  const m = messages.value.find(m => m.id === id)
  if (!m) return
  if (kind === 'react') addReaction(m, emoji)
  if (kind === 'reply') { reply.value = m; composer.value?.focus() }
  if (kind === 'copy') {
    void navigator.clipboard.writeText(m.text).then(() => notice('已复制到剪贴板')).catch(() => notice('浏览器不允许复制'))
  }
}
function lastReact() {
  const last = messages.value[messages.value.length - 1]
  if (last) addReaction(last, last.reaction === '💙' ? '✨' : '💙')
}
function startSwipe(e: PointerEvent, m: Message) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
  const el = e.currentTarget as HTMLElement
  swipe = { id:m.id, pointer:e.pointerId, x:e.clientX, y:e.clientY, dx:0, el }
  if (touchTimer) clearTimeout(touchTimer)
  if (e.pointerType !== 'mouse') touchTimer = setTimeout(() => { if (swipe?.id === m.id && swipe.dx < 8) { openMenuByRect(m.id, el.getBoundingClientRect()); swipe = null } }, 570)
}
function moveSwipe(e: PointerEvent) {
  if (!swipe || swipe.pointer !== e.pointerId) return
  const dx = e.clientX - swipe.x
  const dy = e.clientY - swipe.y
  if (Math.abs(dx) > 9 || Math.abs(dy) > 9) { if (touchTimer) clearTimeout(touchTimer) }
  if (Math.abs(dx) > Math.abs(dy) && dx > 0) {
    swipe.dx = Math.min(dx, 95)
    swipe.el.style.transition = 'none'
    swipe.el.style.transform = 'translate3d(' + swipe.dx + 'px,0,0)'
  }
}
function endSwipe(e: PointerEvent, m: Message) {
  if (touchTimer) clearTimeout(touchTimer)
  if (!swipe || swipe.id !== m.id || swipe.pointer !== e.pointerId) return
  const s = swipe
  swipe = null
  s.el.style.transition = 'transform var(--duration) var(--ease)'
  s.el.style.transform = ''
  if (s.dx > 55) {
    reply.value = m
    activeDemo.value = 'swipe'
    notice('已选择回复消息')
    composer.value?.focus()
  }
}
function runDemo(key: string) {
  activeDemo.value = key
  if (key === 'send') void send('消息动画：从输入框到聊天气泡 ✨')
  else if (key === 'page') changeChat(activeId.value === 1 ? 2 : 1)
  else if (key === 'popover') lastMenu()
  else if (key === 'reaction') lastReact()
  else if (key === 'swipe') {
    const m = messages.value[messages.value.length - 1]
    if (m) { reply.value = m; composer.value?.focus(); notice('也可以右滑任意消息回复') }
  }
  else if (key === 'micro') { notice('这是一个轻量微交互反馈 ✨'); compact.value = !compact.value }
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { menu.value = null; showEmoji.value = false; showAbout.value = false }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); mobileChats.value = true; searchInput.value?.focus() }
}
const onMediaChange = (e: MediaQueryListEvent) => { osReduced.value = e.matches }
onMounted(() => {
  media = matchMedia('(prefers-reduced-motion: reduce)')
  osReduced.value = systemReducedMotion()
  media.addEventListener('change', onMediaChange)
  document.addEventListener('keydown', onKey)
  nextTick(scrollBottom)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  media?.removeEventListener('change', onMediaChange)
  if (touchTimer) clearTimeout(touchTimer)
  if (toastTimer) clearTimeout(toastTimer)
})
const demos = [
  {key:'send',icon:'↗',title:'消息飞入',desc:'输入框 → 气泡'},
  {key:'page',icon:'⇄',title:'页面转场',desc:'连续切换'},
  {key:'popover',icon:'▣',title:'弹出菜单',desc:'锚点缩放'},
  {key:'reaction',icon:'♡',title:'表情反馈',desc:'弹性微交互'},
  {key:'swipe',icon:'⇢',title:'手势回复',desc:'跟手与回弹'},
  {key:'micro',icon:'✳',title:'微交互',desc:'即时状态反馈'}
]
</script>

<template>
  <div ref="stageRef" class="app-shell" :class="{ compact, 'reduce-animations': reduced }" :style="vars">
    <div class="ambient ambient-a"></div><div class="ambient ambient-b"></div>
    <div class="app-frame">
      <header class="topbar">
        <div class="topbar-left">
          <span class="brand-symbol">✳</span>
          <div class="brand-title"><strong>Motion Lab</strong><span class="brand-caption">TELEGRAM INSPIRED INTERACTIONS</span></div>
          <span class="version">v1.0</span>
        </div>
        <div class="topbar-right">
          <span class="topbar-status"><i class="status-light"></i> 运行中 · LIVE PREVIEW</span>
          <button class="icon-btn help-btn" title="关于此项目" @click="showAbout = true">ⓘ</button>
          <span class="top-avatar">W</span>
        </div>
      </header>
      <div class="workspace">
        <aside class="sidebar" :class="{ 'mobile-open': mobileChats }">
          <div class="side-heading"><span>会话</span><span class="count">{{ chats.length }} CHATS</span></div>
          <label class="search"><span>⌕</span><input ref="searchInput" v-model="query" type="search" placeholder="搜索会话 · Ctrl K" aria-label="搜索会话" /><kbd>⌘K</kbd></label>
          <div class="section-label">RECENT CONVERSATIONS</div>
          <nav class="chat-list" aria-label="聊天会话">
            <button v-for="chat in filtered" :key="chat.id" class="chat-entry" :class="{ selected: chat.id === activeId }" @click="changeChat(chat.id)">
              <span class="avatar" :style="{ background: chat.color }">{{ chat.avatar }}</span>
              <span class="chat-info"><span class="chat-line"><b>{{ chat.name }}</b><small>{{ chat.time }}</small></span><span class="chat-preview">{{ chat.preview }}</span></span>
            </button>
          </nav>
          <div class="side-footer"><span class="side-footer-icon">✦</span><span>Micro-interactions make the difference.</span></div>
        </aside>

        <section class="conversation" aria-label="聊天动效演示">
          <div class="conversation-head">
            <button class="icon-btn mobile-back" aria-label="打开会话列表" @click="mobileChats = !mobileChats">☰</button>
            <span class="avatar header-avatar" :style="{ background: activeChat.color }">{{ activeChat.avatar }}</span>
            <div class="head-info"><strong>{{ activeChat.name }}</strong><span>{{ activeChat.handle }}</span></div>
            <span class="head-online" v-if="activeChat.online">● 在线</span>
            <div class="head-spacer"></div>
            <button class="icon-btn" title="搜索" @click="notice('搜索演示：左侧可检索会话')">⌕</button>
            <button class="icon-btn" title="聊天菜单" @click="lastMenu">⋮</button>
          </div>
          <div class="chat-wall">
            <Transition name="chat-swap" mode="out-in">
              <div :key="activeId" ref="scrollEl" class="message-scroll">
                <div class="day-label"><span>今天</span></div>
                <div v-for="m in messages" :key="m.id" class="message-row" :class="{ mine:m.mine, incoming:!m.mine }">
                  <div v-if="!m.mine" class="mini-avatar" :style="{ background: activeChat.color }">{{ activeChat.avatar }}</div>
                  <div class="bubble" :class="{ 'is-pending': pending.has(m.id) }" :data-mid="m.id" @contextmenu="openMenu($event, m)" @pointerdown="startSwipe($event as PointerEvent, m)" @pointermove="moveSwipe($event as PointerEvent)" @pointerup="endSwipe($event as PointerEvent, m)" @pointercancel="endSwipe($event as PointerEvent, m)">
                    <span class="bubble-text">{{ m.text }}</span>
                    <span class="bubble-bottom"><span>{{ m.time }}</span><span v-if="m.mine" class="read-icon">✓✓</span></span>
                    <button v-if="m.reaction" class="reaction-chip" :aria-label="'反应 '+m.reaction" @click="addReaction(m, m.reaction)">{{ m.reaction }}</button>
                  </div>
                  <button class="message-more" title="更多选项" @click="openMenu($event, m)">⋮</button>
                </div>
              </div>
            </Transition>
          </div>
          <div class="composer-zone">
            <Transition name="fade-up">
              <div v-if="reply" class="reply-preview"><span class="reply-mark"></span><div><b>回复消息</b><span>{{ reply.text }}</span></div><button class="icon-btn" @click="reply = null">×</button></div>
            </Transition>
            <Transition name="fade-up"><div v-if="showEmoji" class="emoji-picker"><button v-for="e in ['😀','💙','🔥','✨','🎉','👍','🤔','😍','🚀']" :key="e" @click="text += e; showEmoji = false; composer?.focus()">{{ e }}</button></div></Transition>
            <div class="composer">
              <button class="icon-btn attachment" title="插入演示表情" @click="showEmoji = !showEmoji">＋</button>
              <textarea ref="composer" v-model="text" rows="1" placeholder="输入消息，体验丝滑的发送动画..." aria-label="消息内容" @keydown="onComposerKey"></textarea>
              <button class="icon-btn emoji-toggle" title="表情" @click="showEmoji = !showEmoji">☺</button>
              <button class="send-btn" title="发送" :disabled="!text.trim()" @click="send()">➤</button>
            </div>
            <span class="composer-note">Enter 发送 · Shift + Enter 换行 · 右键消息打开菜单</span>
          </div>
        </section>

        <aside class="inspector">
          <div class="inspector-heading"><span>动画实验室</span><span class="inspector-pill">INTERACTIVE</span></div>
          <div class="inspector-intro">精细调节动效参数，感受不同缓动、时长与交互反馈。</div>
          <div class="inspector-section"><span class="section-label">INTERACTION DEMOS</span>
            <div class="demo-grid">
              <button v-for="d in demos" :key="d.key" class="demo-tile" :class="{ active:activeDemo === d.key }" @click="runDemo(d.key)"><span class="demo-icon">{{ d.icon }}</span><strong>{{ d.title }}</strong><small>{{ d.desc }}</small></button>
            </div>
          </div>
          <div class="inspector-section settings-section">
            <div class="section-title"><span>动效参数</span><span class="section-gear">⚙</span></div>
            <label class="field-label">缓动曲线 <span>{{ motionPresets[preset].label }}</span></label>
            <div class="preset-options"><button v-for="(option,key) in motionPresets" :key="key" :class="{ chosen:preset === key }" @click="preset = key">{{ option.label }}</button></div>
            <div class="curve-box">
              <svg viewBox="0 0 260 102" preserveAspectRatio="none" aria-label="缓动曲线示意">
                <path d="M 12 90 L 248 12" stroke="#637b94" stroke-dasharray="3 5" fill="none" opacity=".5"/>
                <path d="M12 90 C 52 20, 80 12, 248 12" stroke="#43c5eb" stroke-width="3" fill="none" stroke-linecap="round"/>
                <circle cx="248" cy="12" r="4" fill="#43c5eb"/>
              </svg>
              <span>{{ motionPresets[preset].description }}</span>
            </div>
            <label class="field-label duration-label" for="speed">动画时长 <span>{{ duration }} ms</span></label>
            <input id="speed" v-model.number="duration" class="range-input" type="range" min="120" max="650" step="10"/>
            <div class="range-labels"><span>120 ms · 快速</span><span>650 ms · 柔和</span></div>
            <label class="toggle-line"><span><b>减少动态效果</b><small>关闭非必要运动</small></span><input v-model="reduce" type="checkbox" role="switch"/><span class="toggle-track"></span></label>
            <label class="toggle-line"><span><b>低功耗模式</b><small>缩短动画、减少粒子</small></span><input v-model="lowPower" type="checkbox" role="switch"/><span class="toggle-track"></span></label>
          </div>
          <div class="inspector-bottom"><div><span>●</span> {{ reduced ? '减少动态效果' : '动效引擎已启用' }}</div><small>WAAPI · CSS TRANSFORM · VUE 3</small></div>
        </aside>
      </div>
      <footer class="statusbar"><span><i class="status-light"></i> UI Motion Playground</span><span>基于 Telegram 交互理念独立制作</span><span>Vue 3 / TypeScript</span></footer>
    </div>

    <div v-if="menu" class="menu-overlay" @click="menu = null" @contextmenu.prevent="menu = null">
      <div class="context-menu" :style="{ left:menu.x+'px', top:menu.y+'px' }" role="menu" @click.stop>
        <div class="quick-reactions"><button v-for="e in ['👍','❤️','😂','🔥','✨','💙']" :key="e" :title="'回应 '+e" @click="doMenu('react',e)">{{ e }}</button></div>
        <div class="menu-separator"></div>
        <button @click="doMenu('reply')"><span>↩</span> 回复消息</button>
        <button @click="doMenu('copy')"><span>▣</span> 复制文本</button>
        <button @click="doMenu('react','💙')"><span>♡</span> 快速点赞</button>
      </div>
    </div>
    <div v-if="showAbout" class="modal-overlay" @click="showAbout=false"><div class="about-modal" @click.stop><button class="modal-close" @click="showAbout=false">×</button><span class="brand-symbol">✳</span><h2>Telegram Motion Lab</h2><p>独立制作的动效实验室，展示真实的发送、切换、菜单、表情与手势交互。此项目不属于 Telegram 官方。</p><div class="about-badges"><span>Vue 3</span><span>TypeScript</span><span>WAAPI</span><span>Vite 7</span></div><button class="about-done" @click="showAbout=false">继续体验</button></div></div>
    <Transition name="toast"><div v-if="toast" class="toast-msg">{{ toast }}</div></Transition>
  </div>
</template>
