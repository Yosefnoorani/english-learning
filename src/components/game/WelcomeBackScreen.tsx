import { useGameStore } from '@/store/useGameStore'
import { Zap } from 'lucide-react'

interface WelcomeBackScreenProps {
  onStart: () => void
  onDismiss: () => void
}

export function WelcomeBackScreen({ onStart, onDismiss }: WelcomeBackScreenProps) {
  const streak = useGameStore((s) => s.userState.streak)
  const dueCount = useGameStore((s) => {
    const now = Date.now()
    return s.mistakeQueue.filter((e) => !e.mastered && e.nextDueAt <= now).length
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm fade-in">
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-7 shadow-2xl flex flex-col gap-5 text-center">
          <div className="text-5xl">👋</div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Welcome back!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {streak > 0
              ? `Your ${streak}-day streak is still going.`
              : 'Start fresh with a quick warm-up session.'}
            {dueCount > 0 && ` ${dueCount} mistake${dueCount !== 1 ? 's' : ''} waiting for review.`}
          </p>
          <button
            type="button"
            onClick={onStart}
            className="w-full min-h-[52px] rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2"
          >
            <Zap size={18} />
            Quick 5-question warm-up
          </button>
          <button type="button" onClick={onDismiss} className="text-sm text-slate-400 hover:text-slate-600">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
