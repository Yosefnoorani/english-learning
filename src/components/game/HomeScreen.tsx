import { useMemo } from 'react'
import { Zap, RotateCcw, BarChart2, BookOpen, Clock, Target, Trophy } from 'lucide-react'
import { useGameStore, selectLevelLabel, getDueCount } from '@/store/useGameStore'
import { DailyLesson } from '@/components/game/DailyLesson'
import { PracticePreview } from '@/components/game/PracticePreview'
import { DailyQuestsCard } from '@/components/game/DailyQuestsCard'
import { getContentById } from '@/services/contentService'
import type { SkillId, SessionMode } from '@/types/game'
import { SKILL_LABELS } from '@/types/game'

interface HomeScreenProps {
  onStartLesson: (skillId: SkillId) => void
  onOpenJournal: () => void
  onOpenSkills: () => void
}

const SESSION_LABELS: Record<SessionMode, { label: string; questions: number; color: string }> = {
  quick: { label: 'Quick', questions: 5, color: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' },
  standard: { label: 'Standard', questions: 10, color: 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' },
  deep: { label: 'Deep', questions: 20, color: 'border-violet-300 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' },
}

function getHomeGreeting(opts: {
  totalSessions: number
  dueCount: number
  dailyRemaining: number
}): { title: string; subtitle: string } {
  if (opts.totalSessions === 0) {
    return { title: 'Welcome! Ready to learn?', subtitle: 'Start with a quick session or take the placement test in Settings.' }
  }
  if (opts.dueCount > 0) {
    return {
      title: `${opts.dueCount} item${opts.dueCount !== 1 ? 's' : ''} ready for review`,
      subtitle: 'Review mistakes to strengthen your memory.',
    }
  }
  if (opts.dailyRemaining > 0) {
    return {
      title: `${opts.dailyRemaining} more to hit today's goal`,
      subtitle: 'Keep going — you\'re building a habit.',
    }
  }
  return { title: "You're all caught up!", subtitle: 'Great work today. Come back tomorrow or try a focus lesson.' }
}

export function HomeScreen({ onStartLesson, onOpenJournal, onOpenSkills }: HomeScreenProps) {
  const rating = useGameStore((s) => s.userState.rating)
  const score = useGameStore((s) => s.userState.score)
  const skillStats = useGameStore((s) => s.skillStats)
  const mistakeQueue = useGameStore((s) => s.mistakeQueue)
  const sessionMode = useGameStore((s) => s.sessionMode)
  const setSessionMode = useGameStore((s) => s.setSessionMode)
  const continueSession = useGameStore((s) => s.continueSession)
  const dailyGoalProgress = useGameStore((s) => s.userState.dailyGoalProgress)
  const dailyGoalTarget = useGameStore((s) => s.userState.dailyGoalTarget)
  const totalSessionsCompleted = useGameStore((s) => s.totalSessionsCompleted)
  const achievements = useGameStore((s) => s.achievements)
  const levelLabel = useGameStore(selectLevelLabel)
  const dueCount = useMemo(() => getDueCount(mistakeQueue), [mistakeQueue])
  const now = useMemo(() => Date.now(), [mistakeQueue])

  const greeting = getHomeGreeting({
    totalSessions: totalSessionsCompleted,
    dueCount,
    dailyRemaining: Math.max(0, dailyGoalTarget - dailyGoalProgress),
  })

  const dueMistakes = [...mistakeQueue]
    .filter((e) => !e.mastered && e.nextDueAt <= now)
    .sort((a, b) => a.nextDueAt - b.nextDueAt)
    .slice(0, 3)
    .map((e) => getContentById(e.contentId))
    .filter(Boolean)

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ paddingBottom: 'max(calc(var(--nav-height) + var(--safe-bottom)), 5rem)' }}
    >
      <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{greeting.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {levelLabel} · {score} points · {greeting.subtitle}
          </p>
        </div>

        <DailyQuestsCard />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Target size={12} />
            Session length
          </p>
          <div className="flex gap-2">
            {(Object.entries(SESSION_LABELS) as [SessionMode, typeof SESSION_LABELS[SessionMode]][]).map(([mode, info]) => (
              <button
                key={mode}
                onClick={() => setSessionMode(mode)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border-2 transition-all min-h-[60px] ${
                  sessionMode === mode
                    ? info.color + ' border-opacity-100 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span className="text-sm font-bold">{info.label}</span>
                <span className="text-xs font-semibold mt-0.5">{info.questions} questions</span>
              </button>
            ))}
          </div>
          <button
            onClick={continueSession}
            className="w-full min-h-[52px] rounded-xl bg-indigo-600 text-white font-bold text-base shadow-md active:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={18} />
            Start {SESSION_LABELS[sessionMode].questions}-question session
          </button>
        </div>

        {dueCount > 0 && (
          <div className="flex flex-col gap-2 order-first md:order-none">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Due for review</p>
              <button
                onClick={onOpenJournal}
                className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline"
              >
                See all {dueCount}
              </button>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-rose-500" />
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {dueCount} item{dueCount !== 1 ? 's' : ''} ready to review
                </span>
              </div>
              {dueMistakes.slice(0, 2).map((item) => item && (
                <div key={item.id} className="text-xs text-rose-600 dark:text-rose-400">
                  <span className="font-semibold">{item.data.word ?? item.data.context_sentence?.slice(0, 40)}</span>
                  {' · '}
                  <span>{SKILL_LABELS[item.skill]}</span>
                </div>
              ))}
              <button
                onClick={onOpenJournal}
                className="flex items-center gap-2 min-h-[44px] rounded-xl bg-rose-600 text-white font-bold text-sm px-4 justify-center shadow active:bg-rose-700 transition-colors"
              >
                <RotateCcw size={16} />
                Practise due items
              </button>
            </div>
          </div>
        )}

        <PracticePreview />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Focus lesson</p>
          <DailyLesson skillStats={skillStats} rating={rating} onStartLesson={onStartLesson} />
        </div>

        {achievements.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Trophy size={12} />
              Achievements ({achievements.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {achievements.slice(-6).map((id) => (
                <span
                  key={id}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  {id.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your progress</p>
          <button
            onClick={onOpenSkills}
            className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors shadow-sm min-h-[72px]"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
              <BarChart2 size={22} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">View skill breakdown</p>
              <p className="text-xs text-slate-400">
                {Object.keys(skillStats).length} skills practised
              </p>
            </div>
            <BookOpen size={16} className="text-slate-300 dark:text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
