import { useMemo } from 'react'
import { Flame, Snowflake, Gem } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { STREAK_MILESTONES, STREAK_FREEZE_GEM_COST, STREAK_REPAIR_GEM_COST } from '@/services/rewardService'
import { MobileSheet } from '@/components/layout/MobileSheet'

interface StreakHubProps {
  onClose: () => void
}

export function StreakHub({ onClose }: StreakHubProps) {
  const streak = useGameStore((s) => s.userState.streak)
  const streakFreezes = useGameStore((s) => s.userState.streakFreezes)
  const gems = useGameStore((s) => s.userState.gems)
  const activityHistory = useGameStore((s) => s.activityHistory)
  const claimedMilestones = useGameStore((s) => s.claimedStreakMilestones)
  const streakBrokenAt = useGameStore((s) => s.userState.streakBrokenAt)
  const buyStreakFreeze = useGameStore((s) => s.buyStreakFreeze)
  const repairStreak = useGameStore((s) => s.repairStreak)
  const claimStreakMilestone = useGameStore((s) => s.claimStreakMilestone)

  const heatmap = useMemo(() => {
    const days: { date: string; active: boolean }[] = []
    const activeSet = new Set(activityHistory)
    for (let i = 27; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toDateString()
      days.push({ date: key, active: activeSet.has(key) })
    }
    return days
  }, [activityHistory])

  const canRepair = streakBrokenAt != null && Date.now() - streakBrokenAt < 86400000 && streak === 0

  return (
    <MobileSheet title="Streak" onClose={onClose}>
      <div className="flex flex-col gap-5 p-4">
        <div className="flex items-center justify-center gap-3 py-4">
          <Flame size={40} className="text-orange-500" />
          <div className="text-center">
            <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">{streak}</p>
            <p className="text-sm text-slate-500">day streak</p>
          </div>
          {streakFreezes > 0 && (
            <div className="flex items-center gap-1 text-blue-500" title="Streak freezes">
              <Snowflake size={20} />
              <span className="font-bold">{streakFreezes}</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Last 28 days</p>
          <div className="grid grid-cols-7 gap-1">
            {heatmap.map((d) => (
              <div
                key={d.date}
                title={d.date}
                className={`aspect-square rounded-sm ${
                  d.active
                    ? 'bg-orange-500'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Milestones</p>
          {STREAK_MILESTONES.map((m) => {
            const claimed = claimedMilestones.includes(m.days)
            const reached = streak >= m.days
            return (
              <div
                key={m.days}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-3"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{m.days} days</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Gem size={10} className="text-violet-500" /> +{m.gems} gems
                  </p>
                </div>
                {claimed ? (
                  <span className="text-xs text-emerald-600 font-semibold">Claimed</span>
                ) : reached ? (
                  <button
                    type="button"
                    onClick={() => claimStreakMilestone(m.days)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-600 text-white"
                  >
                    Claim
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">{m.days - streak} to go</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
          <button
            type="button"
            disabled={gems < STREAK_FREEZE_GEM_COST || streakFreezes >= 3}
            onClick={() => buyStreakFreeze()}
            className="w-full min-h-[44px] rounded-xl border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Snowflake size={16} />
            Buy streak freeze ({STREAK_FREEZE_GEM_COST} gems)
          </button>
          {canRepair && (
            <button
              type="button"
              disabled={gems < STREAK_REPAIR_GEM_COST}
              onClick={() => repairStreak()}
              className="w-full min-h-[44px] rounded-xl bg-orange-600 text-white font-semibold text-sm disabled:opacity-40"
            >
              Repair streak ({STREAK_REPAIR_GEM_COST} gems)
            </button>
          )}
        </div>
      </div>
    </MobileSheet>
  )
}
