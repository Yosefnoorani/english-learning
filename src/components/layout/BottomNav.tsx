import { useMemo, type ReactNode } from 'react'
import { BookOpen, BarChart2, ClipboardList, Library } from 'lucide-react'
import { useGameStore, getDueCount } from '@/store/useGameStore'

type NavView = 'practice' | 'skills' | 'journal' | 'resources' | 'settings'

interface BottomNavProps {
  activeView: NavView
  onNavigate: (view: NavView) => void
}

export function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  const phase = useGameStore((s) => s.phase)
  const mistakeQueue = useGameStore((s) => s.mistakeQueue)
  const dueCount = useMemo(() => getDueCount(mistakeQueue), [mistakeQueue])

  if (phase === 'placement') return null

  const tabs: { id: NavView; icon: ReactNode; label: string; badge?: number }[] = [
    { id: 'practice', icon: <BookOpen size={22} />, label: 'Practice' },
    { id: 'skills', icon: <BarChart2 size={22} />, label: 'Skills' },
    { id: 'journal', icon: <ClipboardList size={22} />, label: 'Mistakes', badge: dueCount || undefined },
    { id: 'resources', icon: <Library size={22} />, label: 'Resources' },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-0.5 py-2 px-1 min-h-[56px] transition-colors relative
                ${isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }
              `}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative">
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-rose-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
