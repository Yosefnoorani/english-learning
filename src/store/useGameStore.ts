import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import confetti from 'canvas-confetti'
import type {
  ContentItem,
  GamePhase,
  UserState,
  AnswerResult,
  SkillId,
  SkillStats,
  MistakeEntry,
  SessionMode,
  AppTheme,
  NavView,
  ResumeSnapshot,
} from '@/types/game'
import { fetchQuestions, fetchReviewItems, submitTelemetry } from '@/services/gameService'
import { gradeAnswer } from '@/services/gradingService'
import { getContentByIds } from '@/services/contentService'
import {
  onCorrect as tierOnCorrect,
  onWrong as tierOnWrong,
  getPromotionTarget,
  getTierLabel,
  getRatingFromTier,
  MIN_TIER,
} from '@/services/adaptiveProgressionService'
import {
  upsertMistakeOnWrong,
  upsertMistakeOnCorrect,
  tickInSessionRequeue,
  clearRequeueAfterShown,
  getInSessionRequeueItems,
} from '@/services/mistakeMasteryService'
import { getAllContent } from '@/services/contentService'

const PLACEMENT_QUESTIONS = 5
const BUFFER_SIZE = 12
const MAX_STREAK_FREEZES = 3
const SESSION_SIZES: Record<SessionMode, number> = { quick: 5, standard: 10, deep: 20 }

interface GameState {
  userState: UserState
  questionBuffer: ContentItem[]
  currentIndex: number
  phase: GamePhase
  placementAnswered: number
  placementRatingSum: number
  showFeedback: boolean
  lastResult: AnswerResult | null
  triggerHint: boolean
  mistakeReviewMode: boolean
  consecutiveCorrect: number
  consecutiveWrong: number
  isLoading: boolean
  skillStats: Record<SkillId, SkillStats>
  mistakeQueue: MistakeEntry[]

  currentTier: number
  tierCorrectStreak: number
  tierWrongStreak: number
  hadRecentMistakeAtTier: boolean

  sessionAnswered: number
  sessionCorrect: number
  showSessionSummary: boolean

  sessionMode: SessionMode
  theme: AppTheme
  sounds: boolean
  haptics: boolean
  reducedMotion: boolean
  hasSeenOnboarding: boolean
  hasCompletedSetup: boolean
  voiceLang: string
  voiceRate: number

  activeView: NavView
  resumeSnapshot: ResumeSnapshot | null

  initGame: () => Promise<void>
  submitAnswer: (answer: string) => Promise<void>
  nextQuestion: () => Promise<void>
  startPlacement: () => Promise<void>
  completePlacement: (finalRating: number) => Promise<void>
  toggleMistakeReview: () => Promise<void>
  dismissFeedback: () => void
  dismissSessionSummary: () => void
  continueSession: () => Promise<void>
  setActiveView: (view: NavView) => void
  saveResumeSnapshot: () => void

  setTheme: (theme: AppTheme) => void
  setSessionMode: (mode: SessionMode) => void
  setSounds: (v: boolean) => void
  setHaptics: (v: boolean) => void
  setReducedMotion: (v: boolean) => void
  markOnboardingSeen: () => void
  setVoice: (lang: string, rate: number) => void
  setDailyGoalTarget: (n: number) => void
  resetProgress: () => void
  showOnboardingTour: () => void
}

function initialSkillStats(): Record<SkillId, SkillStats> {
  return {} as Record<SkillId, SkillStats>
}

function updateSkillStats(
  current: Record<SkillId, SkillStats>,
  skill: SkillId,
  isCorrect: boolean,
): Record<SkillId, SkillStats> {
  const existing = current[skill] ?? { correct: 0, wrong: 0, lastSeen: 0 }
  return {
    ...current,
    [skill]: {
      correct: existing.correct + (isCorrect ? 1 : 0),
      wrong: existing.wrong + (isCorrect ? 0 : 1),
      lastSeen: Date.now(),
    },
  }
}

function fireConfetti(type: 'levelup' | 'daily') {
  if (type === 'levelup') {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'] })
  } else {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#10b981', '#34d399', '#6ee7b7'] })
  }
}

function applyDailyReset(userState: UserState, todayStr: string): Partial<UserState> {
  const { lastActiveDate } = userState
  if (!lastActiveDate || lastActiveDate === todayStr) return {}

  const lastMs = new Date(lastActiveDate).getTime()
  const todayMs = new Date(todayStr).getTime()
  const daysMissed = Math.max(0, Math.floor((todayMs - lastMs) / 86400000) - 1)

  let { streak, streakFreezes } = userState
  if (daysMissed > 0) {
    const freezesToUse = Math.min(daysMissed, streakFreezes)
    streakFreezes = Math.max(0, streakFreezes - freezesToUse)
    if (daysMissed > freezesToUse) streak = 0
  }

  return { dailyGoalProgress: 0, lastActiveDate: todayStr, streak, streakFreezes }
}

function buildResumeSnapshot(state: GameState): ResumeSnapshot | null {
  if (state.questionBuffer.length === 0) return null
  return {
    bufferIds: state.questionBuffer.map((q) => q.id),
    currentIndex: state.currentIndex,
    sessionAnswered: state.sessionAnswered,
    sessionCorrect: state.sessionCorrect,
    mistakeReviewMode: state.mistakeReviewMode,
  }
}

function migrateMistakeQueue(queue: MistakeEntry[]): MistakeEntry[] {
  return queue.map((e) => ({
    ...e,
    consecutiveCorrect: e.consecutiveCorrect ?? 0,
    mastered: e.mastered ?? false,
  }))
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      userState: {
        rating: getRatingFromTier(MIN_TIER),
        streak: 0,
        score: 0,
        dailyGoalProgress: 0,
        dailyGoalTarget: 10,
        lastActiveDate: '',
        streakFreezes: 0,
      },
      questionBuffer: [],
      currentIndex: 0,
      phase: 'gameplay' as GamePhase,
      placementAnswered: 0,
      placementRatingSum: 0,
      showFeedback: false,
      lastResult: null,
      triggerHint: false,
      mistakeReviewMode: false,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      isLoading: false,
      skillStats: initialSkillStats(),
      mistakeQueue: [],

      currentTier: MIN_TIER,
      tierCorrectStreak: 0,
      tierWrongStreak: 0,
      hadRecentMistakeAtTier: false,

      sessionAnswered: 0,
      sessionCorrect: 0,
      showSessionSummary: false,
      sessionMode: 'standard',
      theme: 'system',
      sounds: true,
      haptics: true,
      reducedMotion: false,
      hasSeenOnboarding: false,
      hasCompletedSetup: false,
      voiceLang: 'en-GB',
      voiceRate: 0.9,
      activeView: 'practice',
      resumeSnapshot: null,

      setTheme: (theme) => set({ theme }),
      setSessionMode: (mode) => set({ sessionMode: mode }),
      setSounds: (v) => set({ sounds: v }),
      setHaptics: (v) => set({ haptics: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      showOnboardingTour: () => set({ hasSeenOnboarding: false }),
      setVoice: (lang, rate) => set({ voiceLang: lang, voiceRate: rate }),
      setDailyGoalTarget: (n) =>
        set((s) => ({ userState: { ...s.userState, dailyGoalTarget: n } })),

      setActiveView: (view) => {
        get().saveResumeSnapshot()
        set({ activeView: view })
      },

      saveResumeSnapshot: () => {
        const snap = buildResumeSnapshot(get())
        set({ resumeSnapshot: snap })
      },

      resetProgress: () =>
        set({
          userState: {
            rating: getRatingFromTier(MIN_TIER),
            streak: 0,
            score: 0,
            dailyGoalProgress: 0,
            dailyGoalTarget: 10,
            lastActiveDate: '',
            streakFreezes: 0,
          },
          skillStats: initialSkillStats(),
          mistakeQueue: [],
          phase: 'gameplay',
          questionBuffer: [],
          currentIndex: 0,
          consecutiveCorrect: 0,
          consecutiveWrong: 0,
          sessionAnswered: 0,
          sessionCorrect: 0,
          showSessionSummary: false,
          hasCompletedSetup: true,
          currentTier: MIN_TIER,
          tierCorrectStreak: 0,
          tierWrongStreak: 0,
          hadRecentMistakeAtTier: false,
          resumeSnapshot: null,
          activeView: 'practice',
        }),

      dismissSessionSummary: () => {
        set({ showSessionSummary: false, sessionAnswered: 0, sessionCorrect: 0 })
        get().saveResumeSnapshot()
      },

      continueSession: async () => {
        const { currentTier, skillStats, mistakeQueue } = get()
        const items = await fetchQuestions(currentTier, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue)
        set({
          questionBuffer: items,
          currentIndex: 0,
          showSessionSummary: false,
          sessionAnswered: 0,
          sessionCorrect: 0,
        })
        get().saveResumeSnapshot()
      },

      initGame: async () => {
        set({ isLoading: true })
        const state = get()

        if (state.phase === 'placement' && state.hasCompletedSetup) {
          set({ phase: 'gameplay' })
        }

        if (!state.hasCompletedSetup) {
          set({
            phase: 'gameplay',
            hasCompletedSetup: true,
            currentTier: MIN_TIER,
            userState: { ...state.userState, rating: getRatingFromTier(MIN_TIER) },
          })
        }

        const { resumeSnapshot, phase } = get()

        if (phase === 'placement') {
          await get().startPlacement()
          set({ isLoading: false })
          return
        }

        if (resumeSnapshot?.bufferIds.length) {
          const items = getContentByIds(resumeSnapshot.bufferIds)
          if (items.length > 0) {
            set({
              questionBuffer: items,
              currentIndex: Math.min(resumeSnapshot.currentIndex, items.length - 1),
              sessionAnswered: resumeSnapshot.sessionAnswered,
              sessionCorrect: resumeSnapshot.sessionCorrect,
              mistakeReviewMode: resumeSnapshot.mistakeReviewMode,
              phase: resumeSnapshot.mistakeReviewMode ? 'review' : 'gameplay',
            })
            set({ isLoading: false })
            return
          }
        }

        set({ questionBuffer: [], currentIndex: 0, isLoading: false })
      },

      startPlacement: async () => {
        const items = await fetchQuestions(MIN_TIER, 'placement', PLACEMENT_QUESTIONS)
        set({
          phase: 'placement',
          questionBuffer: items,
          currentIndex: 0,
          placementAnswered: 0,
          placementRatingSum: 0,
        })
      },

      completePlacement: async (finalRating: number) => {
        const tier = Math.min(10, Math.max(1, Math.floor((finalRating - 350) / 50) + 1))
        const { skillStats, mistakeQueue } = get()
        const items = await fetchQuestions(tier, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue)
        set((s) => ({
          phase: 'gameplay',
          userState: { ...s.userState, rating: finalRating },
          currentTier: tier,
          tierCorrectStreak: 0,
          tierWrongStreak: 0,
          hadRecentMistakeAtTier: false,
          questionBuffer: items,
          currentIndex: 0,
          sessionAnswered: 0,
          sessionCorrect: 0,
          hasCompletedSetup: true,
        }))
        get().saveResumeSnapshot()
      },

      submitAnswer: async (answer: string) => {
        const state = get()
        const { questionBuffer, currentIndex, phase, sessionMode } = state
        const item = questionBuffer[currentIndex]
        if (!item) return

        const gradingResult = gradeAnswer(item, answer)
        const isCorrect = gradingResult.isCorrect

        const result: AnswerResult & { userAnswer: string; explanation?: string } = {
          isCorrect,
          correctAnswer: item.data.correct_answer,
          item,
          userAnswer: answer,
          errorMarks: gradingResult.errors,
          similarity: gradingResult.similarity,
          explanation: gradingResult.explanation,
        }

        if (phase === 'placement') {
          const ratingContrib = isCorrect ? item.difficulty + 50 : item.difficulty - 50
          const newAnswered = state.placementAnswered + 1
          const newSum = state.placementRatingSum + ratingContrib

          if (newAnswered >= PLACEMENT_QUESTIONS) {
            const finalRating = Math.round(newSum / PLACEMENT_QUESTIONS)
            const clamped = Math.max(350, Math.min(900, finalRating))
            await get().completePlacement(clamped)
            return
          }

          set({
            placementAnswered: newAnswered,
            placementRatingSum: newSum,
            lastResult: result,
            showFeedback: true,
          })
          return
        }

        let {
          currentTier,
          tierCorrectStreak,
          tierWrongStreak,
          hadRecentMistakeAtTier,
        } = state
        let { rating, streak, score, dailyGoalProgress, dailyGoalTarget, lastActiveDate, streakFreezes } =
          state.userState
        let triggerHint = false
        let didLevelUp = false

        const todayStr = new Date().toDateString()
        const resetFields = applyDailyReset(state.userState, todayStr)
        if (resetFields.dailyGoalProgress !== undefined) {
          dailyGoalProgress = 0
          streak = resetFields.streak ?? streak
          streakFreezes = resetFields.streakFreezes ?? streakFreezes
          lastActiveDate = todayStr
        } else if (!lastActiveDate) {
          lastActiveDate = todayStr
        }

        const newSkillStats = updateSkillStats(state.skillStats, item.skill, isCorrect)

        let newMistakeQueue = state.mistakeQueue
        if (isCorrect) {
          newMistakeQueue = upsertMistakeOnCorrect(newMistakeQueue, item.id)
        } else {
          newMistakeQueue = upsertMistakeOnWrong(newMistakeQueue, item.id, answer)
        }
        newMistakeQueue = tickInSessionRequeue(newMistakeQueue)

        submitTelemetry({
          contentId: item.id,
          isCorrect,
          failCount: isCorrect ? 0 : 1,
          lastSeen: new Date(),
          nextReviewDue: new Date(),
        }).catch(console.warn)

        const newSessionAnswered = state.sessionAnswered + 1
        const newSessionCorrect = state.sessionCorrect + (isCorrect ? 1 : 0)
        const sessionSize = SESSION_SIZES[sessionMode]
        const sessionDone = newSessionAnswered >= sessionSize

        if (isCorrect) {
          const tierAction = tierOnCorrect(
            currentTier,
            tierCorrectStreak,
            tierWrongStreak,
            hadRecentMistakeAtTier,
          )
          currentTier = tierAction.newTier
          tierCorrectStreak = tierAction.tierCorrectStreak
          tierWrongStreak = tierAction.tierWrongStreak
          hadRecentMistakeAtTier = tierAction.hadRecentMistakeAtTier
          rating = tierAction.newRating
          if (tierAction.promoted) {
            didLevelUp = true
            setTimeout(() => fireConfetti('levelup'), 100)
          }

          score += 10
          streak += 1
          dailyGoalProgress = Math.min(dailyGoalProgress + 1, dailyGoalTarget)
          if (streak > 0 && streak % 7 === 0) {
            streakFreezes = Math.min(MAX_STREAK_FREEZES, streakFreezes + 1)
          }
          if (dailyGoalProgress === dailyGoalTarget) {
            setTimeout(() => fireConfetti('daily'), didLevelUp ? 1500 : 100)
          }
        } else {
          const tierAction = tierOnWrong(currentTier, tierCorrectStreak, tierWrongStreak)
          currentTier = tierAction.newTier
          tierCorrectStreak = tierAction.tierCorrectStreak
          tierWrongStreak = tierAction.tierWrongStreak
          hadRecentMistakeAtTier = tierAction.hadRecentMistakeAtTier
          rating = tierAction.newRating
          streak = 0
          triggerHint = true
        }

        set({
          triggerHint,
          lastResult: result,
          showFeedback: true,
          showSessionSummary: isCorrect && sessionDone,
          sessionAnswered: newSessionAnswered,
          sessionCorrect: newSessionCorrect,
          userState: { rating, streak, score, dailyGoalProgress, dailyGoalTarget, lastActiveDate, streakFreezes },
          skillStats: newSkillStats,
          mistakeQueue: newMistakeQueue,
          currentTier,
          tierCorrectStreak,
          tierWrongStreak,
          hadRecentMistakeAtTier,
        })

        get().saveResumeSnapshot()
      },

      nextQuestion: async () => {
        const {
          questionBuffer,
          currentIndex,
          currentTier,
          phase,
          skillStats,
          mistakeQueue,
        } = get()
        const currentItem = questionBuffer[currentIndex]
        const nextIndex = currentIndex + 1

        if (phase === 'placement') {
          set({ currentIndex: nextIndex, showFeedback: false, triggerHint: false })
          get().saveResumeSnapshot()
          return
        }

        let newQueue = mistakeQueue
        if (currentItem) {
          newQueue = clearRequeueAfterShown(newQueue, currentItem.id)
        }

        const requeueItems = getInSessionRequeueItems(newQueue, getAllContent())
        const requeueToInject = requeueItems.find(
          (i) => !questionBuffer.slice(nextIndex).some((q) => q.id === i.id),
        )

        if (requeueToInject && nextIndex < questionBuffer.length) {
          const newBuffer = [...questionBuffer]
          newBuffer.splice(nextIndex, 0, requeueToInject)
          set({
            questionBuffer: newBuffer,
            currentIndex: nextIndex,
            showFeedback: false,
            triggerHint: false,
            mistakeQueue: newQueue,
          })
          get().saveResumeSnapshot()
          return
        }

        if (nextIndex >= questionBuffer.length - 3) {
          const fresh = await fetchQuestions(currentTier, 'gameplay', BUFFER_SIZE, skillStats, newQueue)
          const existingIds = new Set(questionBuffer.map((q) => q.id))
          const newItems = fresh.filter((q) => !existingIds.has(q.id))
          set((s) => ({
            questionBuffer: [...s.questionBuffer.slice(nextIndex), ...newItems],
            currentIndex: 0,
            showFeedback: false,
            triggerHint: false,
            mistakeQueue: newQueue,
          }))
        } else {
          set({
            currentIndex: nextIndex,
            showFeedback: false,
            triggerHint: false,
            mistakeQueue: newQueue,
          })
        }
        get().saveResumeSnapshot()
      },

      dismissFeedback: () => {
        const { showSessionSummary } = get()
        set({ showFeedback: false })
        if (showSessionSummary) return
        get().nextQuestion()
      },

      toggleMistakeReview: async () => {
        const { mistakeReviewMode, currentTier } = get()
        if (mistakeReviewMode) {
          const { skillStats, mistakeQueue } = get()
          const items = await fetchQuestions(currentTier, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue)
          set({ mistakeReviewMode: false, phase: 'gameplay', questionBuffer: items, currentIndex: 0 })
        } else {
          const items = await fetchReviewItems('anonymous')
          set({
            mistakeReviewMode: true,
            phase: 'review',
            questionBuffer: items.length ? items : get().questionBuffer,
            currentIndex: 0,
            sessionAnswered: 0,
            sessionCorrect: 0,
          })
        }
        get().saveResumeSnapshot()
      },
    }),
    {
      name: 'english-game-storage',
      version: 2,
      migrate: (persisted: unknown) => {
        const s = persisted as Record<string, unknown>
        if (s.mistakeQueue && Array.isArray(s.mistakeQueue)) {
          s.mistakeQueue = migrateMistakeQueue(s.mistakeQueue as MistakeEntry[])
        }
        if (s.phase === 'gameplay' || s.hasSeenOnboarding) {
          s.hasCompletedSetup = true
        }
        if (s.currentTier === undefined) s.currentTier = MIN_TIER
        if (s.tierCorrectStreak === undefined) s.tierCorrectStreak = 0
        if (s.tierWrongStreak === undefined) s.tierWrongStreak = 0
        if (s.hadRecentMistakeAtTier === undefined) s.hadRecentMistakeAtTier = false
        if (s.activeView === undefined) s.activeView = 'practice'
        return s
      },
      partialize: (state) => ({
        userState: state.userState,
        skillStats: state.skillStats,
        mistakeQueue: state.mistakeQueue,
        phase: state.phase,
        sessionMode: state.sessionMode,
        theme: state.theme,
        sounds: state.sounds,
        haptics: state.haptics,
        reducedMotion: state.reducedMotion,
        hasSeenOnboarding: state.hasSeenOnboarding,
        hasCompletedSetup: state.hasCompletedSetup,
        voiceLang: state.voiceLang,
        voiceRate: state.voiceRate,
        currentTier: state.currentTier,
        tierCorrectStreak: state.tierCorrectStreak,
        tierWrongStreak: state.tierWrongStreak,
        hadRecentMistakeAtTier: state.hadRecentMistakeAtTier,
        activeView: state.activeView,
        resumeSnapshot: state.resumeSnapshot,
      }),
    },
  ),
)

export const selectCurrentItem = (s: GameState): ContentItem | undefined =>
  s.questionBuffer[s.currentIndex]

export const selectLevelLabel = (s: GameState): string => {
  if (s.phase === 'placement') return 'Placement Test'
  return getTierLabel(s.currentTier)
}

export const selectTierProgress = (s: GameState): { current: number; target: number } => ({
  current: s.tierCorrectStreak,
  target: getPromotionTarget(s.hadRecentMistakeAtTier),
})

export function getSkillMastery(
  skillStats: Record<SkillId, SkillStats>,
): Array<{ skill: SkillId; mastery: number; total: number }> {
  return (Object.entries(skillStats) as [SkillId, SkillStats][])
    .map(([skill, stats]) => ({
      skill,
      mastery: stats.correct + stats.wrong > 0 ? stats.correct / (stats.correct + stats.wrong) : -1,
      total: stats.correct + stats.wrong,
    }))
    .sort((a, b) => a.mastery - b.mastery)
}

export const selectSkillMastery = (s: GameState) => getSkillMastery(s.skillStats)

/** Pure helper — do not call Date.now() inside a Zustand selector (breaks React 19 getSnapshot). */
export function getDueCount(queue: MistakeEntry[], now = Date.now()): number {
  return queue.filter((e) => !e.mastered && e.nextDueAt <= now).length
}
