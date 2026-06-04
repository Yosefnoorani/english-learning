import { useState, useEffect, useRef } from 'react'
import { RotateCw } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameStore } from '@/store/useGameStore'

interface FlashcardViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

/** Mask the target word with blanks in a context sentence */
function maskWord(sentence: string, word: string): string {
  if (!word) return sentence
  const blanks = '_ '.repeat(word.length / 2 + 1).trim()
  return sentence.replace(new RegExp(word, 'i'), blanks)
}

export function FlashcardView({ item, onAnswer, showHint }: FlashcardViewProps) {
  const [flipped, setFlipped] = useState(false)
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const { speak } = useSpeech({ lang: voiceLang, rate: voiceRate })
  const cardRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setFlipped(false)
    // Focus card for keyboard users
    setTimeout(() => cardRef.current?.focus(), 50)
  }, [item.id])

  useEffect(() => {
    if (item.data.word) speak(item.data.word)
  }, [item.id, item.data.word, speak])

  function handleFlip() {
    setFlipped((f) => !f)
    if (!flipped && item.data.word) speak(item.data.context_sentence)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (!flipped) {
        handleFlip()
      }
    }
    if (flipped) {
      if (e.key === 'ArrowLeft' || e.key === '1') { e.preventDefault(); onAnswer('__wrong__') }
      if (e.key === 'ArrowRight' || e.key === '2') { e.preventDefault(); onAnswer(item.data.correct_answer) }
    }
  }

  const maskedHint = showHint && item.data.word
    ? maskWord(item.data.context_sentence, item.data.word)
    : null

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      {/* Keyboard hint strip */}
      {flipped && (
        <p className="text-xs text-slate-400 text-center hidden md:block">
          ← / 1 = Still learning &nbsp;·&nbsp; → / 2 = Got it!
        </p>
      )}

      {/* Flip card */}
      <button
        ref={cardRef}
        className="flip-card w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-2xl"
        style={{ height: 280 }}
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        aria-label={flipped ? 'Flip back — tap or press Space' : 'Reveal translation — tap or press Space'}
        aria-pressed={flipped}
      >
        <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flip-card-front bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Vocabulary</span>
              <SpeakButton text={item.data.word ?? ''} size={18} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <p className="text-4xl font-bold text-slate-800 dark:text-slate-100 text-center">
                {item.data.word}
              </p>
              {maskedHint && (
                <p className="text-sm text-slate-400 italic text-center px-2">
                  {maskedHint}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm">
              <RotateCw size={14} />
              <span>Tap to reveal</span>
            </div>
          </div>

          {/* Back */}
          <div className="flip-card-back bg-indigo-600 rounded-2xl shadow-lg p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Translation</span>
              <SpeakButton text={item.data.context_sentence} size={18} className="text-indigo-200 hover:bg-indigo-500" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <p className="text-2xl font-bold text-white text-center">{item.data.translation}</p>
              <p className="text-sm text-indigo-200 italic text-center leading-relaxed">
                "{item.data.context_sentence}"
              </p>
              <p className="text-xs text-indigo-300 text-center">{item.data.context_translation}</p>
            </div>
            <div className="text-center text-indigo-300 text-xs">Tap again to flip back</div>
          </div>
        </div>
      </button>

      {/* Answer buttons */}
      <div
        className={`flex gap-3 transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!flipped}
      >
        <button
          onClick={() => onAnswer('__wrong__')}
          tabIndex={flipped ? 0 : -1}
          className="flex-1 min-h-[52px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 font-semibold border-2 border-rose-200 dark:border-rose-800 active:bg-rose-100 dark:active:bg-rose-900/50 transition-colors focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          Still learning
          <span className="block text-xs font-normal opacity-60 hidden md:block">← or 1</span>
        </button>
        <button
          onClick={() => onAnswer(item.data.correct_answer)}
          tabIndex={flipped ? 0 : -1}
          className="flex-1 min-h-[52px] rounded-xl bg-emerald-500 text-white font-semibold active:bg-emerald-600 transition-colors shadow-md focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          Got it!
          <span className="block text-xs font-normal opacity-70 hidden md:block">→ or 2</span>
        </button>
      </div>
    </div>
  )
}
