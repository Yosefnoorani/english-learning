import { Flame, Settings } from 'lucide-react'
import { useGameStore, selectLevelLabel } from '@/store/useGameStore'
import { getPromotionTarget } from '@/services/adaptiveProgressionService'
import { ProgressRing } from '@/components/ui/ProgressRing'

interface TopBarProps {
  onOpenSettings: () => void
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const dailyGoalProgress = useGameStore((s) => s.userState.dailyGoalProgress)
  const dailyGoalTarget = useGameStore((s) => s.userState.dailyGoalTarget)
  const streak = useGameStore((s) => s.userState.streak)
  const streakFreezes = useGameStore((s) => s.userState.streakFreezes)
  const score = useGameStore((s) => s.userState.score)
  const phase = useGameStore((s) => s.phase)
  const currentTier = useGameStore((s) => s.currentTier)
  const tierCorrectStreak = useGameStore((s) => s.tierCorrectStreak)
  const hadRecentMistakeAtTier = useGameStore((s) => s.hadRecentMistakeAtTier)
  const levelLabel = useGameStore(selectLevelLabel)

  const goalPercent = Math.round((dailyGoalProgress / dailyGoalTarget) * 100)

  const tierTarget = getPromotionTarget(hadRecentMistakeAtTier)
  const tierPercent = Math.round((tierCorrectStreak / tierTarget) * 100)

  if (phase === 'placement') return null

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
      <div className="w-full max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none">Level</span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate leading-tight">{levelLabel}</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${tierPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              {tierCorrectStreak}/{tierTarget} · T{currentTier}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/40 rounded-xl px-3 py-1.5">
            <Flame size={16} className="text-orange-500 flex-shrink-0" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak}</span>
            {streakFreezes > 0 && (
              <span className="text-[10px] text-orange-400" title={`${streakFreezes} streak freeze${streakFreezes > 1 ? 's' : ''}`}>
                {'🧊'.repeat(Math.min(streakFreezes, 3))}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center">
            <ProgressRing progress={goalPercent} size={48} strokeWidth={4} color="#10b981" trackColor="#d1fae5">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{goalPercent}%</span>
            </ProgressRing>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-[10px] text-slate-400 leading-none">Score</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{score}</span>
          </div>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
