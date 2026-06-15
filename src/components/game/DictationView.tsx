import { useState, useEffect, useRef } from 'react'
import { Volume2, RotateCw, HelpCircle, EyeOff } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameStore } from '@/store/useGameStore'

interface DictationViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

const MAX_REPLAYS = 3

export function DictationView({ item, onAnswer, showHint }: DictationViewProps) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [replaysLeft, setReplaysLeft] = useState(MAX_REPLAYS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hintRevealed, setHintRevealed] = useState(false)
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const { speak, stop } = useSpeech({ lang: voiceLang, rate: voiceRate * 0.85 }) // slightly slower for dictation
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInput('')
    setSubmitted(false)
    setReplaysLeft(MAX_REPLAYS)
    setIsPlaying(false)
    setHintRevealed(false)

    const timer = setTimeout(() => playAudio(), 400)
    return () => { clearTimeout(timer); stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  function playAudio() {
    stop()
    setIsPlaying(true)
    setReplaysLeft((r) => Math.max(0, r - 1))
    speak(item.data.context_sentence)
    const wordCount = item.data.context_sentence.split(' ').length
    setTimeout(() => setIsPlaying(false), wordCount * 650 + 500)
  }

  function handleReplay() {
    if (replaysLeft <= 0 || submitted || isPlaying) return
    playAudio()
  }

  function handleSkip() {
    if (submitted) return
    stop()
    setSubmitted(true)
    onAnswer('__skip__')
  }

  function handleHint() {
    if (submitted) return
    setHintRevealed(true)
  }

  function handleSubmit() {
    if (!input.trim() || submitted) return
    stop()
    setSubmitted(true)
    onAnswer(input.trim())
    setTimeout(() => inputRef.current?.blur(), 50)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      {/* Audio card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 flex flex-col items-center gap-4">
        <span className="self-start text-xs font-semibold uppercase tracking-widest text-sky-500">
          Listening & Dictation
        </span>

        {/* Animated speaker */}
        <button
          onClick={handleReplay}
          disabled={replaysLeft <= 0 || submitted || isPlaying}
          aria-label={`Play audio${replaysLeft > 0 ? ` (${replaysLeft} replays left)` : ' (no replays left)'}`}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isPlaying
              ? 'bg-sky-100 dark:bg-sky-950/60 ring-4 ring-sky-200 dark:ring-sky-800 cursor-default'
              : replaysLeft > 0 && !submitted
                ? 'bg-slate-100 dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer'
                : 'bg-slate-100 dark:bg-slate-700 opacity-50 cursor-not-allowed'
          }`}
        >
          <Volume2 size={36} className={`transition-colors ${isPlaying ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`} />
        </button>

        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          {isPlaying ? 'Playing…' : 'Tap the speaker to replay'}
        </p>

        {/* Replay count badge */}
        <div className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl font-semibold text-sm border-2 ${
          replaysLeft > 0 && !submitted && !isPlaying
            ? 'border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400'
            : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
        }`}>
          <RotateCw size={14} />
          <span>Replay {replaysLeft > 0 ? `(${replaysLeft} left)` : '(used up)'}</span>
        </div>

        {/* Hint: Hebrew translation (manual or after mistake) */}
        {(hintRevealed || showHint) && (
          <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
              {hintRevealed ? 'Hint (Hebrew)' : 'Tip'}
            </p>
            {hintRevealed && (
              <p className="text-sm text-amber-800 dark:text-amber-200 text-right leading-relaxed" dir="rtl">
                {item.data.context_translation}
              </p>
            )}
            {showHint && item.data.common_mistake && (
              <p className="text-sm text-amber-700 dark:text-amber-200 leading-relaxed mt-1">
                {item.data.common_mistake}
              </p>
            )}
          </div>
        )}

        {/* English text only when replays exhausted (no manual hint yet) */}
        {replaysLeft <= 0 && !hintRevealed && !showHint && (
          <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
              Text (replays used up)
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 italic">&ldquo;{item.data.context_sentence}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Skip / Hint actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSkip}
          disabled={submitted}
          className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl font-semibold text-sm transition-all border-2 focus-visible:ring-2 focus-visible:ring-sky-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-sky-300 dark:hover:border-sky-600 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30'
          }`}
        >
          <EyeOff size={16} />
          Skip
        </button>
        <button
          onClick={handleHint}
          disabled={submitted || hintRevealed}
          className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl font-semibold text-sm transition-all border-2 focus-visible:ring-2 focus-visible:ring-amber-400 ${
            submitted || hintRevealed
              ? 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
          }`}
        >
          <HelpCircle size={16} />
          Hint
        </button>
      </div>

      {/* Input */}
      <div>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder="Type what you heard…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full rounded-xl border-2 px-4 py-3 text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 ${
            submitted
              ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-sky-400'
          }`}
        />
        <p className="text-xs text-slate-400 mt-1">
          Minor punctuation differences are accepted · Press Enter to submit
        </p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || submitted}
        className={`w-full min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-sky-400 ${
          input.trim() && !submitted
            ? 'bg-sky-600 text-white shadow-md active:bg-sky-700 hover:bg-sky-700'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {submitted ? 'Checking…' : 'Check answer'}
      </button>
    </div>
  )
}
