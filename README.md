# Telegram Motion Lab

一个受 Telegram 交互体验启发的**独立实现**的丝滑动画实验项目。

- Vue 3 + Vite 7 + TypeScript
- 消息从编辑框飞入、会话页面转场、右键上下文菜单、表情反馈、滑动回复、按压反馈
- Telegram / 柔和 / 灵敏 / 回弹四种缓动、时长控制、减少动画、低功耗模式
- 手机和桌面布局适配；不需要 Telegram 登录、账号或 API

> 仅研究与演示动效，不隶属于 Telegram，也不包含官方客户端代码。

## 本地运行

Node.js 20.19+ 或 22.12+：

```bash
npm install
npm run dev
```

浏览器访问终端显示的地址（通常是 http://localhost:5173）。

```bash
npm run typecheck
npm run build
npm run preview
```

## 试验交互

1. 发送消息：输入文本后按 Enter，或点击发送按钮。
2. 页面转场：点击左侧聊天会话。
3. 上下文菜单：右键消息，或触摸长按。
4. 表情反馈：从消息菜单选择表情。
5. 手势回复：向右拖动消息气泡超过约 55 px。
6. 微交互：试试按键、按钮与工具栏。

右侧调校区可以实时调整曲线和时长。按 Esc 可关闭菜单；Ctrl/Cmd+K 可聚焦搜索。

## 设计原理

- 动画内容尽量使用 transform/opacity，避免每帧布局
- Web Animations API 对 DOM 状态进行合成
- 使用元素的实际 DOMRect 作为飞入动画的起终点
- 页面 transition 实现插入/移除动画
- Pointer Events 负责跟手滑动，再通过物理感缓动回到终点
- 响应 `prefers-reduced-motion`；为低性能设备提供开关

源码核心在 `src/App.vue`、`src/motion.ts` 和 `src/style.css`。

## 开源许可

MIT License。