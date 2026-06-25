import { Trophy, TrendingDown, TrendingUp } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useGameStore } from '@/store/useGameStore'
import { buildOfflineLeaderboard, leagueTierLabel } from '@/services/leagueService'

interface LeagueSummaryModalProps {
  onDismiss: () => void
}

export function LeagueSummaryModal({ onDismiss }: LeagueSummaryModalProps) {
  const leagueTier = useGameStore((s) => s.leagueTier)
  const weeklyXp = useGameStore((s) => s.weeklyXp)
  const weekStartDate = useGameStore((s) => s.weekStartDate)
  const promotedLastWeek = useGameStore((s) => s.promotedLastWeek)

  const { members, userRank } = buildOfflineLeaderboard(weeklyXp, weekStartDate)
  const promoted = promotedLastWeek === true || userRank <= 10
  const demoted = promotedLastWeek === false || userRank > 20

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm fade-in">
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-7 shadow-2xl flex flex-col gap-5">
          <div className="text-center">
            <Trophy size={40} className="mx-auto text-amber-500 mb-2" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Weekly League Results</h2>
            <p className="text-sm text-slate-500 mt-1">
              {leagueTierLabel(leagueTier)} · Rank #{userRank} · {weeklyXp} XP
            </p>
          </div>

          {promoted && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Promoted!</p>
            </div>
          )}
          {demoted && !promoted && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 flex items-center gap-2">
              <TrendingDown size={18} className="text-rose-600" />
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Demoted — try again this week!</p>
            </div>
          )}

          <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {members.slice(0, 10).map((m, i) => (
              <li key={m.name} className={`flex justify-between text-xs py-1 ${m.isUser ? 'font-bold text-indigo-600' : 'text-slate-500'}`}>
                <span>{i + 1}. {m.name}</span>
                <span>{m.weeklyXp}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              if (promoted) confetti({ particleCount: 100, spread: 80 })
              onDismiss()
            }}
            className="w-full min-h-[48px] rounded-xl bg-indigo-600 text-white font-bold"
          >
            Start new week
          </button>
        </div>
      </div>
    </div>
  )
}
