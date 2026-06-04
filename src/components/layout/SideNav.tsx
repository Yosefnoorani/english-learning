import type { ReactNode } from 'react'
import { BookOpen, BarChart2, ClipboardList, Library, Settings, Flame, Target } from 'lucide-react'
import { useGameStore, selectLevelLabel, selectDueCount } from '@/store/useGameStore'

type NavView = 'practice' | 'skills' | 'journal' | 'resources' | 'settings'

interface SideNavProps {
  activeView: NavView
  onNavigate: (view: NavView) => void
}

export function SideNav({ activeView, onNavigate }: SideNavProps) {
  const userState = useGameStore((s) => s.userState)
  const levelLabel = useGameStore(selectLevelLabel)
  const dueCount = useGameStore(selectDueCount)

  const goalPercent = Math.round(
    (userState.dailyGoalProgress / userState.dailyGoalTarget) * 100,
  )

  const navItems: { id: NavView; icon: ReactNode; label: string; badge?: number }[] = [
    { id: 'practice', icon: <BookOpen size={20} />, label: 'Practice' },
    { id: 'skills', icon: <BarChart2 size={20} />, label: 'My Skills' },
    { id: 'journal', icon: <ClipboardList size={20} />, label: 'Mistakes', badge: dueCount || undefined },
    { id: 'resources', icon: <Library size={20} />, label: 'Resources' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ]

  return (
    <nav className="hidden md:flex flex-col w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-full fixed left-0 top-0 bottom-0 z-10">
      {/* App brand */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base">E</div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">English Learning</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{levelLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left
                ${isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                }
              `}
            >
              <span className={isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats strip */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span>Daily goal</span>
          <span className="font-semibold text-emerald-600">{userState.dailyGoalProgress}/{userState.dailyGoalTarget}</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-3">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${goalPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{userState.streak} day streak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">{userState.score} pts</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
