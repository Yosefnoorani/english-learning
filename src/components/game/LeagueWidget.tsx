import { useMemo } from 'react'
import { Trophy, TrendingUp } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { buildOfflineLeaderboard, leagueTierLabel, xpToNextRank } from '@/services/leagueService'

export function LeagueWidget() {
  const leagueTier = useGameStore((s) => s.leagueTier)
  const weeklyXp = useGameStore((s) => s.weeklyXp)
  const weekStartDate = useGameStore((s) => s.weekStartDate)
  const personalBestWeeklyXp = useGameStore((s) => s.personalBestWeeklyXp)

  const { members, userRank } = useMemo(
    () => buildOfflineLeaderboard(weeklyXp, weekStartDate),
    [weeklyXp, weekStartDate],
  )
  const xpBehind = xpToNextRank(members, userRank)
  const top5 = members.slice(0, 5)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Trophy size={12} className="text-amber-500" />
          {leagueTierLabel(leagueTier)} League
        </p>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">#{userRank}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {top5.map((m, i) => (
          <li
            key={m.name}
            className={`flex items-center justify-between text-xs rounded-lg px-2 py-1 ${
              m.isUser ? 'bg-indigo-50 dark:bg-indigo-950/40 font-bold' : ''
            }`}
          >
            <span className="text-slate-600 dark:text-slate-300">
              {i + 1}. {m.name}
            </span>
            <span className="text-slate-400">{m.weeklyXp} XP</span>
          </li>
        ))}
      </ul>
      {xpBehind > 0 && userRank > 1 && (
        <p className="text-[10px] text-slate-400 flex items-center gap-1">
          <TrendingUp size={10} />
          {xpBehind} XP to rank #{userRank - 1}
        </p>
      )}
      {weeklyXp >= personalBestWeeklyXp && personalBestWeeklyXp > 0 && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Personal best week!</p>
      )}
    </div>
  )
}
