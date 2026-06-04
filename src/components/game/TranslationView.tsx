import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, HelpCircle } from 'lucide-react'
import type { ContentItem } from '@/types/game'

interface TranslationViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

export function TranslationView({ item, onAnswer, showHint }: TranslationViewProps) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setInput('')
    setSubmitted(false)
    setRevealAnswer(false)
    // Auto-focus on desktop
    setTimeout(() => textareaRef.current?.focus(), 200)
  }, [item.id])

  function handleSubmit() {
    if (!input.trim() || submitted) return
    setSubmitted(true)
    onAnswer(input.trim())
  }

  function handleIDontKnow() {
    if (submitted) return
    setRevealAnswer(true)
    setSubmitted(true)
    onAnswer('__skip__')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      {/* Prompt */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">
            Translate to English
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-snug text-right" dir="rtl">
          {item.data.context_sentence}
        </p>

        {showHint && item.data.common_mistake && (
          <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Tip</p>
            <p className="text-sm text-amber-700 dark:text-amber-200 leading-relaxed">{item.data.common_mistake}</p>
          </div>
        )}
      </div>

      {/* Answer reveal */}
      {revealAnswer && (
        <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Model answer</p>
          <p className="text-base font-semibold text-violet-900 dark:text-violet-200">{item.data.context_translation}</p>
          {item.data.alternate_answers && item.data.alternate_answers.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-violet-400 mb-1">Also accepted:</p>
              {item.data.alternate_answers.map((alt) => (
                <p key={alt} className="text-sm text-violet-700 dark:text-violet-300 italic">"{alt}"</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          rows={3}
          placeholder="Type the English translation…"
          className={`w-full rounded-xl border-2 px-4 py-3 text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-violet-400'
          }`}
        />
        <p className="text-xs text-slate-400 mt-1 text-right">
          Enter to submit · Shift+Enter for new line
        </p>
      </div>

      {/* Hint about alternates */}
      {item.data.alternate_answers && item.data.alternate_answers.length > 0 && !submitted && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <HelpCircle size={14} />
          <span>Multiple correct translations are accepted</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleIDontKnow}
          disabled={submitted}
          className={`flex items-center gap-2 px-4 min-h-[52px] rounded-xl font-semibold text-sm transition-all border-2 focus-visible:ring-2 focus-visible:ring-violet-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30'
          }`}
        >
          {revealAnswer ? <EyeOff size={16} /> : <Eye size={16} />}
          I don't know
        </button>
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || submitted}
          className={`flex-1 min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-violet-400 ${
            input.trim() && !submitted
              ? 'bg-violet-600 text-white shadow-md active:bg-violet-700 hover:bg-violet-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {submitted ? 'Submitted!' : 'Check'}
        </button>
      </div>
    </div>
  )
}
