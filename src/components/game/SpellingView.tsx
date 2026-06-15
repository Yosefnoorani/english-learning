import { useState, useEffect, useRef } from 'react'
import { PenLine } from 'lucide-react'
import { SpeakButton } from '@/components/ui/SpeakButton'
import type { ContentItem } from '@/types/game'
import { useGameStore } from '@/store/useGameStore'
import { useSpeech } from '@/hooks/useSpeech'
import { maskWord, buildLetterHint } from '@/utils/wordHint'

interface SpellingViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

export function SpellingView({ item, onAnswer, showHint }: SpellingViewProps) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const { speak } = useSpeech({ lang: voiceLang, rate: voiceRate })

  const targetWord = item.data.word ?? item.data.correct_answer
  const maskedSentence = maskWord(item.data.context_sentence, targetWord)

  useEffect(() => {
    setInput('')
    setSubmitted(false)
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  const letterHint = showHint && targetWord ? buildLetterHint(targetWord, 2) : null

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400 flex items-center gap-1.5">
            <PenLine size={14} />
            Word Spelling
          </span>
          <SpeakButton text={item.data.context_sentence} size={18} />
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 dark:border-fuchsia-800 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold text-fuchsia-500 dark:text-fuchsia-400 uppercase tracking-wide mb-1">
              Meaning (Hebrew)
            </p>
            <p className="text-xl font-bold text-fuchsia-900 dark:text-fuchsia-100">{item.data.translation}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 italic leading-relaxed">
              "{maskedSentence}"
            </p>
            <p className="text-xs text-slate-400 mt-1">{item.data.context_translation}</p>
          </div>
        </div>

        {letterHint && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Spelling hint</p>
            <p className="text-sm font-mono text-amber-800 dark:text-amber-200">{letterHint}</p>
          </div>
        )}

        {showHint && item.data.common_mistake && !letterHint && (
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
          placeholder="Spell the word…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full rounded-xl border-2 px-4 py-3 text-lg font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fuchsia-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-fuchsia-400'
          }`}
        />
        <p className="text-xs text-slate-400 mt-1">Press Enter to check spelling</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!input.trim() || submitted}
        className={`w-full min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-400 ${
          input.trim() && !submitted
            ? 'bg-fuchsia-600 text-white shadow-md active:bg-fuchsia-700 hover:bg-fuchsia-700'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {submitted ? 'Checking…' : 'Check spelling'}
      </button>
    </div>
  )
}
