import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'

interface VocabularyChoiceViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

export function VocabularyChoiceView({ item, onAnswer, showHint }: VocabularyChoiceViewProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setSelected(null)
    setConfirmed(false)
  }, [item.id])

  function handleConfirm() {
    if (!selected || confirmed) return
    setConfirmed(true)
    onAnswer(selected)
  }

  useEffect(() => {
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
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    if (selected && !confirmed) confirmRef.current?.focus()
  }, [selected, confirmed])

  const options = item.data.options ?? []

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Vocabulary — Multiple Choice
          </span>
          {item.data.correct_answer && (
            <SpeakButton text={item.data.correct_answer} size={18} />
          )}
        </div>

        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
          {item.data.question_text ?? 'Choose the correct English word:'}
        </p>

        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 mb-3" dir="rtl">
          <p className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wide mb-1">
            Hebrew meaning
          </p>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 text-right">
            {item.data.translation}
          </p>
        </div>

        {item.data.context_sentence && (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-2">
            &ldquo;{item.data.context_sentence}&rdquo;
          </p>
        )}

        {showHint && item.data.common_mistake && (
          <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-200">{item.data.common_mistake}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isSelected = selected === opt
          const isCorrect = confirmed && opt === item.data.correct_answer
          const isWrong = confirmed && isSelected && opt !== item.data.correct_answer

          return (
            <button
              key={opt}
              type="button"
              disabled={confirmed}
              onClick={() => setSelected(opt)}
              className={`min-h-[52px] px-4 py-3 rounded-xl text-left font-semibold border-2 transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 flex items-center justify-between gap-2 ${
                isCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200'
                  : isWrong
                    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200'
                    : isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-100'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-300 dark:hover:border-emerald-600'
              }`}
            >
              <span>
                <span className="text-slate-400 font-normal mr-2 hidden md:inline">{i + 1}.</span>
                {opt}
              </span>
              {isCorrect && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
              {isWrong && <XCircle size={18} className="text-rose-500 shrink-0" />}
            </button>
          )
        })}
      </div>

      <button
        ref={confirmRef}
        onClick={handleConfirm}
        disabled={!selected || confirmed}
        className={`w-full min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 ${
          selected && !confirmed
            ? 'bg-emerald-600 text-white shadow-md active:bg-emerald-700 hover:bg-emerald-700'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {confirmed ? 'Checking…' : 'Confirm'}
      </button>
    </div>
  )
}
