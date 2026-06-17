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
  getEffectivePracticeTier,
  MIN_TIER,
  MAX_TIER,
} from '@/services/adaptiveProgressionService'
import {
  upsertMistakeOnWrong,
  upsertMistakeOnCorrect,
  tickInSessionRequeue,
  clearRequeueAfterShown,
  pickNextRequeueItem,
} from '@/services/mistakeMasteryService'
import { getAllContent } from '@/services/contentService'

const PLACEMENT_QUESTIONS = 5
const BUFFER_SIZE = 12
const MAX_STREAK_FREEZES = 3
const RECENT_CONTENT_MAX = 50
const SESSION_SIZES: Record<SessionMode, number> = { quick: 5, standard: 10, deep: 20 }
const SESSION_MISTAKE_COOLDOWN = 8

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
  /** Highest tier ever reached — unlocks practice levels. */
  highestTierReached: number
  /** Absolute tier for question selection (1–highestTierReached). */
  practiceTier: number

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
  /** Recently seen content IDs — reduces repetition across sessions. */
  recentContentIds: string[]

  activeView: NavView
  resumeSnapshot: ResumeSnapshot | null
  /** IDs of mistake-queue items shown this session — used to enforce cooldown variety (not persisted). */
  sessionRecentMistakeIds: string[]

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
  setPracticeTier: (tier: number) => void
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

function trackRecentContentId(ids: string[], contentId: string): string[] {
  const next = [...ids.filter((id) => id !== contentId), contentId]
  return next.slice(-RECENT_CONTENT_MAX)
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
      highestTierReached: MIN_TIER,
      practiceTier: MIN_TIER,

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
      recentContentIds: [],
      activeView: 'practice',
      resumeSnapshot: null,
      sessionRecentMistakeIds: [],

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

      setPracticeTier: (tier) => {
        const { highestTierReached } = get()
        const clamped = Math.max(MIN_TIER, Math.min(highestTierReached, tier))
        set({ practiceTier: clamped })
      },

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
          highestTierReached: MIN_TIER,
          practiceTier: MIN_TIER,
          resumeSnapshot: null,
          activeView: 'practice',
        }),

      dismissSessionSummary: () => {
        set({ showSessionSummary: false, sessionAnswered: 0, sessionCorrect: 0 })
        get().saveResumeSnapshot()
      },

      continueSession: async () => {
        const { practiceTier, skillStats, mistakeQueue, recentContentIds } = get()
        const items = await fetchQuestions(practiceTier, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue, recentContentIds)
        set({
          questionBuffer: items,
          currentIndex: 0,
          showSessionSummary: false,
          sessionAnswered: 0,
          sessionCorrect: 0,
          sessionRecentMistakeIds: [],
        })
        get().saveResumeSnapshot()
      },

      initGame: async () => {
        set({ isLoading: true })
        const state = get()

        if (!state.hasCompletedSetup && state.phase !== 'placement') {
          set({
            phase: 'gameplay',
            hasCompletedSetup: true,
            currentTier: MIN_TIER,
            highestTierReached: MIN_TIER,
            practiceTier: MIN_TIER,
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
        const tier = Math.min(MAX_TIER, Math.max(MIN_TIER, Math.floor((finalRating - 350) / 50) + 1))
        const { skillStats, mistakeQueue, recentContentIds } = get()
        const items = await fetchQuestions(tier, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue, recentContentIds)
        set((s) => ({
          phase: 'gameplay',
          userState: { ...s.userState, rating: finalRating },
          currentTier: tier,
          highestTierReached: tier,
          practiceTier: tier,
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
          highestTierReached,
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

        let tierChanged = false
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
          tierChanged = tierAction.promoted
          if (tierAction.promoted) {
            didLevelUp = true
            highestTierReached = Math.max(highestTierReached, tierAction.newTier)
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
          tierChanged = tierAction.demoted
          if (tierAction.demoted) {
            streak = 0
          }
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
          recentContentIds: trackRecentContentId(state.recentContentIds, item.id),
          currentTier,
          tierCorrectStreak,
          tierWrongStreak,
          hadRecentMistakeAtTier,
          highestTierReached,
        })

        if (tierChanged) {
          const s = get()
          const fresh = await fetchQuestions(
            s.practiceTier,
            'gameplay',
            BUFFER_SIZE,
            s.skillStats,
            s.mistakeQueue,
            s.recentContentIds,
          )
          const answeredIds = new Set(s.questionBuffer.slice(0, s.currentIndex + 1).map((q) => q.id))
          const newItems = fresh.filter((q) => !answeredIds.has(q.id))
          set({ questionBuffer: [...s.questionBuffer.slice(0, s.currentIndex + 1), ...newItems] })
        }

        get().saveResumeSnapshot()
      },

      nextQuestion: async () => {
        const {
          questionBuffer,
          currentIndex,
          practiceTier,
          phase,
          skillStats,
          mistakeQueue,
          recentContentIds,
          sessionRecentMistakeIds,
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

        // Build an exclusion set: items already queued ahead + recently shown mistake items.
        const aheadIds = new Set(questionBuffer.slice(nextIndex).map((q) => q.id))
        const cooldownIds = new Set([...aheadIds, ...sessionRecentMistakeIds])

        const requeueToInject = pickNextRequeueItem(newQueue, getAllContent(), cooldownIds)

        if (requeueToInject && nextIndex < questionBuffer.length) {
          const newBuffer = [...questionBuffer]
          newBuffer.splice(nextIndex, 0, requeueToInject)

          // Track this mistake item in the session cooldown window.
          const updatedCooldown = [
            ...sessionRecentMistakeIds.filter((id) => id !== requeueToInject.id),
            requeueToInject.id,
          ].slice(-SESSION_MISTAKE_COOLDOWN)

          set({
            questionBuffer: newBuffer,
            currentIndex: nextIndex,
            showFeedback: false,
            triggerHint: false,
            mistakeQueue: newQueue,
            sessionRecentMistakeIds: updatedCooldown,
          })
          get().saveResumeSnapshot()
          return
        }

        if (nextIndex >= questionBuffer.length - 3) {
          // Include session mistake cooldown IDs in the exclude list so the buffer refill
          // also avoids recently reviewed mistake items.
          const excludeForFetch = [...new Set([...recentContentIds, ...sessionRecentMistakeIds])]
          const fresh = await fetchQuestions(practiceTier, 'gameplay', BUFFER_SIZE, skillStats, newQueue, excludeForFetch)
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
        const { showSessionSummary, phase, placementAnswered, placementRatingSum } = get()
        set({ showFeedback: false })
        if (showSessionSummary) return

        if (phase === 'placement' && placementAnswered >= PLACEMENT_QUESTIONS) {
          const finalRating = Math.round(placementRatingSum / PLACEMENT_QUESTIONS)
          const clamped = Math.max(350, Math.min(900, finalRating))
          void get().completePlacement(clamped)
          return
        }

        void get().nextQuestion()
      },

      toggleMistakeReview: async () => {
        const { mistakeReviewMode, practiceTier } = get()
        if (mistakeReviewMode) {
          const { skillStats, mistakeQueue, recentContentIds } = get()
          const items = await fetchQuestions(practiceTier, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue, recentContentIds)
          set({ mistakeReviewMode: false, phase: 'gameplay', questionBuffer: items, currentIndex: 0, sessionRecentMistakeIds: [] })
        } else {
          const items = await fetchReviewItems('anonymous')
          set({
            mistakeReviewMode: true,
            phase: 'review',
            questionBuffer: items.length ? items : get().questionBuffer,
            currentIndex: 0,
            sessionAnswered: 0,
            sessionCorrect: 0,
            sessionRecentMistakeIds: [],
          })
        }
        get().saveResumeSnapshot()
      },
    }),
    {
      name: 'english-game-storage',
      version: 5,
      migrate: (persisted: unknown, version: number) => {
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
        if (s.recentContentIds === undefined) s.recentContentIds = []
        if (s.activeView === undefined) s.activeView = 'practice'

        if (version < 5) {
          const currentTier = (s.currentTier as number) ?? MIN_TIER
          const offset = (s.practiceTierOffset as number) ?? 0
          if (s.practiceTier === undefined) {
            s.practiceTier = getEffectivePracticeTier(currentTier, offset)
          }
          if (s.highestTierReached === undefined) {
            s.highestTierReached = Math.max(MIN_TIER, currentTier)
          }
          delete s.practiceTierOffset
        }

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
        highestTierReached: state.highestTierReached,
        practiceTier: state.practiceTier,
        recentContentIds: state.recentContentIds,
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
