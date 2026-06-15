import { useState, useEffect, useRef } from 'react'
import { BookOpen, EyeOff, HelpCircle } from 'lucide-react'
import { SpeakButton } from '@/components/ui/SpeakButton'
import type { ContentItem } from '@/types/game'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameStore } from '@/store/useGameStore'
import { maskWord, buildLetterHint } from '@/utils/wordHint'

interface VocabRecallViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

export function VocabRecallView({ item, onAnswer, showHint }: VocabRecallViewProps) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const { speak } = useSpeech({ lang: voiceLang, rate: voiceRate })

  const targetWord = item.data.word ?? item.data.correct_answer
  const maskedSentence = maskWord(item.data.context_sentence, targetWord)

  useEffect(() => {
    setInput('')
    setSubmitted(false)
    setHintLevel(0)
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [item.id])

  useEffect(() => {
    if (item.data.context_sentence) speak(item.data.context_sentence)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  function handleSubmit() {
    if (!input.trim() || submitted) return
    setSubmitted(true)
    onAnswer(input.trim())
  }

  function handleSkip() {
    if (submitted) return
    setSubmitted(true)
    onAnswer('__skip__')
  }

  function handleHint() {
    if (submitted || hintLevel >= 3) return
    setHintLevel((l) => l + 1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  const letterHint = hintLevel > 0 ? buildLetterHint(targetWord, hintLevel) : null
  const mistakeHint = showHint && item.data.common_mistake

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <BookOpen size={14} />
            Vocabulary
          </span>
          <SpeakButton text={item.data.context_sentence} size={18} />
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-center" dir="rtl">
            <p className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mb-1">
              Meaning (Hebrew)
            </p>
            <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">{item.data.translation}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 italic leading-relaxed">
              &ldquo;{maskedSentence}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-1" dir="rtl">{item.data.context_translation}</p>
          </div>
        </div>

        {letterHint && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
              Spelling hint
            </p>
            <p className="text-sm font-mono text-amber-800 dark:text-amber-200">{letterHint}</p>
          </div>
        )}

        {mistakeHint && !letterHint && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Tip</p>
            <p className="text-sm text-amber-700 dark:text-amber-200 leading-relaxed">{item.data.common_mistake}</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Type the English word:
        </label>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder="Type the word…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full rounded-xl border-2 px-4 py-3 text-lg font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-indigo-400'
          }`}
        />
        <p className="text-xs text-slate-400 mt-1">Press Enter to check</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSkip}
          disabled={submitted}
          className={`flex items-center gap-2 px-4 min-h-[52px] rounded-xl font-semibold text-sm transition-all border-2 focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
          }`}
        >
          <EyeOff size={16} />
          Skip
        </button>
        <button
          onClick={handleHint}
          disabled={submitted || hintLevel >= 3}
          className={`flex items-center gap-2 px-4 min-h-[52px] rounded-xl font-semibold text-sm transition-all border-2 focus-visible:ring-2 focus-visible:ring-amber-400 ${
            submitted || hintLevel >= 3
              ? 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
          }`}
        >
          <HelpCircle size={16} />
          Hint
        </button>
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || submitted}
          className={`flex-1 min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            input.trim() && !submitted
              ? 'bg-indigo-600 text-white shadow-md active:bg-indigo-700 hover:bg-indigo-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {submitted ? 'Checking…' : 'Check'}
        </button>
      </div>
    </div>
  )
}
