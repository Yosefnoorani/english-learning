import { useEffect, useState } from 'react'
import { useGameStore, selectCurrentItem, selectLevelLabel } from '@/store/useGameStore'
import { useStoreHydrated } from '@/hooks/useStoreHydrated'
import { loadContent } from '@/services/contentService'
import { fetchSkillLessonQuestions } from '@/services/gameService'
import { loadFeedback } from '@/services/feedbackService'
import type { NavView } from '@/types/game'
import { AppShell } from '@/components/layout/AppShell'
import { PlacementView } from '@/components/game/PlacementView'
import { VocabRecallView } from '@/components/game/VocabRecallView'
import { GrammarChoiceView } from '@/components/game/GrammarChoiceView'
import { SentenceBuilder } from '@/components/game/SentenceBuilder'
import { FeedbackDrawer } from '@/components/game/FeedbackDrawer'
import { TranslationView } from '@/components/game/TranslationView'
import { DictationView } from '@/components/game/DictationView'
import { ConjugationView } from '@/components/game/ConjugationView'
import { SpellingView } from '@/components/game/SpellingView'
import { MatchingPairsView } from '@/components/game/MatchingPairsView'
import { VocabularyChoiceView } from '@/components/game/VocabularyChoiceView'
import { WordScrambleView } from '@/components/game/WordScrambleView'
import { ShadowingView } from '@/components/game/ShadowingView'
import { ReadingView } from '@/components/game/ReadingView'
import { SkillsPanel } from '@/components/game/SkillsPanel'
import { ResourcesPanel } from '@/components/game/ResourcesPanel'
import { MistakeJournal } from '@/components/game/MistakeJournal'
import { SettingsPanel } from '@/components/game/SettingsPanel'
import { OnboardingTour } from '@/components/game/OnboardingTour'
import { SessionSummary } from '@/components/game/SessionSummary'
import { HomeScreen } from '@/components/game/HomeScreen'
import { MicroLessonCard } from '@/components/game/MicroLessonCard'
import { getLessonTip } from '@/content/lessonTips'
import type { SkillId } from '@/types/game'

function LoadingSkeleton() {
  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5 px-8 w-full max-w-sm">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/3 mb-2 animate-pulse" />
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-3 w-full">
          <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-lg w-4/5 animate-pulse" />
          <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-lg w-2/3 animate-pulse" />
        </div>
        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium animate-pulse">
          Loading your learning path…
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const showFeedback = useGameStore((s) => s.showFeedback)
  const lastResult = useGameStore((s) => s.lastResult)
  const triggerHint = useGameStore((s) => s.triggerHint)
  const initGame = useGameStore((s) => s.initGame)
  const submitAnswer = useGameStore((s) => s.submitAnswer)
  const dismissFeedback = useGameStore((s) => s.dismissFeedback)
  const item = useGameStore(selectCurrentItem)
  const isLoading = useGameStore((s) => s.isLoading)
  const showSessionSummary = useGameStore((s) => s.showSessionSummary)
  const dismissSessionSummary = useGameStore((s) => s.dismissSessionSummary)
  const continueSession = useGameStore((s) => s.continueSession)
  const levelLabel = useGameStore(selectLevelLabel)
  const activeView = useGameStore((s) => s.activeView)
  const setActiveView = useGameStore((s) => s.setActiveView)

  const [contentReady, setContentReady] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [placementStarted, setPlacementStarted] = useState(
    () => useGameStore.getState().placementAnswered > 0,
  )
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPlacementBanner, setShowPlacementBanner] = useState(false)
  const [pendingMicroSkill, setPendingMicroSkill] = useState<SkillId | null>(null)
  const hasSeenOnboarding = useGameStore((s) => s.hasSeenOnboarding)
  const hasCompletedSetup = useGameStore((s) => s.hasCompletedSetup)
  const skillStats = useGameStore((s) => s.skillStats)
  const blockedSkillsShown = useGameStore((s) => s.blockedSkillsShown)
  const startPlacement = useGameStore((s) => s.startPlacement)
  const toggleMistakeReview = useGameStore((s) => s.toggleMistakeReview)
  const storeHydrated = useStoreHydrated()

  useEffect(() => {
    Promise.all([loadContent(), loadFeedback()])
      .then(() => setContentReady(true))
      .catch((e) => setContentError(e instanceof Error ? e.message : 'Failed to load content'))
  }, [])

  useEffect(() => {
    if (contentReady) initGame()
  }, [contentReady, initGame])

  useEffect(() => {
    if (storeHydrated && !hasSeenOnboarding) {
      setShowOnboarding(true)
    }
  }, [storeHydrated, hasSeenOnboarding])

  useEffect(() => {
    if (!item || activeView !== 'practice') {
      setPendingMicroSkill(null)
      return
    }
    const stats = skillStats[item.skill]
    const attempts = (stats?.correct ?? 0) + (stats?.wrong ?? 0)
    if (attempts < 3 && !blockedSkillsShown.includes(item.skill) && getLessonTip(item.skill)) {
      setPendingMicroSkill(item.skill)
    } else {
      setPendingMicroSkill(null)
    }
  }, [item?.id, item?.skill, activeView, skillStats, blockedSkillsShown])

  function dismissMicroLesson() {
    if (pendingMicroSkill) {
      useGameStore.setState((s) => ({
        blockedSkillsShown: [...s.blockedSkillsShown, pendingMicroSkill],
      }))
    }
    setPendingMicroSkill(null)
  }

  function handleOnboardingDone() {
    setShowOnboarding(false)
    useGameStore.getState().markOnboardingSeen()
  }

  async function handleOnboardingStartPlacement() {
    setShowPlacementBanner(false)
    if (!hasCompletedSetup) {
      setPlacementStarted(true)
      await startPlacement()
    }
  }

  function handleOnboardingSkip() {
    if (!hasCompletedSetup) {
      setShowPlacementBanner(true)
    }
  }

  async function handleStartPlacementFromHome() {
    setShowPlacementBanner(false)
    setPlacementStarted(true)
    await startPlacement()
  }

  async function handleStartReview() {
    await toggleMistakeReview()
  }

  useEffect(() => {
    document.title = phase === 'placement'
      ? 'English Learning · Placement'
      : `English Learning · ${levelLabel}`
  }, [phase, levelLabel])

  async function startDailyLesson(skill: SkillId) {
    const state = useGameStore.getState()
    const items = await fetchSkillLessonQuestions(
      skill,
      state.practiceTier,
      10,
      state.skillStats,
      state.mistakeQueue,
      state.recentContentIds,
      state.vocabReviewQueue,
      state.includeAudioQuestions,
    )
    if (items.length > 0) {
      useGameStore.setState({
        questionBuffer: items,
        currentIndex: 0,
        showFeedback: false,
        triggerHint: false,
        sessionAnswered: 0,
        sessionCorrect: 0,
        showSessionSummary: false,
        activeView: 'practice',
      })
      useGameStore.getState().saveResumeSnapshot()
    }
  }

  function handleNavigate(view: NavView | 'settings') {
    if (view === 'settings') {
      setShowSettings(true)
    } else {
      setActiveView(view)
    }
  }

  function closePanelToHome() {
    setActiveView('practice')
  }

  if (!storeHydrated || !contentReady || isLoading) {
    if (contentError) {
      return (
        <div className="min-h-svh flex items-center justify-center p-8 text-center text-rose-600">
          {contentError}
        </div>
      )
    }
    return <LoadingSkeleton />
  }

  if (phase === 'placement') {
    return (
      <>
        {showOnboarding && (
          <OnboardingTour
            onDone={handleOnboardingDone}
            onStartPlacement={() => { void handleOnboardingStartPlacement() }}
            onSkip={handleOnboardingSkip}
          />
        )}
        <div
          className="min-h-svh bg-slate-50 dark:bg-slate-950 flex flex-col"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex-1 flex flex-col justify-center py-8">
            <PlacementView started={placementStarted} onStart={() => setPlacementStarted(true)} />
          </div>
          {showFeedback && lastResult && (
            <FeedbackDrawer result={lastResult} onNext={dismissFeedback} />
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <AppShell
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenSettings={() => setShowSettings(true)}
        inPracticeSession={activeView === 'practice' && !!item}
      >
        <main className="flex-1 flex flex-col min-h-0">
          {activeView === 'practice' && (
            item ? (
              <div className="flex flex-col flex-1 min-h-0">
                {pendingMicroSkill && getLessonTip(pendingMicroSkill) && (
                  <MicroLessonCard tip={getLessonTip(pendingMicroSkill)!} onDismiss={dismissMicroLesson} />
                )}
                {!pendingMicroSkill && (
                <>
                {item.type === 'vocabulary' && (
                  <VocabRecallView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'grammar_choice' && (
                  <GrammarChoiceView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'sentence_builder' && (
                  <SentenceBuilder item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'placement_test' && (
                  <GrammarChoiceView item={item} onAnswer={submitAnswer} />
                )}
                {item.type === 'translation_he_en' && (
                  <TranslationView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'listening_dictation' && item.tags.includes('shadowing') && (
                  <ShadowingView item={item} onAnswer={submitAnswer} />
                )}
                {item.type === 'listening_dictation' && !item.tags.includes('shadowing') && (
                  <DictationView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'verb_conjugation' && (
                  <ConjugationView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'word_spelling' && (
                  <SpellingView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'vocabulary_match' && (
                  <MatchingPairsView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'vocabulary_choice' && (
                  <VocabularyChoiceView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'word_scramble' && (
                  <WordScrambleView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'reading_comprehension' && (
                  <ReadingView item={item} onAnswer={submitAnswer} onDismiss={dismissFeedback} showHint={triggerHint} />
                )}
                </>
                )}
              </div>
            ) : (
              <HomeScreen
                onStartLesson={startDailyLesson}
                onOpenJournal={() => setActiveView('journal')}
                onOpenSkills={() => setActiveView('skills')}
                onStartPlacement={() => { void handleStartPlacementFromHome() }}
                onStartReview={() => { void handleStartReview() }}
                showPlacementBanner={showPlacementBanner && !hasCompletedSetup}
              />
            )
          )}

          {activeView === 'skills' && (
            <SkillsPanel onClose={closePanelToHome} onPracticeSkill={startDailyLesson} />
          )}

          {activeView === 'journal' && (
            <MistakeJournal onClose={closePanelToHome} onPractise={closePanelToHome} />
          )}

          {activeView === 'resources' && (
            <ResourcesPanel levelLabel={levelLabel} onClose={closePanelToHome} />
          )}
        </main>
      </AppShell>

      {showFeedback && lastResult && (
        <FeedbackDrawer result={lastResult} onNext={dismissFeedback} />
      )}

      {showSessionSummary && !showFeedback && (
        <SessionSummary
          onContinue={() => continueSession()}
          onDone={dismissSessionSummary}
        />
      )}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onShowOnboarding={() => { setShowSettings(false); setShowOnboarding(true) }}
        />
      )}

      {showOnboarding && (
        <OnboardingTour
          onDone={handleOnboardingDone}
          onStartPlacement={() => { void handleOnboardingStartPlacement() }}
          onSkip={handleOnboardingSkip}
        />
      )}
    </>
  )
}
