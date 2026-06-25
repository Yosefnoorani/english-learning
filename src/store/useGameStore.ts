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
import { fetchQuestions, fetchDueMistakeReviewItems, fetchSkillLessonQuestions, submitTelemetry, applyBlockedPractice, filterByAudioPreference, isAudioQuestion } from '@/services/gameService'
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
import {
  registerVocabSeen,
  advanceVocabReview,
  regressVocabReview,
  isVocabItem,
} from '@/services/vocabReviewService'
import { checkAchievements, awardAchievement } from '@/services/achievementService'
import {
  getDailyQuests,
  allQuestsComplete,
  isBonusQuestUnlocked,
  updateQuestProgressForAnswer,
} from '@/services/dailyQuestService'
import {
  computeCorrectAnswerRewards,
  WELCOME_XP_BONUS,
  STREAK_FREEZE_GEM_COST,
  STREAK_REPAIR_GEM_COST,
  DOUBLE_XP_GEM_COST,
  DOUBLE_XP_DURATION_MS,
  MAX_STREAK_REPAIRS_PER_MONTH,
  getUnclaimedStreakMilestones,
  QUEST_GEM_REWARDS,
} from '@/services/rewardService'
import { getCombinedXpMultiplier } from '@/services/eventService'
import {
  resetWeeklyLeagueIfNeeded,
  syncLeagueXp,
} from '@/services/leagueService'
import {
  loadExperiments,
  getQuestGemMultiplier,
} from '@/services/experimentService'
import type { NotificationPreferences } from '@/services/notificationService'
import { DEFAULT_NOTIFICATION_PREFS } from '@/services/notificationService'
import type { LeagueTier } from '@/services/leagueService'

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
  /** Consecutive correct answers in the current session (resets on wrong). */
  sessionCombo: number
  /** Content IDs encountered this session for summary recap. */
  sessionLearnedIds: string[]
  totalSessionsCompleted: number

  sessionMode: SessionMode
  theme: AppTheme
  sounds: boolean
  haptics: boolean
  reducedMotion: boolean
  hasSeenOnboarding: boolean
  hasCompletedSetup: boolean
  voiceLang: string
  voiceRate: number
  /** Include listening dictation and shadowing exercises in sessions. */
  includeAudioQuestions: boolean
  /** Show diff + Hebrew explanations in feedback drawer. */
  detailedFeedback: boolean
  /** Recently seen content IDs — reduces repetition across sessions. */
  recentContentIds: string[]
  /** Proactive vocab SRS schedule. */
  vocabReviewQueue: import('@/types/game').VocabReviewEntry[]
  achievements: string[]
  pendingAchievementUnlocks: string[]
  dailyQuestIds: string[]
  dailyQuestProgress: Record<string, number>
  dailyQuestDate: string
  claimedQuestRewards: string[]
  questStreak: number
  lastQuestStreakDate: string
  weeklyXp: number
  weekStartDate: string
  personalBestWeeklyXp: number
  leagueTier: LeagueTier
  promotedLastWeek: boolean | null
  showLeagueSummary: boolean
  activityHistory: string[]
  claimedStreakMilestones: number[]
  doubleXpUntil: number
  pendingBonusChest: { gems: number; goldenCombo: boolean } | null
  continueNudgesToday: number
  continueNudgesDate: string
  unitsCompleted: string[]
  notificationPreferences: NotificationPreferences
  experiments: Record<string, string>
  welcomeXpGranted: boolean
  lastSeenAt: number
  showWelcomeBack: boolean
  dismissedLeagueSummaryWeek: string
  /** Skills that received blocked intro this session. */
  blockedSkillsShown: SkillId[]

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
  continueSession: (microMode?: boolean) => Promise<void>
  setActiveView: (view: NavView) => void
  saveResumeSnapshot: () => void

  retrySimilarQuestion: () => Promise<void>
  setTheme: (theme: AppTheme) => void
  setSessionMode: (mode: SessionMode) => void
  setSounds: (v: boolean) => void
  setHaptics: (v: boolean) => void
  setReducedMotion: (v: boolean) => void
  markOnboardingSeen: () => void
  setVoice: (lang: string, rate: number) => void
  setIncludeAudioQuestions: (v: boolean) => void
  setDetailedFeedback: (v: boolean) => void
  setDailyGoalTarget: (n: number) => void
  setPracticeTier: (tier: number) => void
  resetProgress: () => void
  showOnboardingTour: () => void
  dismissAchievementUnlock: () => void
  buyStreakFreeze: () => void
  repairStreak: () => void
  buyDoubleXp: () => void
  claimStreakMilestone: (days: number) => void
  claimQuestGemReward: (questId: string) => void
  dismissBonusChest: () => void
  dismissLeagueSummary: () => void
  dismissWelcomeBack: () => void
  setNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void
  recordContinueNudge: () => boolean
  completeUnit: (unitId: string) => void
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

  let { streak, streakFreezes, streakBrokenAt } = userState
  if (daysMissed > 0) {
    const freezesToUse = Math.min(daysMissed, streakFreezes)
    streakFreezes = Math.max(0, streakFreezes - freezesToUse)
    if (daysMissed > freezesToUse) {
      if (streak > 0) streakBrokenAt = Date.now()
      streak = 0
    }
  }

  return { dailyGoalProgress: 0, lastActiveDate: todayStr, streak, streakFreezes, streakBrokenAt }
}

function queueNewAchievements(
  prev: string[],
  next: string[],
  pending: string[],
): string[] {
  const newlyEarned = next.filter((id) => !prev.includes(id))
  return [...pending, ...newlyEarned.filter((id) => !pending.includes(id))]
}

function recordActivityDate(history: string[], todayStr: string): string[] {
  if (history.includes(todayStr)) return history
  return [...history, todayStr].slice(-90)
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
        xp: 0,
        gems: 0,
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
      sessionCombo: 0,
      sessionLearnedIds: [],
      totalSessionsCompleted: 0,
      sessionMode: 'standard',
      theme: 'system',
      sounds: true,
      haptics: true,
      reducedMotion: false,
      hasSeenOnboarding: false,
      hasCompletedSetup: false,
      voiceLang: 'en-GB',
      voiceRate: 0.9,
      includeAudioQuestions: true,
      detailedFeedback: true,
      recentContentIds: [],
      vocabReviewQueue: [],
      achievements: [],
      pendingAchievementUnlocks: [],
      dailyQuestIds: [],
      dailyQuestProgress: {},
      dailyQuestDate: '',
      claimedQuestRewards: [],
      questStreak: 0,
      lastQuestStreakDate: '',
      weeklyXp: 0,
      weekStartDate: new Date().toDateString(),
      personalBestWeeklyXp: 0,
      leagueTier: 'bronze',
      promotedLastWeek: null,
      showLeagueSummary: false,
      activityHistory: [],
      claimedStreakMilestones: [],
      doubleXpUntil: 0,
      pendingBonusChest: null,
      continueNudgesToday: 0,
      continueNudgesDate: '',
      unitsCompleted: [],
      notificationPreferences: DEFAULT_NOTIFICATION_PREFS,
      experiments: loadExperiments('default'),
      welcomeXpGranted: false,
      lastSeenAt: Date.now(),
      showWelcomeBack: false,
      dismissedLeagueSummaryWeek: '',
      blockedSkillsShown: [],
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
      setIncludeAudioQuestions: (v) => {
        const state = get()
        const updates: Partial<GameState> = { includeAudioQuestions: v }
        if (!v && state.questionBuffer.length > 0) {
          const filtered = filterByAudioPreference(state.questionBuffer, false)
          const currentItem = state.questionBuffer[state.currentIndex]
          let newIndex = 0
          if (currentItem) {
            const idx = filtered.findIndex((q) => q.id === currentItem.id)
            newIndex = idx >= 0 ? idx : Math.min(state.currentIndex, Math.max(0, filtered.length - 1))
          }
          updates.questionBuffer = filtered
          updates.currentIndex = filtered.length ? newIndex : 0
        }
        set(updates)
      },
      setDetailedFeedback: (v) => set({ detailedFeedback: v }),
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
            xp: 0,
            gems: 0,
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
          achievements: [],
          pendingAchievementUnlocks: [],
          questStreak: 0,
          weeklyXp: 0,
          activityHistory: [],
          unitsCompleted: [],
        }),

      dismissAchievementUnlock: () =>
        set((s) => ({
          pendingAchievementUnlocks: s.pendingAchievementUnlocks.slice(1),
        })),

      buyStreakFreeze: () => {
        const { userState } = get()
        if (userState.gems < STREAK_FREEZE_GEM_COST || userState.streakFreezes >= 3) return
        set({
          userState: {
            ...userState,
            gems: userState.gems - STREAK_FREEZE_GEM_COST,
            streakFreezes: userState.streakFreezes + 1,
          },
        })
      },

      repairStreak: () => {
        const { userState } = get()
        const month = `${new Date().getMonth()}-${new Date().getFullYear()}`
        const repairsUsed =
          userState.streakRepairMonth === month ? (userState.streakRepairsUsedThisMonth ?? 0) : 0
        if (
          userState.gems < STREAK_REPAIR_GEM_COST ||
          repairsUsed >= MAX_STREAK_REPAIRS_PER_MONTH ||
          !userState.streakBrokenAt ||
          Date.now() - userState.streakBrokenAt > 86400000
        ) return
        set({
          userState: {
            ...userState,
            gems: userState.gems - STREAK_REPAIR_GEM_COST,
            streak: Math.max(1, userState.streak),
            streakBrokenAt: undefined,
            streakRepairsUsedThisMonth: repairsUsed + 1,
            streakRepairMonth: month,
          },
        })
      },

      buyDoubleXp: () => {
        const { userState } = get()
        if (userState.gems < DOUBLE_XP_GEM_COST) return
        set({
          userState: { ...userState, gems: userState.gems - DOUBLE_XP_GEM_COST },
          doubleXpUntil: Date.now() + DOUBLE_XP_DURATION_MS,
        })
      },

      claimStreakMilestone: (days: number) => {
        const { userState, claimedStreakMilestones } = get()
        const unclaimed = getUnclaimedStreakMilestones(userState.streak, claimedStreakMilestones)
        const milestone = unclaimed.find((m) => m.days === days)
        if (!milestone) return
        set({
          userState: { ...userState, gems: userState.gems + milestone.gems },
          claimedStreakMilestones: [...claimedStreakMilestones, days],
        })
      },

      claimQuestGemReward: (questId: string) => {
        const { claimedQuestRewards, userState, experiments } = get()
        if (claimedQuestRewards.includes(questId)) return
        const base = QUEST_GEM_REWARDS[questId] ?? 5
        const gems = Math.round(base * getQuestGemMultiplier(experiments))
        set({
          userState: { ...userState, gems: userState.gems + gems },
          claimedQuestRewards: [...claimedQuestRewards, questId],
        })
      },

      dismissBonusChest: () => set({ pendingBonusChest: null }),

      dismissLeagueSummary: () =>
        set({ showLeagueSummary: false, dismissedLeagueSummaryWeek: get().weekStartDate }),

      dismissWelcomeBack: () => set({ showWelcomeBack: false }),

      setNotificationPreferences: (prefs) =>
        set((s) => ({
          notificationPreferences: { ...s.notificationPreferences, ...prefs },
        })),

      recordContinueNudge: () => {
        const today = new Date().toDateString()
        const { continueNudgesToday, continueNudgesDate } = get()
        const count = continueNudgesDate === today ? continueNudgesToday : 0
        if (count >= 2) return false
        set({
          continueNudgesToday: count + 1,
          continueNudgesDate: today,
        })
        return true
      },

      completeUnit: (unitId: string) => {
        const { unitsCompleted, userState } = get()
        if (unitsCompleted.includes(unitId)) return
        set({
          unitsCompleted: [...unitsCompleted, unitId],
          userState: { ...userState, gems: userState.gems + 30, xp: userState.xp + 50 },
        })
      },

      dismissSessionSummary: () => {
        set((s) => ({
          showSessionSummary: false,
          sessionAnswered: 0,
          sessionCorrect: 0,
          sessionCombo: 0,
          sessionLearnedIds: [],
          totalSessionsCompleted: s.totalSessionsCompleted + 1,
          blockedSkillsShown: [],
        }))
        get().saveResumeSnapshot()
      },

      continueSession: async (microMode = false) => {
        const { practiceTier, skillStats, mistakeQueue, recentContentIds, vocabReviewQueue, includeAudioQuestions } = get()
        const all = getAllContent()
        const items = await fetchQuestions(
          practiceTier,
          'gameplay',
          microMode ? 5 : BUFFER_SIZE,
          skillStats,
          mistakeQueue,
          recentContentIds,
          vocabReviewQueue,
          includeAudioQuestions,
        )
        const blocked = applyBlockedPractice(items, skillStats, all, includeAudioQuestions)
        const sessionItems = microMode ? blocked.slice(0, 5) : blocked
        set({
          questionBuffer: sessionItems,
          currentIndex: 0,
          showSessionSummary: false,
          sessionAnswered: 0,
          sessionCorrect: 0,
          sessionCombo: 0,
          sessionLearnedIds: [],
          sessionRecentMistakeIds: [],
          blockedSkillsShown: [],
          sessionMode: microMode ? 'quick' : get().sessionMode,
        })
        get().saveResumeSnapshot()
      },

      initGame: async () => {
        set({ isLoading: true })
        const state = get()

        const leagueUpdate = resetWeeklyLeagueIfNeeded({
          leagueTier: state.leagueTier,
          weeklyXp: state.weeklyXp,
          weekStartDate: state.weekStartDate,
          personalBestWeeklyXp: state.personalBestWeeklyXp,
          leagueRank: 15,
          leagueSize: 30,
          promotedLastWeek: state.promotedLastWeek,
        })
        const showLeagueSummary =
          leagueUpdate.weekStartDate !== state.weekStartDate &&
          state.dismissedLeagueSummaryWeek !== state.weekStartDate

        const hoursAway = (Date.now() - state.lastSeenAt) / 3600000
        const showWelcomeBack = hoursAway >= 24 && state.hasCompletedSetup

        if (!state.welcomeXpGranted && state.hasSeenOnboarding) {
          set({
            userState: { ...state.userState, xp: state.userState.xp + WELCOME_XP_BONUS },
            welcomeXpGranted: true,
          })
        }

        set({
          ...leagueUpdate,
          showLeagueSummary,
          showWelcomeBack,
          lastSeenAt: Date.now(),
        })

        if (!state.hasCompletedSetup && state.phase !== 'placement' && state.hasSeenOnboarding) {
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
        const items = await fetchQuestions(
          MIN_TIER,
          'placement',
          PLACEMENT_QUESTIONS,
          undefined,
          undefined,
          [],
          undefined,
          get().includeAudioQuestions,
        )
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
        const items = await fetchQuestions(
          tier,
          'gameplay',
          BUFFER_SIZE,
          skillStats,
          mistakeQueue,
          recentContentIds,
          get().vocabReviewQueue,
          get().includeAudioQuestions,
        )
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
          achievements: awardAchievement(s.achievements, 'first_steps'),
          pendingAchievementUnlocks: s.achievements.includes('first_steps')
            ? s.pendingAchievementUnlocks
            : [...s.pendingAchievementUnlocks, 'first_steps'],
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
        let { rating, streak, score, dailyGoalProgress, dailyGoalTarget, lastActiveDate, streakFreezes, xp, gems } =
          state.userState
        let triggerHint = false
        let didLevelUp = false
        let pendingBonusChest = state.pendingBonusChest
        let weeklyXp = state.weeklyXp

        const todayStr = new Date().toDateString()
        const resetFields = applyDailyReset(state.userState, todayStr)
        if (resetFields.dailyGoalProgress !== undefined) {
          dailyGoalProgress = 0
          streak = resetFields.streak ?? streak
          streakFreezes = resetFields.streakFreezes ?? streakFreezes
        }

        const wasActiveToday = lastActiveDate === todayStr
        if (!lastActiveDate) lastActiveDate = todayStr

        let activityHistory = recordActivityDate(state.activityHistory, todayStr)

        let sessionCombo = state.sessionCombo
        let sessionLearnedIds = state.sessionLearnedIds
        if (!sessionLearnedIds.includes(item.id)) {
          sessionLearnedIds = [...sessionLearnedIds, item.id]
        }

        let vocabReviewQueue = state.vocabReviewQueue
        if (isVocabItem(item)) {
          vocabReviewQueue = registerVocabSeen(vocabReviewQueue, item.id)
          if (isCorrect) {
            vocabReviewQueue = advanceVocabReview(vocabReviewQueue, item.id)
          } else {
            vocabReviewQueue = regressVocabReview(vocabReviewQueue, item.id)
          }
        }

        let dailyQuestProgress = { ...state.dailyQuestProgress }
        let dailyQuestDate = state.dailyQuestDate
        let claimedQuestRewards = [...state.claimedQuestRewards]
        if (dailyQuestDate !== todayStr) {
          dailyQuestProgress = {}
          dailyQuestDate = todayStr
          claimedQuestRewards = []
        }
        const quests = getDailyQuests(new Date(), state.includeAudioQuestions)
        const bonusUnlocked = isBonusQuestUnlocked(quests, dailyQuestProgress)
        const nowMs = Date.now()
        const mistakeEntry = state.mistakeQueue.find((e) => e.contentId === item.id)
        const wasDueMistake =
          mistakeEntry != null && !mistakeEntry.mastered && mistakeEntry.nextDueAt <= nowMs

        for (const quest of quests) {
          dailyQuestProgress = updateQuestProgressForAnswer({
            quest,
            progress: dailyQuestProgress,
            isCorrect,
            sessionCombo: isCorrect ? state.sessionCombo + 1 : 0,
            itemType: item.type,
            itemTags: item.tags,
            mistakeReviewMode: state.mistakeReviewMode,
            wasDueMistake,
            includeAudioQuestions: state.includeAudioQuestions,
            bonusUnlocked,
          })
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
          sessionCombo += 1
          const rewards = computeCorrectAnswerRewards({
            streak,
            doubleXpUntil: state.doubleXpUntil,
          })
          const eventMult = getCombinedXpMultiplier()
          const earnedXp = Math.round(rewards.xp * eventMult)
          xp += earnedXp
          weeklyXp += earnedXp
          gems += rewards.gems
          if (rewards.bonusChest) {
            gems += rewards.bonusChest.gems
            pendingBonusChest = rewards.bonusChest
          }
          syncLeagueXp(weeklyXp).catch(console.warn)
          dailyGoalProgress = Math.min(dailyGoalProgress + 1, dailyGoalTarget)
          if (!wasActiveToday) {
            streak += 1
            lastActiveDate = todayStr
            activityHistory = recordActivityDate(activityHistory, todayStr)
            if (streak > 0 && streak % 7 === 0) {
              streakFreezes = Math.min(MAX_STREAK_FREEZES, streakFreezes + 1)
            }
          }
          if (dailyGoalProgress === dailyGoalTarget) {
            setTimeout(() => fireConfetti('daily'), didLevelUp ? 1500 : 100)
          }
        } else {
          sessionCombo = 0
          const tierAction = tierOnWrong(currentTier, tierCorrectStreak, tierWrongStreak)
          currentTier = tierAction.newTier
          tierCorrectStreak = tierAction.tierCorrectStreak
          tierWrongStreak = tierAction.tierWrongStreak
          hadRecentMistakeAtTier = tierAction.hadRecentMistakeAtTier
          rating = tierAction.newRating
          tierChanged = tierAction.demoted
          triggerHint = true
          if (gradingResult.similarity != null && gradingResult.similarity >= 0.7) {
            result.explanation = 'You were close! ' + (result.explanation ?? '')
          }
        }

        let questStreak = state.questStreak
        let lastQuestStreakDate = state.lastQuestStreakDate
        if (allQuestsComplete(quests, dailyQuestProgress)) {
          if (lastQuestStreakDate !== todayStr) {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            questStreak = lastQuestStreakDate === yesterday.toDateString() ? questStreak + 1 : 1
            lastQuestStreakDate = todayStr
          }
        }

        const prevAchievements = state.achievements
        const newAchievements = checkAchievements({
          achievements: prevAchievements,
          streak,
          sessionCorrect: newSessionCorrect,
          sessionAnswered: newSessionAnswered,
          sessionCombo,
          skillStats: newSkillStats,
          mistakeQueue: newMistakeQueue,
          phase,
          dailyQuestComplete: allQuestsComplete(quests, dailyQuestProgress),
          hasCompletedSetup: state.hasCompletedSetup,
          questStreak,
        })
        const pendingAchievementUnlocks = queueNewAchievements(
          prevAchievements,
          newAchievements,
          state.pendingAchievementUnlocks,
        )

        set({
          triggerHint,
          lastResult: result,
          showFeedback: true,
          showSessionSummary: isCorrect && sessionDone,
          sessionAnswered: newSessionAnswered,
          sessionCorrect: newSessionCorrect,
          sessionCombo,
          sessionLearnedIds,
          vocabReviewQueue,
          dailyQuestProgress,
          dailyQuestDate,
          claimedQuestRewards,
          questStreak,
          lastQuestStreakDate,
          weeklyXp,
          pendingBonusChest,
          activityHistory,
          achievements: newAchievements,
          pendingAchievementUnlocks,
          userState: { rating, streak, score, dailyGoalProgress, dailyGoalTarget, lastActiveDate, streakFreezes, xp, gems },
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
          set({ practiceTier: currentTier })
          const s = get()
          const fresh = await fetchQuestions(
            s.practiceTier,
            'gameplay',
            BUFFER_SIZE,
            s.skillStats,
            s.mistakeQueue,
            s.recentContentIds,
            s.vocabReviewQueue,
            s.includeAudioQuestions,
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

        const requeueToInjectRaw = pickNextRequeueItem(newQueue, getAllContent(), cooldownIds)
        const requeueToInject =
          requeueToInjectRaw && (!get().includeAudioQuestions && isAudioQuestion(requeueToInjectRaw)
            ? undefined
            : requeueToInjectRaw)

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
          const fresh = await fetchQuestions(
            practiceTier,
            'gameplay',
            BUFFER_SIZE,
            skillStats,
            newQueue,
            excludeForFetch,
            get().vocabReviewQueue,
            get().includeAudioQuestions,
          )
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
          const items = await fetchQuestions(
            practiceTier,
            'gameplay',
            BUFFER_SIZE,
            skillStats,
            mistakeQueue,
            recentContentIds,
            get().vocabReviewQueue,
            get().includeAudioQuestions,
          )
          set({ mistakeReviewMode: false, phase: 'gameplay', questionBuffer: items, currentIndex: 0, sessionRecentMistakeIds: [] })
        } else {
          const { mistakeQueue, includeAudioQuestions } = get()
          const items = fetchDueMistakeReviewItems(mistakeQueue, BUFFER_SIZE, includeAudioQuestions)
          set({
            mistakeReviewMode: true,
            phase: 'review',
            questionBuffer: items,
            currentIndex: 0,
            sessionAnswered: 0,
            sessionCorrect: 0,
            sessionRecentMistakeIds: [],
          })
        }
        get().saveResumeSnapshot()
      },

      retrySimilarQuestion: async () => {
        const { lastResult, practiceTier, skillStats, mistakeQueue, recentContentIds, vocabReviewQueue, includeAudioQuestions } = get()
        if (!lastResult || lastResult.isCorrect) return
        const skill = lastResult.item.skill
        const items = await fetchSkillLessonQuestions(
          skill,
          Math.max(MIN_TIER, practiceTier - 1),
          1,
          skillStats,
          mistakeQueue,
          recentContentIds,
          vocabReviewQueue,
          includeAudioQuestions,
        )
        if (items.length === 0) return
        const retryItem = items[0]
        const { questionBuffer, currentIndex } = get()
        const newBuffer = [...questionBuffer]
        newBuffer.splice(currentIndex + 1, 0, retryItem)
        set({
          questionBuffer: newBuffer,
          showFeedback: false,
          triggerHint: true,
        })
        get().saveResumeSnapshot()
      },
    }),
    {
      name: 'english-game-storage',
      version: 8,
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
        if (s.sessionCombo === undefined) s.sessionCombo = 0
        if (s.sessionLearnedIds === undefined) s.sessionLearnedIds = []
        if (s.totalSessionsCompleted === undefined) s.totalSessionsCompleted = 0
        if (s.vocabReviewQueue === undefined) s.vocabReviewQueue = []
        if (s.achievements === undefined) s.achievements = []
        if (s.dailyQuestIds === undefined) s.dailyQuestIds = []
        if (s.dailyQuestProgress === undefined) s.dailyQuestProgress = {}
        if (s.dailyQuestDate === undefined) s.dailyQuestDate = ''
        if (s.includeAudioQuestions === undefined) s.includeAudioQuestions = true
        if (s.detailedFeedback === undefined) s.detailedFeedback = true

        const us = s.userState as Record<string, unknown> | undefined
        if (us) {
          if (us.xp === undefined) us.xp = 0
          if (us.gems === undefined) us.gems = 0
          s.userState = us
        }

        if (version < 8) {
          s.pendingAchievementUnlocks = s.pendingAchievementUnlocks ?? []
          s.claimedQuestRewards = s.claimedQuestRewards ?? []
          s.questStreak = s.questStreak ?? 0
          s.lastQuestStreakDate = s.lastQuestStreakDate ?? ''
          s.weeklyXp = s.weeklyXp ?? 0
          s.weekStartDate = s.weekStartDate ?? new Date().toDateString()
          s.personalBestWeeklyXp = s.personalBestWeeklyXp ?? 0
          s.leagueTier = s.leagueTier ?? 'bronze'
          s.promotedLastWeek = s.promotedLastWeek ?? null
          s.activityHistory = s.activityHistory ?? []
          s.claimedStreakMilestones = s.claimedStreakMilestones ?? []
          s.doubleXpUntil = s.doubleXpUntil ?? 0
          s.continueNudgesToday = s.continueNudgesToday ?? 0
          s.continueNudgesDate = s.continueNudgesDate ?? ''
          s.unitsCompleted = s.unitsCompleted ?? []
          s.notificationPreferences = s.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS
          s.experiments = s.experiments ?? loadExperiments('default')
          s.welcomeXpGranted = s.welcomeXpGranted ?? false
          s.lastSeenAt = s.lastSeenAt ?? Date.now()
          s.dismissedLeagueSummaryWeek = s.dismissedLeagueSummaryWeek ?? ''
        }

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
        includeAudioQuestions: state.includeAudioQuestions,
        detailedFeedback: state.detailedFeedback,
        currentTier: state.currentTier,
        tierCorrectStreak: state.tierCorrectStreak,
        tierWrongStreak: state.tierWrongStreak,
        hadRecentMistakeAtTier: state.hadRecentMistakeAtTier,
        highestTierReached: state.highestTierReached,
        practiceTier: state.practiceTier,
        recentContentIds: state.recentContentIds,
        vocabReviewQueue: state.vocabReviewQueue,
        achievements: state.achievements,
        pendingAchievementUnlocks: state.pendingAchievementUnlocks,
        dailyQuestIds: state.dailyQuestIds,
        dailyQuestProgress: state.dailyQuestProgress,
        dailyQuestDate: state.dailyQuestDate,
        claimedQuestRewards: state.claimedQuestRewards,
        questStreak: state.questStreak,
        lastQuestStreakDate: state.lastQuestStreakDate,
        weeklyXp: state.weeklyXp,
        weekStartDate: state.weekStartDate,
        personalBestWeeklyXp: state.personalBestWeeklyXp,
        leagueTier: state.leagueTier,
        promotedLastWeek: state.promotedLastWeek,
        activityHistory: state.activityHistory,
        claimedStreakMilestones: state.claimedStreakMilestones,
        doubleXpUntil: state.doubleXpUntil,
        unitsCompleted: state.unitsCompleted,
        notificationPreferences: state.notificationPreferences,
        experiments: state.experiments,
        welcomeXpGranted: state.welcomeXpGranted,
        lastSeenAt: state.lastSeenAt,
        dismissedLeagueSummaryWeek: state.dismissedLeagueSummaryWeek,
        totalSessionsCompleted: state.totalSessionsCompleted,
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
