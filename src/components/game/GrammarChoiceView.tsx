import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { GrammarSentence } from '@/components/game/GrammarSentence'
import { RevealTranslation } from '@/components/game/RevealTranslation'
import { grammarTextForSpeech } from '@/utils/grammarBlank'
import { ExerciseLayout } from '@/components/layout/ExerciseLayout'
import { Card } from '@/components/ui/Card'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

interface GrammarChoiceViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

export function GrammarChoiceView({ item, onAnswer, showHint }: GrammarChoiceViewProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const speechSentence = grammarTextForSpeech(item.data.context_sentence ?? '')

  useEffect(() => {
    setSelected(null)
    setConfirmed(false)
  }, [item.id])

  function handleConfirm() {
    if (!selected || confirmed) return
    setConfirmed(true)
    onAnswer(selected)
  }

  // Number keys 1–4 pick options; Enter confirms
  function handleKeyDown(e: KeyboardEvent) {
    if (confirmed) return
    const options = item.data.options ?? []
    const n = parseInt(e.key)
    if (!isNaN(n) && n >= 1 && n <= options.length) {
      e.preventDefault()
      setSelected(options[n - 1])
    }
    if (e.key === 'Enter' && selected) {
      e.preventDefault()
      handleConfirm()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setSelected(null)
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // Focus confirm button after selection on desktop
  useEffect(() => {
    if (selected && !confirmed) confirmRef.current?.focus()
  }, [selected, confirmed])

  const options = item.data.options ?? []

  return (
    <ExerciseLayout
      actions={
        !confirmed ? (
          <PrimaryButton onClick={handleConfirm} disabled={!selected}>
            Confirm
            {selected && <span className="ml-2 text-xs opacity-60 hidden md:inline">(Enter)</span>}
          </PrimaryButton>
        ) : null
      }
    >
      <Card>
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Grammar</span>
          <SpeakButton text={speechSentence} size={18} />
        </div>
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
          {item.data.question_text}
        </p>
        <p className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug">
          <GrammarSentence text={item.data.context_sentence ?? ''} />
        </p>
        <RevealTranslation text={item.data.context_translation} resetKey={item.id} />

        {showHint && item.data.grammar_hint && (
          <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-200">{item.data.grammar_hint}</p>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3" role="group" aria-label="Answer options">
        {options.map((option, idx) => {
          const isSelected = selected === option
          const isCorrect = option === item.data.correct_answer
          let classes =
            'relative w-full min-h-[56px] rounded-xl px-5 py-3 text-left font-semibold text-base transition-all border-2 flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-indigo-400 '

          if (!confirmed) {
            classes += isSelected
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 ring-2 ring-indigo-300 shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:scale-[0.98]'
          } else if (isCorrect) {
            classes += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
          } else if (isSelected) {
            classes += 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
          } else {
            classes += 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'
          }

          return (
            <button
              key={option}
              onClick={() => !confirmed && setSelected(option)}
              disabled={confirmed}
              className={classes}
              aria-pressed={isSelected}
            >
              {/* Number hint (desktop) */}
              <span className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-400 flex-shrink-0">
                {idx + 1}
              </span>
              {confirmed && isCorrect && <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />}
              {confirmed && isSelected && !isCorrect && <XCircle size={18} className="text-rose-400 flex-shrink-0" />}
              <span className="flex-1">{option}</span>
            </button>
          )
        })}
      </div>
    </ExerciseLayout>
  )
}
