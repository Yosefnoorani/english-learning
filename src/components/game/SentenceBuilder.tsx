import { useState, useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'

interface SentenceBuilderProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function SentenceBuilder({ item, onAnswer, showHint }: SentenceBuilderProps) {
  const chips = item.data.word_chips ?? item.data.correct_answer.split(' ')
  const [bank, setBank] = useState<string[]>([])
  const [built, setBuilt] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setBank(shuffle(chips))
    setBuilt([])
    setSubmitted(false)
  }, [item.id])

  function pickChip(index: number) {
    if (submitted) return
    const word = bank[index]
    setBuilt((b) => [...b, word])
    setBank((bk) => bk.filter((_, i) => i !== index))
  }

  function removeChip(index: number) {
    if (submitted) return
    const word = built[index]
    setBuilt((b) => b.filter((_, i) => i !== index))
    setBank((bk) => [...bk, word])
  }

  function reset() {
    setBank(shuffle(chips))
    setBuilt([])
    setSubmitted(false)
  }

  function handleSubmit() {
    if (!built.length || submitted) return
    setSubmitted(true)
    onAnswer(built.join(' '))
  }

  // Keyboard: number keys pick from bank, Backspace removes last built, Enter submits
  function handleKeyDown(e: KeyboardEvent) {
    if (submitted) return
    const n = parseInt(e.key)
    if (!isNaN(n) && n >= 1 && n <= bank.length) {
      e.preventDefault()
      pickChip(n - 1)
    }
    if (e.key === 'Backspace' && built.length > 0) {
      e.preventDefault()
      removeChip(built.length - 1)
    }
    if (e.key === 'Enter' && built.length > 0) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const constructedSentence = built.join(' ')

  // Soft hint: only show first + last word
  const softHint = (() => {
    if (!showHint) return null
    const words = item.data.correct_answer.split(' ')
    if (words.length <= 2) return item.data.correct_answer
    return `${words[0]} … ${words[words.length - 1]}`
  })()

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      {/* Prompt */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Build the sentence</span>
          {constructedSentence && <SpeakButton text={constructedSentence} size={18} />}
        </div>
        <p className="text-base text-slate-700 dark:text-slate-200">{item.data.context_sentence}</p>
        <p className="text-sm text-slate-400 italic mt-1">{item.data.context_translation}</p>

        {softHint && (
          <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Hint (first & last word)</p>
            <p className="text-sm text-amber-700 dark:text-amber-200">{softHint}</p>
          </div>
        )}
      </div>

      {/* Construction zone */}
      <div
        className="min-h-[72px] bg-slate-100 dark:bg-slate-800/60 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 px-4 py-3 flex flex-wrap gap-2 items-start"
        aria-label="Your answer"
      >
        {built.length === 0 && (
          <span className="text-slate-400 text-sm self-center w-full text-center">
            Tap words below to build the sentence
          </span>
        )}
        {built.map((word, i) => (
          <button
            key={`${word}-${i}`}
            onClick={() => removeChip(i)}
            disabled={submitted}
            className="word-chip bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 py-2 rounded-lg shadow focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2" aria-label="Word bank">
        {bank.map((word, i) => (
          <button
            key={`${word}-${i}`}
            onClick={() => pickChip(i)}
            disabled={submitted}
            className="word-chip bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-2 rounded-lg shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span className="hidden md:inline text-[10px] text-slate-300 dark:text-slate-600 mr-1">{i + 1}</span>
            {word}
          </button>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex gap-3">
        <button
          onClick={reset}
          aria-label="Reset"
          className="min-h-[52px] min-w-[52px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <RotateCcw size={20} />
        </button>
        <button
          ref={submitRef}
          onClick={handleSubmit}
          disabled={!built.length || submitted}
          className={`flex-1 min-h-[52px] rounded-xl font-semibold text-base transition-all focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            built.length && !submitted
              ? 'bg-indigo-600 text-white shadow-md active:bg-indigo-700 hover:bg-indigo-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {submitted ? 'Checking…' : 'Check answer'}
          {built.length > 0 && !submitted && (
            <span className="ml-2 text-xs opacity-60 hidden md:inline">(Enter)</span>
          )}
        </button>
      </div>
    </div>
  )
}
