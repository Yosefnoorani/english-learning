import { useMemo } from 'react'
import { Zap, Gem, Target } from 'lucide-react'
import { useGameStore, selectLevelLabel } from '@/store/useGameStore'
import {
  getDailyQuests,
  allQuestsComplete,
  isBonusQuestUnlocked,
  isQuestComplete,
} from '@/services/dailyQuestService'
import { buildOfflineLeaderboard, xpToNextRank } from '@/services/leagueService'
import { shouldDefaultContinueCta } from '@/services/experimentService'
import { xpProgressInLevel } from '@/services/rewardService'

interface SessionSummaryProps {
  onDone: () => void
}

export function SessionSummary({ onDone }: SessionSummaryProps) {
  const sessionAnswered = useGameStore((s) => s.sessionAnswered)
  const sessionCorrect = useGameStore((s) => s.sessionCorrect)
  const sessionCombo = useGameStore((s) => s.sessionCombo)
  const dailyGoalProgress = useGameStore((s) => s.userState.dailyGoalProgress)
  const dailyGoalTarget = useGameStore((s) => s.userState.dailyGoalTarget)
  const streak = useGameStore((s) => s.userState.streak)
  const streakFreezes = useGameStore((s) => s.userState.streakFreezes)
  const xp = useGameStore((s) => s.userState.xp)
  const gems = useGameStore((s) => s.userState.gems)
  const levelLabel = useGameStore(selectLevelLabel)
  const lastResult = useGameStore((s) => s.lastResult)
  const dailyQuestProgress = useGameStore((s) => s.dailyQuestProgress)
  const includeAudioQuestions = useGameStore((s) => s.includeAudioQuestions)
  const weeklyXp = useGameStore((s) => s.weeklyXp)
  const weekStartDate = useGameStore((s) => s.weekStartDate)
  const experiments = useGameStore((s) => s.experiments)
  const recordContinueNudge = useGameStore((s) => s.recordContinueNudge)
  const continueMicroSession = useGameStore((s) => s.continueSession)

  const quests = useMemo(
    () => getDailyQuests(new Date(), includeAudioQuestions),
    [includeAudioQuestions],
  )
  const questsComplete = allQuestsComplete(quests, dailyQuestProgress)
  const questsDoneCount = quests.filter((q) => !q.isBonus && isQuestComplete(q, dailyQuestProgress)).length
  const bonusUnlocked = isBonusQuestUnlocked(quests, dailyQuestProgress)
  const goalPercent = Math.min(100, Math.round((dailyGoalProgress / dailyGoalTarget) * 100))
  const goalClose = dailyGoalProgress < dailyGoalTarget && goalPercent >= 70

  const { members, userRank } = useMemo(
    () => buildOfflineLeaderboard(weeklyXp, weekStartDate),
    [weeklyXp, weekStartDate],
  )
  const xpBehind = xpToNextRank(members, userRank)
  const xpLevel = xpProgressInLevel(xp)

  const accuracy = sessionAnswered > 0 ? Math.round((sessionCorrect / sessionAnswered) * 100) : 0
  const passed = accuracy >= 60
  const sessionXp = sessionCorrect * 10

  const openLoops = [
    !questsComplete && questsDoneCount > 0
      ? `${questsDoneCount}/${quests.filter((q) => !q.isBonus).length} daily quests complete`
      : null,
    dailyGoalProgress < dailyGoalTarget
      ? `${dailyGoalTarget - dailyGoalProgress} more for today's goal`
      : null,
    streakFreezes > 0 ? `${streakFreezes} streak freeze${streakFreezes > 1 ? 's' : ''} available` : null,
    userRank > 1 && xpBehind > 0 ? `League: ${xpBehind} XP behind #${userRank - 1}` : null,
    bonusUnlocked && !isQuestComplete(quests.find((q) => q.isBonus)!, dailyQuestProgress)
      ? 'Bonus quest unlocked!'
      : null,
  ].filter(Boolean)

  function handleContinue() {
    recordContinueNudge()
    void continueMicroSession(true)
  }

  function handleDone() {
    onDone()
  }

  const defaultContinue = shouldDefaultContinueCta(experiments)

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
            <p className="text-xs text-violet-600 dark:text-violet-400 flex items-center gap-2">
              <span>+{sessionXp} XP</span>
              {gems > 0 && (
                <span className="flex items-center gap-0.5">
                  <Gem size={10} /> {gems} gems
                </span>
              )}
            </p>
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
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Lv {xpLevel.level}</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">XP Level</span>
            </div>
          </div>

          {openLoops.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Target size={12} />
                Still open today
              </p>
              {openLoops.map((loop) => (
                <p key={loop} className="text-xs text-amber-600 dark:text-amber-400">{loop}</p>
              ))}
            </div>
          )}

          {!passed && lastResult && !lastResult.isCorrect && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                {lastResult.similarity != null && lastResult.similarity >= 0.7 ? 'You were close!' : 'Remember'}
              </p>
              <p className="text-sm text-rose-800 dark:text-rose-200">{lastResult.correctAnswer}</p>
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
                className={`h-2.5 rounded-full transition-all duration-700 ${goalClose ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${goalClose ? 90 : goalPercent}%` }}
              />
            </div>
            {goalClose && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center">So close — keep going!</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {defaultContinue ? (
              <>
                <button
                  onClick={handleContinue}
                  className="w-full min-h-[52px] rounded-xl bg-indigo-600 text-white font-bold text-base shadow-md active:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Zap size={18} />
                  Continue (+5)
                </button>
                <button
                  onClick={handleDone}
                  className="w-full min-h-[44px] rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Done for now
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDone}
                  className="w-full min-h-[52px] rounded-xl bg-indigo-600 text-white font-bold text-base shadow-md flex items-center justify-center gap-2"
                >
                  Done for now
                </button>
                <button
                  onClick={handleContinue}
                  className="w-full min-h-[44px] rounded-xl border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Zap size={16} />
                  Continue (+5)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
