import { useMemo, type ReactNode } from 'react'
import { BookOpen, BarChart2, ClipboardList, Library, Settings } from 'lucide-react'
import { useGameStore, getDueCount } from '@/store/useGameStore'

type NavView = 'practice' | 'skills' | 'journal' | 'resources' | 'settings'

interface BottomNavProps {
  activeView: NavView
  onNavigate: (view: NavView) => void
  hidden?: boolean
}

const TAB_LABELS: Record<NavView, { short: string; full: string }> = {
  practice: { short: 'Learn', full: 'Practice' },
  skills: { short: 'Skills', full: 'Skills' },
  journal: { short: 'Review', full: 'Mistakes' },
  resources: { short: 'Links', full: 'Resources' },
  settings: { short: 'Setup', full: 'Settings' },
}

export function BottomNav({ activeView, onNavigate, hidden = false }: BottomNavProps) {
  const phase = useGameStore((s) => s.phase)
  const mistakeQueue = useGameStore((s) => s.mistakeQueue)
  const dueCount = useMemo(() => getDueCount(mistakeQueue), [mistakeQueue])

  if (phase === 'placement' || hidden) return null

  const tabs: { id: NavView; icon: ReactNode; badge?: number }[] = [
    { id: 'practice', icon: <BookOpen size={22} strokeWidth={2.25} /> },
    { id: 'skills', icon: <BarChart2 size={22} strokeWidth={2.25} /> },
    { id: 'journal', icon: <ClipboardList size={22} strokeWidth={2.25} />, badge: dueCount || undefined },
    { id: 'resources', icon: <Library size={22} strokeWidth={2.25} /> },
    { id: 'settings', icon: <Settings size={22} strokeWidth={2.25} /> },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Main navigation"
    >
      <div className="flex" style={{ minHeight: 'var(--nav-height)' }}>
        {tabs.map((tab) => {
          const isActive = activeView === tab.id
          const labels = TAB_LABELS[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 min-h-[56px] transition-colors relative
                ${isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 active:text-slate-600 dark:active:text-slate-300'
                }
              `}
              aria-label={labels.full}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[8px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold leading-none max-[360px]:hidden">{labels.full}</span>
              <span className="text-[9px] font-semibold leading-none hidden max-[360px]:inline">{labels.short}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
