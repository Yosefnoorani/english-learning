import { Trophy, Lock } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { ACHIEVEMENTS, getAchievementProgress } from '@/services/achievementService'
import { MobileSheet } from '@/components/layout/MobileSheet'

interface AchievementsGalleryProps {
  onClose: () => void
}

export function AchievementsGallery({ onClose }: AchievementsGalleryProps) {
  const achievements = useGameStore((s) => s.achievements)
  const streak = useGameStore((s) => s.userState.streak)
  const skillStats = useGameStore((s) => s.skillStats)
  const mistakeQueue = useGameStore((s) => s.mistakeQueue)
  const hasCompletedSetup = useGameStore((s) => s.hasCompletedSetup)
  const sessionCorrect = useGameStore((s) => s.sessionCorrect)
  const sessionAnswered = useGameStore((s) => s.sessionAnswered)
  const sessionCombo = useGameStore((s) => s.sessionCombo)
  const questStreak = useGameStore((s) => s.questStreak)

  const progressState = {
    streak,
    sessionCorrect,
    sessionAnswered,
    sessionCombo,
    skillStats,
    mistakeQueue,
    hasCompletedSetup,
    questStreak,
  }

  return (
    <MobileSheet title="Achievements" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {achievements.length}/{ACHIEVEMENTS.length} unlocked
        </p>
        <ul className="flex flex-col gap-3">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = achievements.includes(a.id)
            const progress = getAchievementProgress(a.id, progressState)
            const pct = progress && progress.target > 0
              ? Math.round((progress.current / progress.target) * 100)
              : 0

            return (
              <li
                key={a.id}
                className={`rounded-2xl border p-4 flex items-start gap-3 ${
                  unlocked
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <span className={`text-3xl ${unlocked ? '' : 'grayscale opacity-40'}`}>{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${unlocked ? 'text-amber-800 dark:text-amber-200' : 'text-slate-700 dark:text-slate-200'}`}>
                      {a.label}
                    </p>
                    {!unlocked && <Lock size={12} className="text-slate-400" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{a.description}</p>
                  {!unlocked && progress && progress.target > 1 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{progress.label}</span>
                        <span>{progress.current}/{progress.target}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                {unlocked && <Trophy size={16} className="text-amber-500 flex-shrink-0" />}
              </li>
            )
          })}
        </ul>
      </div>
    </MobileSheet>
  )
}
