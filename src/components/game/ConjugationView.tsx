import { useState, useEffect, useRef } from 'react'
import { SpeakButton } from '@/components/ui/SpeakButton'
import type { ContentItem } from '@/types/game'
import { useGameStore } from '@/store/useGameStore'
import { useSpeech } from '@/hooks/useSpeech'

interface ConjugationViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

export function ConjugationView({ item, onAnswer, showHint }: ConjugationViewProps) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const { speak } = useSpeech({ lang: voiceLang, rate: voiceRate })

  useEffect(() => {
    setInput('')
    setSubmitted(false)
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [item.id])

  // Auto-read verb when it changes
  useEffect(() => {
    if (item.data.verb_base) speak(item.data.verb_base)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  function handleSubmit() {
    if (!input.trim() || submitted) return
    setSubmitted(true)
    onAnswer(input.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  const speakText = [item.data.verb_base, item.data.correct_answer].filter(Boolean).join(', ')

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      {/* Header card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Verb Conjugation
          </span>
          <SpeakButton text={speakText} size={18} />
        </div>

        {/* Three info chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2 min-w-[80px]">
            <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wide">Base form</span>
            <span className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">{item.data.verb_base}</span>
          </div>
          <div className="flex flex-col items-center bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-2 flex-1">
            <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Tense</span>
            <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200 mt-0.5 text-center leading-tight">{item.data.target_tense}</span>
          </div>
          <div className="flex flex-col items-center bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2 min-w-[80px]">
            <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wide">Subject</span>
            <span className="text-sm font-bold text-amber-800 dark:text-amber-200 mt-0.5 text-center leading-tight">{item.data.target_person}</span>
          </div>
        </div>

        {/* Example */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 italic leading-relaxed">
            "{item.data.context_sentence}"
          </p>
          <p className="text-xs text-slate-400 mt-1">{item.data.context_translation}</p>
        </div>

        {showHint && item.data.common_mistake && (
          <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Tip</p>
            <p className="text-sm text-amber-700 dark:text-amber-200 leading-relaxed">{item.data.common_mistake}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div>
        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Conjugate "{item.data.verb_base}" ({item.data.target_tense}, {item.data.target_person}):
        </label>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder="Type the conjugated form…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full rounded-xl border-2 px-4 py-3 text-lg font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-emerald-400'
          }`}
        />
        <p className="text-xs text-slate-400 mt-1">Press Enter to submit</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!input.trim() || submitted}
        className={`w-full min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 ${
          input.trim() && !submitted
            ? 'bg-emerald-600 text-white shadow-md active:bg-emerald-700 hover:bg-emerald-700'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {submitted ? 'Checking…' : 'Check'}
      </button>
    </div>
  )
}
