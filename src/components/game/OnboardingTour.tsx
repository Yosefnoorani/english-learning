import { useState } from 'react'
import { BookOpen, Repeat2, Settings, ChevronRight, Target, Languages } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'

interface OnboardingTourProps {
  onDone: () => void
  onStartPlacement?: () => void
  onSkip?: () => void
}

const SCREENS = [
  {
    icon: <Languages size={40} className="text-violet-500" />,
    bg: 'from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40',
    title: 'Built for Hebrew Speakers',
    body: 'Practice in English with Hebrew explanations when you need them. Tips and feedback help you avoid common Hebrew→English mistakes.',
    cta: 'Next',
  },
  {
    icon: <BookOpen size={40} className="text-indigo-500" />,
    bg: 'from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40',
    title: 'Adaptive English Practice',
    body: 'The app learns your level and picks the right exercises for you — grammar, vocabulary, translation, listening, and more.',
    cta: 'Next',
  },
  {
    icon: <Repeat2 size={40} className="text-rose-500" />,
    bg: 'from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/40',
    title: 'Review Your Mistakes',
    body: "Every word you get wrong is saved in your Mistake Journal with spaced repetition. When items are due, you'll see a badge on the Mistakes tab.",
    cta: 'Next',
  },
  {
    icon: <Settings size={40} className="text-emerald-500" />,
    bg: 'from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40',
    title: 'Make It Your Own',
    body: 'Choose Quick (5Q), Standard (10Q), or Deep (20Q) sessions. Turn on dark mode, adjust sound effects, and set your daily goal — all in Settings.',
    cta: 'Next',
  },
  {
    icon: <Target size={40} className="text-indigo-500" />,
    bg: 'from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40',
    title: 'Find Your Level',
    body: 'Take a quick 5-question placement test so exercises match your English level from the start.',
    cta: 'Take placement test',
  },
]

export function OnboardingTour({ onDone, onStartPlacement, onSkip }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const markOnboardingSeen = useGameStore((s) => s.markOnboardingSeen)
  const current = SCREENS[step]

  function advance() {
    if (step < SCREENS.length - 1) {
      setStep((s) => s + 1)
    } else {
      markOnboardingSeen()
      onStartPlacement?.()
      onDone()
    }
  }

  function handleSkip() {
    markOnboardingSeen()
    onSkip?.()
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm fade-in">
        <div className={`rounded-3xl bg-gradient-to-br ${current.bg} p-8 shadow-2xl flex flex-col items-center gap-6 text-center`}>
          <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center">
            {current.icon}
          </div>

          <div className="flex gap-2">
            {SCREENS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{current.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{current.body}</p>
          </div>

          <button
            type="button"
            onClick={advance}
            className="w-full min-h-[52px] rounded-xl bg-indigo-600 text-white font-bold text-base shadow-lg active:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            {current.cta}
            {step < SCREENS.length - 1 && <ChevronRight size={18} />}
          </button>

          {step < SCREENS.length - 1 && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Skip intro
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
