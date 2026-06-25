import { AlertTriangle } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { estimateMinutesToGoal } from '@/services/rewardService'

interface StreakAtRiskBannerProps {
  onContinue: () => void
}

export function StreakAtRiskBanner({ onContinue }: StreakAtRiskBannerProps) {
  const streak = useGameStore((s) => s.userState.streak)
  const dailyGoalProgress = useGameStore((s) => s.userState.dailyGoalProgress)
  const dailyGoalTarget = useGameStore((s) => s.userState.dailyGoalTarget)
  const lastActiveDate = useGameStore((s) => s.userState.lastActiveDate)

  const hour = new Date().getHours()
  const today = new Date().toDateString()
  const remaining = Math.max(0, dailyGoalTarget - dailyGoalProgress)
  const atRisk = streak > 0 && remaining > 0 && hour >= 20 && lastActiveDate === today

  if (!atRisk) return null

  const minutes = estimateMinutesToGoal(remaining)

  return (
    <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 flex flex-col gap-2 animate-pulse">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
        <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
          Your {streak}-day streak ends tonight!
        </p>
      </div>
      <p className="text-xs text-rose-600 dark:text-rose-400">
        {remaining} more correct answer{remaining !== 1 ? 's' : ''} (~{minutes} min) to save it.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors"
      >
        Save my streak
      </button>
    </div>
  )
}
