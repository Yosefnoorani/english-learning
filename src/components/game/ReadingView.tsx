import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, ChevronRight, BookOpen, Eye } from 'lucide-react'
import type { ContentItem, ComprehensionQuestion } from '@/types/game'

interface ReadingViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  onDismiss?: () => void
  showHint?: boolean
}

export function ReadingView({ item, onAnswer, onDismiss, showHint }: ReadingViewProps) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [score, setScore] = useState(0)
  const [readingPhase, setReadingPhase] = useState<'reading' | 'questions' | 'done'>('reading')
  const confirmRef = useRef<HTMLButtonElement>(null)

  const questions: ComprehensionQuestion[] = item.data.comprehension_questions ?? []
  const currentQuestion = questions[questionIndex]
  const totalQuestions = questions.length

  useEffect(() => {
    setShowTranslation(false)
    setQuestionIndex(0)
    setSelected(null)
    setConfirmed(false)
    setScore(0)
    setReadingPhase('reading')
  }, [item.id])

  // Keyboard: number keys pick, Enter confirms/advances
  function handleKeyDown(e: KeyboardEvent) {
    if (readingPhase !== 'questions') return
    if (confirmed) {
      if (e.key === 'Enter') { e.preventDefault(); handleNext() }
      return
    }
    const options = currentQuestion.options
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

  useEffect(() => {
    if (selected && !confirmed) confirmRef.current?.focus()
  }, [selected, confirmed])

  function handleConfirm() {
    if (!selected || confirmed) return
    setConfirmed(true)
    if (selected === currentQuestion.answer) setScore((s) => s + 1)
  }

  function handleNext() {
    const next = questionIndex + 1
    if (next >= totalQuestions) {
      setReadingPhase('done')
      const finalScore = score + (selected === currentQuestion?.answer ? 1 : 0)
      const pct = Math.round((finalScore / totalQuestions) * 100)
      onAnswer(pct >= 67 ? '__correct__' : '__wrong__')
    } else {
      setQuestionIndex(next)
      setSelected(null)
      setConfirmed(false)
    }
  }

  // ── Reading phase ─────────────────────────────────────────
  if (readingPhase === 'reading') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-teal-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                Reading Comprehension
              </span>
            </div>
            <span className="text-xs text-slate-400">{totalQuestions} questions</span>
          </div>

          {/* Passage — larger text for readability */}
          <div className="text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-7 whitespace-pre-line">
            {item.data.passage}
          </div>

          {showHint && item.data.common_mistake && (
            <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Reading tip</p>
              <p className="text-sm text-amber-700 dark:text-amber-200">{item.data.common_mistake}</p>
            </div>
          )}
        </div>

        {/* Translation toggle — proper button with 44px target */}
        <button
          onClick={() => setShowTranslation((v) => !v)}
          className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors self-start focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          <Eye size={15} />
          {showTranslation ? 'Hide translation' : 'Show translation (Hebrew)'}
        </button>

        {showTranslation && (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic text-right px-2 leading-relaxed" dir="rtl">
            {item.data.context_translation}
          </p>
        )}

        <button
          onClick={() => setReadingPhase('questions')}
          className="w-full min-h-[52px] rounded-xl bg-teal-600 text-white font-bold text-base shadow-md active:bg-teal-700 hover:bg-teal-700 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          Answer Questions →
        </button>
      </div>
    )
  }

  // ── Done phase ────────────────────────────────────────────
  if (readingPhase === 'done') {
    const finalScore = score
    const pct = Math.round((finalScore / totalQuestions) * 100)
    const passed = pct >= 67

    return (
      <div className="w-full max-w-xl mx-auto px-4 flex flex-col items-center gap-5">
        <div className={`w-full rounded-2xl shadow-lg p-6 flex flex-col items-center gap-4 ${
          passed ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-white dark:bg-slate-800'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
            passed ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-700'
          }`}>
            {passed ? '🎉' : '📖'}
          </div>
          <p className={`text-xl font-bold ${passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
            {passed ? 'Well done!' : 'Keep reading!'}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            You answered <strong>{finalScore}</strong> of <strong>{totalQuestions}</strong> correctly ({pct}%)
          </p>
          {!passed && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              Try reading the passage again before moving on.
            </p>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              autoFocus
              className="w-full min-h-[52px] rounded-xl bg-teal-600 text-white font-bold text-base shadow-md active:bg-teal-700 hover:bg-teal-700 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Questions phase ───────────────────────────────────────
  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Question {questionIndex + 1} of {totalQuestions}</span>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i < questionIndex ? 'bg-teal-500' : i === questionIndex ? 'bg-teal-300' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug mb-4">
          {currentQuestion.q}
        </p>

        <div className="flex flex-col gap-3" role="group" aria-label="Answer options">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = selected === opt
            const isCorrect = opt === currentQuestion.answer
            let classes =
              'w-full min-h-[52px] rounded-xl px-4 py-3 text-left text-sm font-semibold border-2 flex items-center gap-3 transition-all focus-visible:ring-2 focus-visible:ring-teal-400 '

            if (!confirmed) {
              classes += isSelected
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 ring-2 ring-teal-200 shadow-md'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 active:scale-[0.98]'
            } else if (isCorrect) {
              classes += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
            } else if (isSelected) {
              classes += 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
            } else {
              classes += 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'
            }

            return (
              <button
                key={opt}
                onClick={() => !confirmed && setSelected(opt)}
                disabled={confirmed}
                className={classes}
              >
                <span className="hidden md:flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-400 flex-shrink-0">
                  {idx + 1}
                </span>
                {confirmed && isCorrect && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
                {confirmed && isSelected && !isCorrect && <XCircle size={16} className="text-rose-400 flex-shrink-0" />}
                <span className="flex-1">{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Confirm / Next */}
      {!confirmed ? (
        <button
          ref={confirmRef}
          onClick={handleConfirm}
          disabled={!selected}
          className={`w-full min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-teal-400 ${
            selected
              ? 'bg-teal-600 text-white shadow-md active:bg-teal-700 hover:bg-teal-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          Confirm
          {selected && <span className="ml-2 text-xs opacity-60 hidden md:inline">(Enter)</span>}
        </button>
      ) : (
        <button
          onClick={handleNext}
          autoFocus
          className="w-full min-h-[52px] rounded-xl bg-teal-600 text-white font-bold text-base shadow-md active:bg-teal-700 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          {questionIndex + 1 < totalQuestions ? 'Next question' : 'Finish'}
          <ChevronRight size={18} />
          <span className="ml-1 text-xs opacity-60 hidden md:inline">(Enter)</span>
        </button>
      )}
    </div>
  )
}
