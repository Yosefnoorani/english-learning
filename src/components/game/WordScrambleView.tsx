import { useState, useEffect, useRef } from 'react'
import { RotateCcw, Shuffle } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { scrambleWord } from '@/utils/wordHint'

interface WordScrambleViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

function shuffleLetters(arr: string[]): string[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function WordScrambleView({ item, onAnswer, showHint }: WordScrambleViewProps) {
  const targetWord = item.data.word ?? item.data.correct_answer
  const scrambled = item.data.scrambled_word ?? scrambleWord(targetWord)

  const [bank, setBank] = useState<string[]>([])
  const [built, setBuilt] = useState<string[]>([])
  const [typed, setTyped] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBank(shuffleLetters(scrambled.split('')))
    setBuilt([])
    setTyped('')
    setSubmitted(false)
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [item.id, scrambled])

  function syncFromTyped(value: string) {
    const remaining = scrambled.split('')
    for (const c of value) {
      const idx = remaining.findIndex((r) => r.toLowerCase() === c.toLowerCase())
      if (idx >= 0) remaining.splice(idx, 1)
    }
    setBank(shuffleLetters(remaining))
    setBuilt(value.split(''))
    setTyped(value)
  }

  function pickLetter(index: number) {
    if (submitted) return
    const ch = bank[index]
    syncFromTyped(typed + ch)
  }

  function removeLetter(index: number) {
    if (submitted) return
    const chars = typed.split('')
    chars.splice(index, 1)
    syncFromTyped(chars.join(''))
  }

  function reset() {
    syncFromTyped('')
    setBank(shuffleLetters(scrambled.split('')))
    setSubmitted(false)
  }

  function handleSubmit() {
    const answer = typed.trim()
    if (!answer || submitted) return
    setSubmitted(true)
    onAnswer(answer)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
            <Shuffle size={14} />
            Word Scramble
          </span>
          <SpeakButton text={targetWord} size={18} />
        </div>

        <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-4 py-3 text-center mb-3" dir="rtl">
          <p className="text-[10px] font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wide mb-1">
            Meaning (Hebrew)
          </p>
          <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{item.data.translation}</p>
        </div>

        {item.data.context_sentence && (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-3">
            &ldquo;{item.data.context_sentence}&rdquo;
          </p>
        )}

        {showHint && item.data.common_mistake && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-3">
            <p className="text-sm text-amber-700 dark:text-amber-200">{item.data.common_mistake}</p>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-2">Tap letters or type the word:</p>

        <div className="flex flex-wrap gap-2 mb-3 min-h-[44px] p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
          {built.length === 0 && (
            <span className="text-sm text-slate-400 px-2 py-1">Build the word here…</span>
          )}
          {built.map((ch, i) => (
            <button
              key={`${i}-${ch}`}
              type="button"
              disabled={submitted}
              onClick={() => removeLetter(i)}
              className="min-h-[36px] px-3 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-200 font-bold text-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {bank.map((ch, i) => (
            <button
              key={`bank-${i}-${ch}`}
              type="button"
              disabled={submitted}
              onClick={() => pickLetter(i)}
              className="min-h-[40px] min-w-[40px] px-2 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-lg border-2 border-slate-200 dark:border-slate-600 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
            >
              {ch}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={reset}
          disabled={submitted}
          className="mt-3 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 min-h-[36px]"
        >
          <RotateCcw size={14} />
          Reset letters
        </button>
      </div>

      <div>
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => {
            if (submitted) return
            syncFromTyped(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder="Or type the word…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full rounded-xl border-2 px-4 py-3 text-lg font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-orange-400'
          }`}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!typed.trim() || submitted}
        className={`w-full min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-orange-400 ${
          typed.trim() && !submitted
            ? 'bg-orange-600 text-white shadow-md active:bg-orange-700 hover:bg-orange-700'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {submitted ? 'Checking…' : 'Check'}
      </button>
    </div>
  )
}
