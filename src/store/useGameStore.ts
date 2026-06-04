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
} from '@/types/game'
import { fetchQuestions, fetchReviewItems, submitTelemetry } from '@/services/gameService'
import { gradeAnswer } from '@/services/gradingService'

// ── Constants ────────────────────────────────────────────────
const PLACEMENT_QUESTIONS = 5
const BUFFER_SIZE = 12

const CORRECT_STREAK_THRESHOLD = 3
const WRONG_STREAK_THRESHOLD = 2
const RATING_INCREASE = 3
const RATING_DECREASE = 2
const MAX_STREAK_FREEZES = 3

const SESSION_SIZES: Record<SessionMode, number> = { quick: 5, standard: 10, deep: 20 }

// SM-2 lite intervals (milliseconds)
const SRS_INTERVALS = [
  1 * 24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
]

// ── State interface ──────────────────────────────────────────
interface GameState {
  // Core game
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

  // Session tracking
  sessionAnswered: number
  sessionCorrect: number
  showSessionSummary: boolean

  // App settings (persisted)
  sessionMode: SessionMode
  theme: AppTheme
  sounds: boolean
  haptics: boolean
  reducedMotion: boolean
  hasSeenOnboarding: boolean
  voiceLang: string
  voiceRate: number

  // Actions — game
  initGame: () => Promise<void>
  submitAnswer: (answer: string) => Promise<void>
  nextQuestion: () => Promise<void>
  startPlacement: () => Promise<void>
  completePlacement: (finalRating: number) => Promise<void>
  toggleMistakeReview: () => Promise<void>
  dismissFeedback: () => void
  dismissSessionSummary: () => void
  continueSession: () => Promise<void>

  // Actions — settings
  setTheme: (theme: AppTheme) => void
  setSessionMode: (mode: SessionMode) => void
  setSounds: (v: boolean) => void
  setHaptics: (v: boolean) => void
  setReducedMotion: (v: boolean) => void
  markOnboardingSeen: () => void
  setVoice: (lang: string, rate: number) => void
  setDailyGoalTarget: (n: number) => void
  resetProgress: () => void
}

// ── Helpers ──────────────────────────────────────────────────
function levelBand(rating: number): string {
  if (rating < 400) return 'Starter'
  if (rating < 500) return 'Beginner'
  if (rating < 600) return 'Elementary'
  if (rating < 700) return 'Intermediate'
  if (rating < 850) return 'Upper-Intermediate'
  return 'Advanced'
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

function nextSrsInterval(failCount: number): number {
  const idx = Math.min(failCount - 1, SRS_INTERVALS.length - 1)
  return SRS_INTERVALS[Math.max(0, idx)]
}

function upsertMistakeQueue(queue: MistakeEntry[], contentId: string, isCorrect: boolean): MistakeEntry[] {
  if (isCorrect) return queue.filter((e) => e.contentId !== contentId)
  const existing = queue.find((e) => e.contentId === contentId)
  const failCount = (existing?.failCount ?? 0) + 1
  const nextDueAt = Date.now() + nextSrsInterval(failCount)
  const entry: MistakeEntry = { contentId, failedAt: Date.now(), nextDueAt, failCount }
  return [...queue.filter((e) => e.contentId !== contentId), entry]
}

function fireConfetti(type: 'levelup' | 'daily') {
  if (type === 'levelup') {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'] })
  } else {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#10b981', '#34d399', '#6ee7b7'] })
    setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 70, origin: { x: 0 }, colors: ['#6366f1', '#818cf8'] }), 300)
    setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 70, origin: { x: 1 }, colors: ['#f59e0b', '#fbbf24'] }), 500)
  }
}

/** Check if daily date changed and return updated userState fields */
function applyDailyReset(
  userState: UserState,
  todayStr: string,
): Partial<UserState> {
  const { lastActiveDate } = userState
  if (!lastActiveDate || lastActiveDate === todayStr) return {}

  // Calculate missed days (days between last active and today - 1, since current day is the first new day)
  const lastMs = new Date(lastActiveDate).getTime()
  const todayMs = new Date(todayStr).getTime()
  const daysMissed = Math.max(0, Math.floor((todayMs - lastMs) / 86400000) - 1)

  let { streak, streakFreezes } = userState
  if (daysMissed > 0) {
    // Each missed day consumes a freeze or resets
    const freezesToUse = Math.min(daysMissed, streakFreezes)
    streakFreezes = Math.max(0, streakFreezes - freezesToUse)
    if (daysMissed > freezesToUse) {
      streak = 0
    }
  }

  return { dailyGoalProgress: 0, lastActiveDate: todayStr, streak, streakFreezes }
}

// ── Store ────────────────────────────────────────────────────
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      userState: {
        rating: 500,
        streak: 0,
        score: 0,
        dailyGoalProgress: 0,
        dailyGoalTarget: 10,
        lastActiveDate: '',
        streakFreezes: 0,
      },
      questionBuffer: [],
      currentIndex: 0,
      phase: 'placement' as GamePhase,
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
      sessionAnswered: 0,
      sessionCorrect: 0,
      showSessionSummary: false,
      sessionMode: 'standard',
      theme: 'system',
      sounds: true,
      haptics: true,
      reducedMotion: false,
      hasSeenOnboarding: false,
      voiceLang: 'en-GB',
      voiceRate: 0.9,

      // ── Settings actions ─────────────────────────────────
      setTheme: (theme) => set({ theme }),
      setSessionMode: (mode) => set({ sessionMode: mode }),
      setSounds: (v) => set({ sounds: v }),
      setHaptics: (v) => set({ haptics: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      setVoice: (lang, rate) => set({ voiceLang: lang, voiceRate: rate }),
      setDailyGoalTarget: (n) =>
        set((s) => ({ userState: { ...s.userState, dailyGoalTarget: n } })),
      resetProgress: () =>
        set({
          userState: {
            rating: 500,
            streak: 0,
            score: 0,
            dailyGoalProgress: 0,
            dailyGoalTarget: 10,
            lastActiveDate: '',
            streakFreezes: 0,
          },
          skillStats: initialSkillStats(),
          mistakeQueue: [],
          phase: 'placement',
          questionBuffer: [],
          currentIndex: 0,
          consecutiveCorrect: 0,
          consecutiveWrong: 0,
          sessionAnswered: 0,
          sessionCorrect: 0,
          showSessionSummary: false,
          hasSeenOnboarding: false,
        }),

      // ── Session summary ──────────────────────────────────
      dismissSessionSummary: () => set({ showSessionSummary: false, sessionAnswered: 0, sessionCorrect: 0 }),

      continueSession: async () => {
        const { userState, skillStats, mistakeQueue } = get()
        const items = await fetchQuestions(userState.rating, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue)
        set({
          questionBuffer: items,
          currentIndex: 0,
          showSessionSummary: false,
          sessionAnswered: 0,
          sessionCorrect: 0,
        })
      },

      // ── Game actions ─────────────────────────────────────
      initGame: async () => {
        const { phase } = get()
        if (phase !== 'placement' && get().questionBuffer.length > 0) return
        set({ isLoading: true })
        await get().startPlacement()
        set({ isLoading: false })
      },

      startPlacement: async () => {
        const items = await fetchQuestions(500, 'placement', PLACEMENT_QUESTIONS)
        set({ phase: 'placement', questionBuffer: items, currentIndex: 0, placementAnswered: 0, placementRatingSum: 0 })
      },

      completePlacement: async (finalRating: number) => {
        const { skillStats, mistakeQueue } = get()
        const items = await fetchQuestions(finalRating, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue)
        set((s) => ({
          phase: 'gameplay',
          userState: { ...s.userState, rating: finalRating },
          questionBuffer: items,
          currentIndex: 0,
          consecutiveCorrect: 0,
          consecutiveWrong: 0,
          sessionAnswered: 0,
          sessionCorrect: 0,
        }))
      },

      submitAnswer: async (answer: string) => {
        const state = get()
        const { questionBuffer, currentIndex, phase, sessionMode } = state
        const item = questionBuffer[currentIndex]
        if (!item) return

        const gradingResult = gradeAnswer(item, answer)
        const isCorrect = gradingResult.isCorrect

        const result: AnswerResult & { userAnswer: string } = {
          isCorrect,
          correctAnswer: item.data.correct_answer,
          item,
          userAnswer: answer,
          errorMarks: gradingResult.errors,
          similarity: gradingResult.similarity,
        }

        // ── Placement phase ──────────────────────────────────
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
            showFeedback: !isCorrect,
            currentIndex: isCorrect ? currentIndex + 1 : currentIndex,
          })
          return
        }

        // ── Gameplay / review phase ──────────────────────────
        let { consecutiveCorrect, consecutiveWrong } = state
        let { rating, streak, score, dailyGoalProgress, dailyGoalTarget, lastActiveDate, streakFreezes } = state.userState
        let triggerHint = false
        let didLevelUp = false

        // Daily reset check
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

        // Update skill stats + SRS
        const newSkillStats = updateSkillStats(state.skillStats, item.skill, isCorrect)
        const newMistakeQueue = upsertMistakeQueue(state.mistakeQueue, item.id, isCorrect)

        submitTelemetry({
          contentId: item.id,
          isCorrect,
          failCount: isCorrect ? 0 : 1,
          lastSeen: new Date(),
          nextReviewDue: new Date(),
        }).catch(console.warn)

        // Session tracking
        const newSessionAnswered = state.sessionAnswered + 1
        const newSessionCorrect = state.sessionCorrect + (isCorrect ? 1 : 0)
        const sessionSize = SESSION_SIZES[sessionMode]
        const sessionDone = newSessionAnswered >= sessionSize

        if (isCorrect) {
          consecutiveCorrect += 1
          consecutiveWrong = 0
          score += 10
          streak += 1
          dailyGoalProgress = Math.min(dailyGoalProgress + 1, dailyGoalTarget)

          // Earn a streak freeze every 7 streak
          if (streak > 0 && streak % 7 === 0) {
            streakFreezes = Math.min(MAX_STREAK_FREEZES, streakFreezes + 1)
          }

          if (consecutiveCorrect >= CORRECT_STREAK_THRESHOLD) {
            const prevBand = levelBand(rating)
            rating += RATING_INCREASE
            consecutiveCorrect = 0
            const newBand = levelBand(rating)
            if (newBand !== prevBand) {
              didLevelUp = true
              setTimeout(() => fireConfetti('levelup'), 100)
            }
          }

          if (dailyGoalProgress === dailyGoalTarget) {
            setTimeout(() => fireConfetti('daily'), didLevelUp ? 1500 : 100)
          }
        } else {
          consecutiveWrong += 1
          consecutiveCorrect = 0
          streak = 0

          if (consecutiveWrong >= WRONG_STREAK_THRESHOLD) {
            rating = Math.max(350, rating - RATING_DECREASE)
            consecutiveWrong = 0
            triggerHint = true
          }
        }

        set({
          consecutiveCorrect,
          consecutiveWrong,
          triggerHint,
          lastResult: result,
          showFeedback: !isCorrect,
          showSessionSummary: isCorrect && sessionDone,
          sessionAnswered: sessionDone ? newSessionAnswered : newSessionAnswered,
          sessionCorrect: sessionDone ? newSessionCorrect : newSessionCorrect,
          userState: { rating, streak, score, dailyGoalProgress, dailyGoalTarget, lastActiveDate, streakFreezes },
          skillStats: newSkillStats,
          mistakeQueue: newMistakeQueue,
        })

        if (isCorrect && !sessionDone) {
          await get().nextQuestion()
        }
      },

      nextQuestion: async () => {
        const { questionBuffer, currentIndex, userState, phase, skillStats, mistakeQueue } = get()
        const nextIndex = currentIndex + 1

        if (phase === 'placement') {
          set({ currentIndex: nextIndex, showFeedback: false, triggerHint: false })
          return
        }

        if (nextIndex >= questionBuffer.length - 3) {
          const fresh = await fetchQuestions(userState.rating, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue)
          const existingIds = new Set(questionBuffer.map((q) => q.id))
          const newItems = fresh.filter((q) => !existingIds.has(q.id))
          set((s) => ({
            questionBuffer: [...s.questionBuffer.slice(nextIndex), ...newItems],
            currentIndex: 0,
            showFeedback: false,
            triggerHint: false,
          }))
        } else {
          set({ currentIndex: nextIndex, showFeedback: false, triggerHint: false })
        }
      },

      dismissFeedback: () => {
        set({ showFeedback: false })
        get().nextQuestion()
      },

      toggleMistakeReview: async () => {
        const { mistakeReviewMode, userState } = get()
        if (mistakeReviewMode) {
          const { skillStats, mistakeQueue } = get()
          const items = await fetchQuestions(userState.rating, 'gameplay', BUFFER_SIZE, skillStats, mistakeQueue)
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
      },
    }),
    {
      name: 'english-game-storage',
      partialize: (state) => ({
        userState: state.userState,
        skillStats: state.skillStats,
        mistakeQueue: state.mistakeQueue,
        phase: state.phase,
        consecutiveCorrect: state.consecutiveCorrect,
        consecutiveWrong: state.consecutiveWrong,
        sessionMode: state.sessionMode,
        theme: state.theme,
        sounds: state.sounds,
        haptics: state.haptics,
        reducedMotion: state.reducedMotion,
        hasSeenOnboarding: state.hasSeenOnboarding,
        voiceLang: state.voiceLang,
        voiceRate: state.voiceRate,
      }),
    },
  ),
)

// ── Selector helpers ──────────────────────────────────────────
export const selectCurrentItem = (s: GameState): ContentItem | undefined =>
  s.questionBuffer[s.currentIndex]

export const selectLevelLabel = (s: GameState): string => {
  if (s.phase === 'placement') return 'Placement Test'
  const { rating } = s.userState
  if (rating < 400) return 'Starter'
  if (rating < 500) return 'Beginner'
  if (rating < 600) return 'Elementary'
  if (rating < 700) return 'Intermediate'
  if (rating < 850) return 'Upper-Intermediate'
  return 'Advanced'
}

export const selectSkillMastery = (s: GameState): Array<{ skill: SkillId; mastery: number; total: number }> =>
  (Object.entries(s.skillStats) as [SkillId, SkillStats][])
    .map(([skill, stats]) => ({
      skill,
      mastery: stats.correct + stats.wrong > 0 ? stats.correct / (stats.correct + stats.wrong) : -1,
      total: stats.correct + stats.wrong,
    }))
    .sort((a, b) => a.mastery - b.mastery)

export const selectDueCount = (s: GameState): number =>
  s.mistakeQueue.filter((e) => e.nextDueAt <= Date.now()).length
