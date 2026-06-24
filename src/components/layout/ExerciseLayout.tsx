import type { ReactNode } from 'react'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'

interface ExerciseLayoutProps {
  children: ReactNode
  actions?: ReactNode
}

/** Mobile-first exercise shell: scrollable prompt + thumb-zone action dock. */
export function ExerciseLayout({ children, actions }: ExerciseLayoutProps) {
  const keyboardInset = useKeyboardInset()

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-xl mx-auto">
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-4 flex flex-col gap-4 md:gap-5 py-1"
        style={{
          paddingBottom: keyboardInset > 0 ? `${keyboardInset + 8}px` : undefined,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
      {actions != null && (
        <div
          className="flex-shrink-0 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 pt-3 mobile-action-dock flex flex-col gap-2"
          style={{
            paddingBottom: `max(0.75rem, calc(var(--safe-bottom) + ${keyboardInset}px))`,
          }}
        >
          {actions}
        </div>
      )}
    </div>
  )
}
