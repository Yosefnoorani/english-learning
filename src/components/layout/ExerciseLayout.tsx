import { useEffect, useRef, type ReactNode } from 'react'
import { useVisualViewport } from '@/hooks/useKeyboardInset'

interface ExerciseLayoutProps {
  children: ReactNode
  actions?: ReactNode
}

/** Mobile-first exercise shell: prompt stays visible above keyboard; actions in thumb zone. */
export function ExerciseLayout({ children, actions }: ExerciseLayoutProps) {
  const { isKeyboardOpen } = useVisualViewport()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isKeyboardOpen) return
    scrollRef.current?.scrollTo({ top: 0 })
  }, [isKeyboardOpen])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function keepPromptVisible(e: FocusEvent) {
      const scrollEl = el
      if (!scrollEl || !window.matchMedia('(max-width: 767px)').matches) return
      const target = e.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
      const resetScroll = () => {
        scrollEl.scrollTop = 0
      }
      requestAnimationFrame(resetScroll)
      setTimeout(resetScroll, 100)
      setTimeout(resetScroll, 300)
    }

    el.addEventListener('focusin', keepPromptVisible)
    return () => el.removeEventListener('focusin', keepPromptVisible)
  }, [])

  return (
    <div
      className={`flex flex-col flex-1 min-h-0 w-full max-w-xl mx-auto ${
        isKeyboardOpen ? 'exercise-keyboard-shell' : ''
      }`}
    >
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 flex flex-col gap-3 md:gap-5 py-1 exercise-scroll"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
      {actions != null && (
        <div className="flex-shrink-0 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 pt-3 mobile-action-dock flex flex-col gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
