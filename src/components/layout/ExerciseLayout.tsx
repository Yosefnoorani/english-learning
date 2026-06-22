import type { ReactNode } from 'react'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'

interface ExerciseLayoutProps {
  children: ReactNode
  actions: ReactNode
}

export function ExerciseLayout({ children, actions }: ExerciseLayoutProps) {
  const keyboardInset = useKeyboardInset()

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-xl mx-auto">
      <div
        className="flex-1 overflow-y-auto px-4 flex flex-col gap-5"
        style={{ paddingBottom: keyboardInset > 0 ? `${keyboardInset}px` : undefined }}
      >
        {children}
      </div>
      <div
        className="sticky bottom-0 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col gap-2"
        style={{
          paddingBottom: `max(0.75rem, calc(var(--safe-bottom, 0px) + ${keyboardInset}px))`,
        }}
      >
        {actions}
      </div>
    </div>
  )
}
