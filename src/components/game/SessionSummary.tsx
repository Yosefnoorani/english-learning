import { useMemo } from 'react'
import { Zap, BookOpen } from 'lucide-react'
import { useGameStore, selectLevelLabel } from '@/store/useGameStore'
import { getContentById } from '@/services/contentService'
import { SKILL_LABELS } from '@/types/game'

interface SessionSummaryProps {
  onContinue: () => void
  onDone: () => void
}

export function SessionSummary({ onContinue, onDone }: SessionSummaryProps) {
  const sessionAnswered = useGameStore((s) => s.sessionAnswered)
  const sessionCorrect = useGameStore((s) => s.sessionCorrect)
  const sessionCombo = useGameStore((s) => s.sessionCombo)
  const sessionLearnedIds = useGameStore((s) => s.sessionLearnedIds)
  const dailyGoalProgress = useGameStore((s) => s.userState.dailyGoalProgress)
  const dailyGoalTarget = useGameStore((s) => s.userState.dailyGoalTarget)
  const streak = useGameStore((s) => s.userState.streak)
  const levelLabel = useGameStore(selectLevelLabel)
  const sessionMode = useGameStore((s) => s.sessionMode)
  const lastResult = useGameStore((s) => s.lastResult)

  const mistakeReviewMode = useGameStore((s) => s.mistakeReviewMode)
  const vocabReviewQueue = useGameStore((s) => s.vocabReviewQueue)

  const accuracy = sessionAnswered > 0 ? Math.round((sessionCorrect / sessionAnswered) * 100) : 0
  const passed = accuracy >= 60
  const newWords = useMemo(
    () => sessionLearnedIds.filter((id) => {
      const item = getContentById(id)
      return item?.type === 'vocabulary' || item?.data.word
    }).length,
    [sessionLearnedIds],
  )
  const summaryLine = [
    `${sessionLearnedIds.length} item${sessionLearnedIds.length !== 1 ? 's' : ''} practised`,
    `${sessionCorrect} correct`,
    mistakeReviewMode ? 'mistake review session' : null,
    newWords > 0 ? `${newWords} vocab` : null,
    vocabReviewQueue.filter((e) => e.nextReviewAt <= Date.now()).length > 0
      ? `${vocabReviewQueue.filter((e) => e.nextReviewAt <= Date.now()).length} vocab due later`
      : null,
  ].filter(Boolean).join(' · ')

  const learnedItems = useMemo(
    () => sessionLearnedIds.slice(0, 3).map((id) => getContentById(id)).filter(Boolean),
    [sessionLearnedIds],
  )

  const recapItems = sessionLearnedIds.slice(-3).map((id) => getContentById(id)).filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm fade-in">
        <div className={`rounded-3xl p-7 shadow-2xl flex flex-col gap-5 max-h-[90svh] overflow-y-auto ${
          passed
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60'
            : 'bg-white dark:bg-slate-900'
        }`}>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-5xl">{passed ? '🎉' : '💪'}</div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {passed ? 'Session complete!' : 'Keep it up!'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {levelLabel} · {streak} day streak
              {sessionCombo >= 3 && ` · best combo ×${sessionCombo}`}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{summaryLine}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center bg-white/70 dark:bg-slate-800/70 rounded-2xl p-3 gap-1">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{sessionCorrect}</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Correct</span>
            </div>
            <div className="flex flex-col items-center bg-white/70 dark:bg-slate-800/70 rounded-2xl p-3 gap-1">
              <span className={`text-2xl font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {accuracy}%
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Accuracy</span>
            </div>
            <div className="flex flex-col items-center bg-white/70 dark:bg-slate-800/70 rounded-2xl p-3 gap-1">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                +{sessionCorrect * 10}
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Points</span>
            </div>
          </div>

          {learnedItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <BookOpen size={12} />
                What you practised
              </p>
              <ul className="flex flex-col gap-1.5">
                {learnedItems.map((item) => item && (
                  <li key={item.id} className="text-sm text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 rounded-lg px-3 py-2">
                    <span className="font-semibold">{item.data.word ?? item.data.correct_answer.slice(0, 40)}</span>
                    <span className="text-xs text-slate-400 block">{SKILL_LABELS[item.skill]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!passed && lastResult && !lastResult.isCorrect && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">Remember</p>
              <p className="text-sm text-rose-800 dark:text-rose-200">{lastResult.correctAnswer}</p>
            </div>
          )}

          {recapItems.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Quick recap</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {recapItems.map((i) => i?.data.word ?? i?.data.correct_answer.split(' ')[0]).join(' · ')}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Daily goal</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {dailyGoalProgress}/{dailyGoalTarget}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((dailyGoalProgress / dailyGoalTarget) * 100))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onContinue}
              className="w-full min-h-[52px] rounded-xl bg-indigo-600 text-white font-bold text-base shadow-md active:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Zap size={18} />
              {sessionMode === 'quick' ? 'Another quick session' : 'Practice 5 more'}
            </button>
            <button
              onClick={onDone}
              className="w-full min-h-[44px] rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              Done for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
