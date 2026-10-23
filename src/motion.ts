export type MotionPreset = 'telegram' | 'soft' | 'snappy' | 'spring'

export const motionPresets: Record<MotionPreset, { label: string; ease: string; description: string }> = {
  telegram: { label: 'Telegram', ease: 'cubic-bezier(.23,1,.32,1)', description: '快速响应，柔和减速' },
  soft: { label: '柔和', ease: 'cubic-bezier(.25,.1,.25,1)', description: '舒适的自然过渡' },
  snappy: { label: '灵敏', ease: 'cubic-bezier(.16,1,.3,1)', description: '更高的响应速度' },
  spring: { label: '回弹', ease: 'cubic-bezier(.34,1.56,.64,1)', description: '轻微弹性过冲' }
}

const active = new WeakMap<HTMLElement, Animation>()
export function playInterruptible(element: HTMLElement, frames: Keyframe[], duration: number, easing: string) {
  // Read the displayed state before cancelling: restarting cannot jump to the old initial frame.
  const computed = getComputedStyle(element)
  const previous = { transform: computed.transform, opacity: computed.opacity }
  active.get(element)?.cancel()
  if (duration <= 0) return
  const animation = element.animate(
    frames.map((frame, index) => index === 0
      ? { ...frame, transform: previous.transform === 'none' ? (frame.transform ?? 'none') : previous.transform, opacity: Number(previous.opacity) }
      : frame),
    { duration, easing, fill: 'none' }
  )
  active.set(element, animation)
  void animation.finished.catch(() => {}).finally(() => {
    if (active.get(element) === animation) active.delete(element)
  })
  return animation
}

export async function flyText(
  text: string, from: DOMRect, to: DOMRect, duration: number, ease: string
): Promise<void> {
  if (duration <= 0) return
  const ghost = document.createElement('div')
  ghost.className = 'flight-ghost'
  ghost.textContent = text
  ghost.style.left = from.left + 'px'
  ghost.style.top = from.top + 'px'
  ghost.style.width = Math.max(110, to.width) + 'px'
  document.body.append(ghost)
  const dx = to.left - from.left
  const dy = to.top - from.top
  const scale = Math.min(.92, Math.max(.63, from.width / Math.max(to.width, 1)))
  try {
    const a = ghost.animate([
      { transform: 'translate3d(0,0,0) scale('+scale+')', opacity: .35 },
      { transform: 'translate3d('+dx+'px,'+dy+'px,0) scale(1)', opacity: 1 }
    ], { duration, easing: ease, fill: 'forwards' })
    await a.finished
  } catch {
    // Cancelled when switching screens; cleanup is unconditional.
  } finally {
    ghost.remove()
  }
}

export function systemReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
