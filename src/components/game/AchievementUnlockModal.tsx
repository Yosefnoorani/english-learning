import { Share2 } from 'lucide-react'
import { getAchievementById } from '@/services/achievementService'
import confetti from 'canvas-confetti'

interface AchievementUnlockModalProps {
  achievementId: string
  onDismiss: () => void
}

export function AchievementUnlockModal({ achievementId, onDismiss }: AchievementUnlockModalProps) {
  const achievement = getAchievementById(achievementId)
  if (!achievement) return null

  const handleShare = async () => {
    const text = `I unlocked "${achievement.label}" in English Learning! ${achievement.emoji}`
    if (navigator.share) {
      await navigator.share({ title: achievement.label, text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm fade-in">
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/60 dark:via-yellow-950/40 dark:to-orange-950/60 p-8 shadow-2xl flex flex-col items-center gap-5 text-center border border-amber-200/60 dark:border-amber-800/40">
          <div className="text-6xl animate-bounce">{achievement.emoji}</div>
          <div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
              Achievement unlocked!
            </p>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{achievement.label}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{achievement.description}</p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
                onDismiss()
              }}
              className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors"
            >
              Keep going!
            </button>
            <button
              type="button"
              onClick={() => { void handleShare() }}
              className="w-full min-h-[44px] rounded-xl border-2 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
