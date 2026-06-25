import { Flame, Settings, Gem } from 'lucide-react'
import { useGameStore, selectLevelLabel } from '@/store/useGameStore'
import { getPromotionTarget } from '@/services/adaptiveProgressionService'
import { xpProgressInLevel } from '@/services/rewardService'
import { ProgressRing } from '@/components/ui/ProgressRing'

interface TopBarProps {
  onOpenSettings: () => void
  onOpenStreakHub?: () => void
}

export function TopBar({ onOpenSettings, onOpenStreakHub }: TopBarProps) {
  const dailyGoalProgress = useGameStore((s) => s.userState.dailyGoalProgress)
  const dailyGoalTarget = useGameStore((s) => s.userState.dailyGoalTarget)
  const streak = useGameStore((s) => s.userState.streak)
  const streakFreezes = useGameStore((s) => s.userState.streakFreezes)
  const gems = useGameStore((s) => s.userState.gems)
  const xp = useGameStore((s) => s.userState.xp)
  const phase = useGameStore((s) => s.phase)
  const currentTier = useGameStore((s) => s.currentTier)
  const tierCorrectStreak = useGameStore((s) => s.tierCorrectStreak)
  const hadRecentMistakeAtTier = useGameStore((s) => s.hadRecentMistakeAtTier)
  const levelLabel = useGameStore(selectLevelLabel)

  const goalPercent = Math.round((dailyGoalProgress / dailyGoalTarget) * 100)
  const tierTarget = getPromotionTarget(hadRecentMistakeAtTier)
  const tierPercent = Math.round((tierCorrectStreak / tierTarget) * 100)
  const xpProgress = xpProgressInLevel(xp)

  if (phase === 'placement') return null

  return (
    <header
      className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-20 flex-shrink-0"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="w-full max-w-screen-xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none">Level</span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate leading-tight">{levelLabel}</span>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[100px] sm:max-w-[140px]"
              title={`XP Lv ${xpProgress.level} · Tier ${currentTier}`}
            >
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${xpProgress.percent}%` }}
              />
            </div>
            <div
              className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[100px] sm:max-w-[140px]"
              title={`Tier ${currentTier} · ${tierCorrectStreak}/${tierTarget}`}
            >
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${tierPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/40 rounded-lg px-2 py-1 min-h-[36px]">
            <Gem size={14} className="text-violet-500" />
            <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{gems}</span>
          </div>

          <button
            type="button"
            onClick={onOpenStreakHub}
            className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 min-h-[40px] hover:bg-orange-100 dark:hover:bg-orange-950/60 transition-colors"
          >
            <Flame size={15} className="text-orange-500 flex-shrink-0" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak}</span>
            {streakFreezes > 0 && (
              <span className="text-[10px] text-orange-400 hidden sm:inline">
                {'🧊'.repeat(Math.min(streakFreezes, 2))}
              </span>
            )}
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              {dailyGoalProgress}/{dailyGoalTarget}
            </span>
            <ProgressRing progress={goalPercent} size={36} strokeWidth={3} color="#10b981" trackColor="#d1fae5">
              <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400">{goalPercent}%</span>
            </ProgressRing>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="hidden md:flex p-2 rounded-xl min-h-[44px] min-w-[44px] items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
