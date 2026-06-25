import { useMemo, useState, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Gem, Lock } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import {
  getDailyQuests,
  isQuestComplete,
  isBonusQuestUnlocked,
} from '@/services/dailyQuestService'
import { getQuestGemMultiplier } from '@/services/experimentService'
import confetti from 'canvas-confetti'

interface DailyQuestsCardProps {
  compact?: boolean
}

export function DailyQuestsCard({ compact = false }: DailyQuestsCardProps) {
  const dailyQuestProgress = useGameStore((s) => s.dailyQuestProgress)
  const dailyQuestDate = useGameStore((s) => s.dailyQuestDate)
  const includeAudioQuestions = useGameStore((s) => s.includeAudioQuestions)
  const claimedQuestRewards = useGameStore((s) => s.claimedQuestRewards)
  const claimQuestGemReward = useGameStore((s) => s.claimQuestGemReward)
  const questStreak = useGameStore((s) => s.questStreak)
  const experiments = useGameStore((s) => s.experiments)
  const today = new Date().toDateString()
  const [expanded, setExpanded] = useState(!compact)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)

  const quests = useMemo(() => {
    const date = dailyQuestDate === today ? new Date() : new Date()
    return getDailyQuests(date, includeAudioQuestions)
  }, [dailyQuestDate, today, includeAudioQuestions])

  const standardQuests = quests.filter((q) => !q.isBonus)
  const bonusQuest = quests.find((q) => q.isBonus)
  const bonusUnlocked = isBonusQuestUnlocked(quests, dailyQuestProgress)
  const completedCount = standardQuests.filter((q) => isQuestComplete(q, dailyQuestProgress)).length
  const gemMult = getQuestGemMultiplier(experiments)

  useEffect(() => {
    for (const quest of quests) {
      if (quest.isBonus && !bonusUnlocked) continue
      const done = isQuestComplete(quest, dailyQuestProgress)
      const claimed = claimedQuestRewards.includes(quest.id)
      if (done && !claimed) {
        claimQuestGemReward(quest.id)
        setJustCompleted(quest.id)
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } })
        const t = setTimeout(() => setJustCompleted(null), 2000)
        return () => clearTimeout(t)
      }
    }
  }, [dailyQuestProgress, quests, claimedQuestRewards, bonusUnlocked, claimQuestGemReward])

  const totalProgress = standardQuests.reduce((sum, q) => {
    const p = dailyQuestProgress[q.id] ?? 0
    return sum + Math.min(p / q.target, 1)
  }, 0)
  const overallPercent = Math.round((totalProgress / standardQuests.length) * 100)

  function renderQuest(quest: typeof quests[0], locked = false) {
    const done = isQuestComplete(quest, dailyQuestProgress)
    const progress = dailyQuestProgress[quest.id] ?? 0
    const gems = Math.round(quest.gemReward * gemMult)
    const claimed = claimedQuestRewards.includes(quest.id)
    const animating = justCompleted === quest.id

    return (
      <li key={quest.id} className={`flex items-start gap-2 ${animating ? 'animate-pulse' : ''}`}>
        {done ? (
          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
        ) : locked ? (
          <Lock size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
        ) : (
          <Circle size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${done ? 'text-slate-400 line-through' : locked ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
            {quest.label}
          </p>
          {!done && !locked && (
            <p className="text-xs text-slate-400">{Math.min(progress, quest.target)}/{quest.target}</p>
          )}
        </div>
        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${claimed ? 'text-emerald-500' : 'text-violet-500'}`}>
          <Gem size={10} />
          {claimed ? '✓' : `+${gems}`}
        </span>
      </li>
    )
  }

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2 shadow-sm text-left"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Daily quests</p>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {completedCount}/{standardQuests.length}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${overallPercent}%` }} />
        </div>
        {questStreak > 1 && (
          <p className="text-[10px] text-amber-600">{questStreak}-day quest streak</p>
        )}
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          Tap to expand <ChevronDown size={12} />
        </span>
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Daily quests</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {completedCount}/{standardQuests.length}
          </span>
          {compact && (
            <button type="button" onClick={() => setExpanded(false)} className="text-slate-400" aria-label="Collapse">
              <ChevronUp size={14} />
            </button>
          )}
        </div>
      </div>
      {questStreak > 1 && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
          🔥 {questStreak}-day quest streak
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {standardQuests.map((q) => renderQuest(q))}
        {bonusQuest && renderQuest(bonusQuest, !bonusUnlocked)}
      </ul>
    </div>
  )
}
