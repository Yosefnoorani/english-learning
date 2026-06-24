import { useMemo, useState } from 'react'
import { Zap, RotateCcw, BarChart2, BookOpen, ChevronDown, ChevronUp, Target, Trophy } from 'lucide-react'
import { useGameStore, selectLevelLabel, getDueCount } from '@/store/useGameStore'
import { DailyLesson } from '@/components/game/DailyLesson'
import { PracticePreview } from '@/components/game/PracticePreview'
import { DailyQuestsCard } from '@/components/game/DailyQuestsCard'
import { ACHIEVEMENTS } from '@/services/achievementService'
import { getContentById } from '@/services/contentService'
import type { SkillId, SessionMode } from '@/types/game'
import { SKILL_LABELS } from '@/types/game'

interface HomeScreenProps {
  onStartLesson: (skillId: SkillId) => void
  onOpenJournal: () => void
  onOpenSkills: () => void
  onStartPlacement: () => void
  onStartReview: () => void
  showPlacementBanner?: boolean
}

const SESSION_LABELS: Record<SessionMode, { label: string; questions: number; color: string }> = {
  quick: { label: 'Quick', questions: 5, color: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' },
  standard: { label: 'Standard', questions: 10, color: 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' },
  deep: { label: 'Deep', questions: 20, color: 'border-violet-300 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' },
}

const ACHIEVEMENT_LABELS = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a.label])) as Record<string, string>

type HeroAction = 'placement' | 'review' | 'continue' | 'session'

function getHeroAction(opts: {
  totalSessions: number
  hasCompletedSetup: boolean
  dueCount: number
  dailyRemaining: number
}): { action: HeroAction; title: string; subtitle: string; cta: string } {
  if (!opts.hasCompletedSetup && opts.totalSessions === 0) {
    return {
      action: 'placement',
      title: 'Welcome! Find your level',
      subtitle: 'A quick 5-question test picks exercises that match your English.',
      cta: 'Take placement test',
    }
  }
  if (opts.dueCount > 0) {
    return {
      action: 'review',
      title: `${opts.dueCount} mistake${opts.dueCount !== 1 ? 's' : ''} ready to review`,
      subtitle: 'Spaced repetition works best when you review on time.',
      cta: `Review ${Math.min(opts.dueCount, 12)} item${opts.dueCount !== 1 ? 's' : ''}`,
    }
  }
  if (opts.dailyRemaining > 0) {
    return {
      action: 'continue',
      title: `${opts.dailyRemaining} more to hit today's goal`,
      subtitle: 'Keep going — small daily steps build lasting progress.',
      cta: `Continue session (${opts.dailyRemaining} left)`,
    }
  }
  return {
    action: 'session',
    title: "You're all caught up!",
    subtitle: 'Start a mixed session or try a focus lesson below.',
    cta: 'Start session',
  }
}

export function HomeScreen({
  onStartLesson,
  onOpenJournal,
  onOpenSkills,
  onStartPlacement,
  onStartReview,
  showPlacementBanner,
}: HomeScreenProps) {
  const rating = useGameStore((s) => s.userState.rating)
  const skillStats = useGameStore((s) => s.skillStats)
  const mistakeQueue = useGameStore((s) => s.mistakeQueue)
  const sessionMode = useGameStore((s) => s.sessionMode)
  const setSessionMode = useGameStore((s) => s.setSessionMode)
  const continueSession = useGameStore((s) => s.continueSession)
  const dailyGoalProgress = useGameStore((s) => s.userState.dailyGoalProgress)
  const dailyGoalTarget = useGameStore((s) => s.userState.dailyGoalTarget)
  const totalSessionsCompleted = useGameStore((s) => s.totalSessionsCompleted)
  const hasCompletedSetup = useGameStore((s) => s.hasCompletedSetup)
  const achievements = useGameStore((s) => s.achievements)
  const levelLabel = useGameStore(selectLevelLabel)
  const dueCount = useMemo(() => getDueCount(mistakeQueue), [mistakeQueue])
  const now = useMemo(() => Date.now(), [mistakeQueue])
  const [showSessionOptions, setShowSessionOptions] = useState(false)

  const dailyRemaining = Math.max(0, dailyGoalTarget - dailyGoalProgress)
  const hero = getHeroAction({
    totalSessions: totalSessionsCompleted,
    hasCompletedSetup,
    dueCount,
    dailyRemaining,
  })

  const dueMistakes = [...mistakeQueue]
    .filter((e) => !e.mastered && e.nextDueAt <= now)
    .sort((a, b) => a.nextDueAt - b.nextDueAt)
    .slice(0, 3)
    .map((e) => getContentById(e.contentId))
    .filter(Boolean)

  function handleHeroClick() {
    switch (hero.action) {
      case 'placement':
        onStartPlacement()
        break
      case 'review':
        void onStartReview()
        break
      case 'continue':
      case 'session':
        void continueSession()
        break
    }
  }

  const heroColor =
    hero.action === 'review'
      ? 'bg-rose-600 hover:bg-rose-700'
      : hero.action === 'placement'
        ? 'bg-violet-600 hover:bg-violet-700'
        : 'bg-indigo-600 hover:bg-indigo-700'

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-4 py-5 md:py-6 flex flex-col gap-4 md:gap-5">
        {showPlacementBanner && (
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 px-4 py-3 flex flex-col gap-2">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
              Complete placement for better exercises
            </p>
            <button
              type="button"
              onClick={onStartPlacement}
              className="text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline text-left"
            >
              Take the 5-question test →
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{levelLabel}</p>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{hero.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{hero.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex flex-col gap-3">
          <button
            type="button"
            onClick={handleHeroClick}
            className={`w-full min-h-[52px] rounded-xl text-white font-bold text-base shadow-md transition-colors flex items-center justify-center gap-2 ${heroColor}`}
          >
            {hero.action === 'review' ? <RotateCcw size={18} /> : <Zap size={18} />}
            {hero.cta}
          </button>

          {hero.action !== 'placement' && (
            <button
              type="button"
              onClick={() => setShowSessionOptions((v) => !v)}
              className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showSessionOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showSessionOptions ? 'Hide session options' : `Session: ${SESSION_LABELS[sessionMode].label} (${SESSION_LABELS[sessionMode].questions}Q)`}
            </button>
          )}

          {showSessionOptions && hero.action !== 'placement' && (
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Target size={12} />
                Session length
              </p>
              <div className="flex gap-2">
                {(Object.entries(SESSION_LABELS) as [SessionMode, typeof SESSION_LABELS[SessionMode]][]).map(([mode, info]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSessionMode(mode)}
                    className={`flex-1 flex flex-col items-center py-2 rounded-xl border-2 transition-all min-h-[52px] ${
                      sessionMode === mode
                        ? info.color + ' border-opacity-100 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">{info.label}</span>
                    <span className="text-[10px] font-semibold mt-0.5">{info.questions}Q</span>
                  </button>
                ))}
              </div>
              {hero.action !== 'review' && hero.action !== 'continue' && (
                <button
                  type="button"
                  onClick={() => void continueSession()}
                  className="w-full min-h-[44px] rounded-xl border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                >
                  Start {SESSION_LABELS[sessionMode].questions}-question mixed session
                </button>
              )}
            </div>
          )}
        </div>

        <DailyQuestsCard compact />

        {dueCount > 0 && hero.action !== 'review' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Due for review</p>
              <button
                type="button"
                onClick={onOpenJournal}
                className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline"
              >
                See all {dueCount}
              </button>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 p-4 flex flex-col gap-2">
              {dueMistakes.slice(0, 2).map((item) => item && (
                <div key={item.id} className="text-xs text-rose-600 dark:text-rose-400">
                  <span className="font-semibold">{item.data.word ?? item.data.context_sentence?.slice(0, 40)}</span>
                  {' · '}
                  <span>{SKILL_LABELS[item.skill]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <PracticePreview />

        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Focus lesson</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            10 questions on today&apos;s weak skill — different from a mixed session.
          </p>
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
                  title={ACHIEVEMENTS.find((a) => a.id === id)?.description}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  {ACHIEVEMENT_LABELS[id] ?? id.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your progress</p>
          <button
            type="button"
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
