import { useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface MobileSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function MobileSheet({ title, onClose, children }: MobileSheetProps) {
  const touchStartY = useRef(0)
  const [swipeOffset, setSwipeOffset] = useState(0)

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setSwipeOffset(delta)
  }

  function onTouchEnd() {
    if (swipeOffset > 80) onClose()
    setSwipeOffset(0)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 md:bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Mobile: bottom sheet */}
      <div
        className="md:hidden fixed z-50 bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col max-h-[92svh] slide-up"
        style={{
          transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
          transition: swipeOffset > 0 ? 'none' : undefined,
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex flex-col items-center pt-3 pb-2 flex-shrink-0"
        >
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>

      {/* Desktop: side panel */}
      <div className="hidden md:flex fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex-col slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}
