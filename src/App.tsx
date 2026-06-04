import { useEffect, useRef, useState } from 'react'
import { useGameStore, selectCurrentItem, selectLevelLabel } from '@/store/useGameStore'
import { AppShell } from '@/components/layout/AppShell'
import { PlacementView } from '@/components/game/PlacementView'
import { FlashcardView } from '@/components/game/FlashcardView'
import { GrammarChoiceView } from '@/components/game/GrammarChoiceView'
import { SentenceBuilder } from '@/components/game/SentenceBuilder'
import { FeedbackDrawer } from '@/components/game/FeedbackDrawer'
import { TranslationView } from '@/components/game/TranslationView'
import { DictationView } from '@/components/game/DictationView'
import { ConjugationView } from '@/components/game/ConjugationView'
import { ReadingView } from '@/components/game/ReadingView'
import { SkillsPanel } from '@/components/game/SkillsPanel'
import { ResourcesPanel } from '@/components/game/ResourcesPanel'
import { MistakeJournal } from '@/components/game/MistakeJournal'
import { SettingsPanel } from '@/components/game/SettingsPanel'
import { OnboardingTour } from '@/components/game/OnboardingTour'
import { SessionSummary } from '@/components/game/SessionSummary'
import { HomeScreen } from '@/components/game/HomeScreen'
import { ALL_CONTENT as allContent } from '@/content/index'
import type { SkillId } from '@/types/game'

type NavView = 'practice' | 'skills' | 'journal' | 'resources' | 'settings'

// ── Loading skeleton ──────────────────────────────────────────
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
  const hasSeenOnboarding = useGameStore((s) => s.hasSeenOnboarding)
  const levelLabel = useGameStore(selectLevelLabel)

  // Auto-mark as started if the user refreshed mid-placement (answers already recorded)
  const [placementStarted, setPlacementStarted] = useState(
    () => useGameStore.getState().placementAnswered > 0,
  )
  const [activeView, setActiveView] = useState<NavView>('practice')
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const initRef = useRef(initGame)

  useEffect(() => {
    initRef.current()
  }, [])

  // Show onboarding for first-timers once loading is done
  useEffect(() => {
    if (!isLoading && !hasSeenOnboarding) {
      setShowOnboarding(true)
    }
  }, [isLoading, hasSeenOnboarding])

  // Dynamic document title
  useEffect(() => {
    document.title = phase === 'placement'
      ? 'English Learning · Placement'
      : `English Learning · ${levelLabel}`
  }, [phase, levelLabel])

  function startDailyLesson(skill: SkillId) {
    const items = allContent.filter((i) => i.skill === skill && i.type !== 'placement_test')
    if (items.length > 0) {
      useGameStore.setState({
        questionBuffer: items.slice(0, 10),
        currentIndex: 0,
        showFeedback: false,
        triggerHint: false,
        sessionAnswered: 0,
        sessionCorrect: 0,
        showSessionSummary: false,
      })
    }
  }

  function handleNavigate(view: NavView) {
    if (view === 'settings') {
      setShowSettings(true)
    } else {
      setActiveView(view)
    }
  }

  function closePanelToHome() {
    setActiveView('practice')
  }

  if (isLoading) return <LoadingSkeleton />

  // ── Placement phase ─────────────────────────────────────────
  if (phase === 'placement') {
    return (
      <>
        {showOnboarding && (
          <OnboardingTour onDone={() => setShowOnboarding(false)} />
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

  // ── Main gameplay shell ─────────────────────────────────────
  return (
    <>
      <AppShell
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenSettings={() => setShowSettings(true)}
      >
        <main
          className="flex-1 flex flex-col"
          style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}
        >
          {/* Practice tab */}
          {activeView === 'practice' && (
            item ? (
              <div className="flex flex-col gap-5 py-4 overflow-y-auto flex-1">
                {item.type === 'vocabulary' && (
                  <FlashcardView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
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
                {item.type === 'listening_dictation' && (
                  <DictationView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'verb_conjugation' && (
                  <ConjugationView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
                {item.type === 'reading_comprehension' && (
                  <ReadingView item={item} onAnswer={submitAnswer} showHint={triggerHint} />
                )}
              </div>
            ) : (
              <HomeScreen
                onStartLesson={startDailyLesson}
                onOpenJournal={() => setActiveView('journal')}
                onOpenSkills={() => setActiveView('skills')}
              />
            )
          )}

          {/* Skills tab — inline on desktop, overlay on mobile */}
          {activeView === 'skills' && (
            <div className="flex-1 overflow-y-auto">
              <SkillsPanel onClose={closePanelToHome} />
            </div>
          )}

          {/* Journal tab */}
          {activeView === 'journal' && (
            <div className="flex-1 overflow-y-auto">
              <MistakeJournal
                onClose={closePanelToHome}
                onPractise={closePanelToHome}
              />
            </div>
          )}

          {/* Resources tab */}
          {activeView === 'resources' && (
            <div className="flex-1 overflow-y-auto">
              <ResourcesPanel levelLabel={levelLabel} onClose={closePanelToHome} />
            </div>
          )}
        </main>
      </AppShell>

      {/* ── Global overlays ── */}
      {showFeedback && lastResult && (
        <FeedbackDrawer result={lastResult} onNext={dismissFeedback} />
      )}

      {showSessionSummary && (
        <SessionSummary
          onContinue={() => continueSession()}
          onDone={dismissSessionSummary}
        />
      )}

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </>
  )
}
