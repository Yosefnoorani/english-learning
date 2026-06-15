import { BookOpen } from 'lucide-react'
import { useGameStore, selectCurrentItem } from '@/store/useGameStore'
import { VocabRecallView } from './VocabRecallView'
import { GrammarChoiceView } from './GrammarChoiceView'
import { SentenceBuilder } from './SentenceBuilder'

interface PlacementViewProps {
  onStart: () => void
  started: boolean
}

export function PlacementView({ onStart, started }: PlacementViewProps) {
  const item = useGameStore(selectCurrentItem)
  const placementAnswered = useGameStore((s) => s.placementAnswered)
  const submitAnswer = useGameStore((s) => s.submitAnswer)
  const isLoading = useGameStore((s) => s.isLoading)

  const TOTAL = 5

  // Welcome screen — show if not started, OR if this is a fresh placement (no answers yet)
  const showWelcome = !started && placementAnswered === 0
  if (showWelcome) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60svh] gap-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center shadow-md">
          <BookOpen size={40} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Let's get started!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            We'll ask you 5 quick questions to personalise your learning path. There are no wrong
            answers — just do your best!
          </p>
        </div>
        <ul className="text-left space-y-2 w-full">
          {['Vocabulary recall', 'Grammar challenges', 'Sentence building'].map((t) => (
            <li key={t} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
              {t}
            </li>
          ))}
        </ul>
        <button
          onClick={onStart}
          className="w-full min-h-[56px] rounded-xl bg-indigo-600 text-white font-bold text-base shadow-lg active:bg-indigo-700 transition-colors"
        >
          Start assessment
        </button>
      </div>
    )
  }

  if (isLoading || !item) {
    return (
      <div className="w-full max-w-xl mx-auto flex items-center justify-center min-h-[60svh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-5">
      {/* Progress bar */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Placement Test
          </span>
          <span className="text-xs font-semibold text-indigo-600">
            {placementAnswered + 1} / {TOTAL}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((placementAnswered) / TOTAL) * 100}%` }}
          />
        </div>
      </div>

      {/* Question — placement items use type 'placement_test' (MCQ format) */}
      {(item.type === 'placement_test' || item.type === 'grammar_choice') && (
        <GrammarChoiceView item={item} onAnswer={submitAnswer} />
      )}
      {item.type === 'vocabulary' && (
        <VocabRecallView item={item} onAnswer={submitAnswer} />
      )}
      {item.type === 'sentence_builder' && (
        <SentenceBuilder item={item} onAnswer={submitAnswer} />
      )}
    </div>
  )
}
