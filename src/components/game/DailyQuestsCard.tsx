import { useMemo } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { getDailyQuests, isQuestComplete } from '@/services/dailyQuestService'

export function DailyQuestsCard() {
  const dailyQuestProgress = useGameStore((s) => s.dailyQuestProgress)
  const dailyQuestDate = useGameStore((s) => s.dailyQuestDate)
  const includeAudioQuestions = useGameStore((s) => s.includeAudioQuestions)
  const today = new Date().toDateString()

  const quests = useMemo(() => {
    const date = dailyQuestDate === today ? new Date() : new Date()
    return getDailyQuests(date, includeAudioQuestions)
  }, [dailyQuestDate, today, includeAudioQuestions])

  const completedCount = quests.filter((q) => isQuestComplete(q, dailyQuestProgress)).length

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Daily quests</p>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {completedCount}/{quests.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {quests.map((quest) => {
          const done = isQuestComplete(quest, dailyQuestProgress)
          const progress = dailyQuestProgress[quest.id] ?? 0
          return (
            <li key={quest.id} className="flex items-start gap-2">
              {done ? (
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                  {quest.label}
                </p>
                {!done && (
                  <p className="text-xs text-slate-400">{Math.min(progress, quest.target)}/{quest.target}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
