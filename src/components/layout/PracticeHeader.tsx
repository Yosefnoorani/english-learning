import { Settings, Zap } from 'lucide-react'
import { useGameStore, selectCurrentItem } from '@/store/useGameStore'
import type { QuestionType } from '@/types/game'
import { SKILL_LABELS } from '@/types/game'

const SESSION_SIZES = { quick: 5, standard: 10, deep: 20 } as const

const TYPE_LABELS: Partial<Record<QuestionType, string>> = {
  vocabulary: 'Vocabulary',
  grammar_choice: 'Grammar',
  sentence_builder: 'Sentence Builder',
  translation_he_en: 'Translation',
  listening_dictation: 'Listening',
  verb_conjugation: 'Conjugation',
  reading_comprehension: 'Reading',
  word_spelling: 'Spelling',
  vocabulary_match: 'Matching',
  vocabulary_choice: 'Vocab Choice',
  word_scramble: 'Word Scramble',
  placement_test: 'Placement',
}

interface PracticeHeaderProps {
  onOpenSettings?: () => void
}

export function PracticeHeader({ onOpenSettings }: PracticeHeaderProps) {
  const sessionAnswered = useGameStore((s) => s.sessionAnswered)
  const sessionMode = useGameStore((s) => s.sessionMode)
  const sessionCombo = useGameStore((s) => s.sessionCombo)
  const practiceTier = useGameStore((s) => s.practiceTier)
  const item = useGameStore(selectCurrentItem)

  const sessionTarget = SESSION_SIZES[sessionMode]
  const questionNum = Math.min(sessionAnswered + 1, sessionTarget)
  const progressPct = Math.round((sessionAnswered / sessionTarget) * 100)
  const typeLabel = item ? (TYPE_LABELS[item.type] ?? item.type) : 'Practice'
  const skillLabel = item ? SKILL_LABELS[item.skill] : null

  return (
    <header
      className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 flex-shrink-0"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="w-full max-w-screen-xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
              Question {questionNum}/{sessionTarget}
            </span>
            <span className="text-xs text-slate-400 truncate">{typeLabel}</span>
          </div>
          {skillLabel && (
            <p className="text-[10px] text-slate-400 truncate mb-1">
              {skillLabel} · Tier {practiceTier}
            </p>
          )}
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {sessionCombo >= 2 && (
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-2.5 py-1.5 flex-shrink-0">
            <Zap size={14} className="text-amber-500" />
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">×{sessionCombo}</span>
          </div>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
