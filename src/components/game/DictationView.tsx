import { focusInput } from '@/utils/focusInput'
import { useState, useEffect, useRef } from 'react'
import { Volume2, RotateCw, HelpCircle, EyeOff } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameStore } from '@/store/useGameStore'
import { ExerciseLayout } from '@/components/layout/ExerciseLayout'
import { Card } from '@/components/ui/Card'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { TextInput } from '@/components/ui/TextInput'

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
  const [skipPhase, setSkipPhase] = useState<'none' | 'reveal' | 'type'>('none')
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const [speedMult, setSpeedMult] = useState(0.85)
  const { speak, stop } = useSpeech({ lang: voiceLang, rate: voiceRate * speedMult })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInput('')
    setSubmitted(false)
    setReplaysLeft(MAX_REPLAYS)
    setIsPlaying(false)
    setHintRevealed(false)
    setSkipPhase('none')

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
    if (skipPhase === 'none') {
      stop()
      setSkipPhase('reveal')
      return
    }
    if (skipPhase === 'reveal') {
      setSkipPhase('type')
      focusInput(inputRef.current, 200)
    }
  }

  function handleHint() {
    if (submitted) return
    setHintRevealed(true)
  }

  function handleSubmit() {
    if (skipPhase === 'type') {
      if (!input.trim() || submitted) return
      stop()
      setSubmitted(true)
      onAnswer(input.trim())
      return
    }
    if (!input.trim() || submitted) return
    stop()
    setSubmitted(true)
    onAnswer(input.trim())
    setTimeout(() => inputRef.current?.blur(), 50)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  const mustTypeAfterSkip = skipPhase === 'type'

  return (
    <ExerciseLayout
      actions={
        <>
          <div className="flex gap-2">
            <SecondaryButton
              onClick={handleSkip}
              disabled={submitted || skipPhase === 'type'}
              iconOnly
              aria-label={skipPhase === 'reveal' ? 'Show answer to type' : 'Skip'}
            >
              <EyeOff size={18} />
            </SecondaryButton>
            <SecondaryButton
              onClick={handleHint}
              disabled={submitted || hintRevealed || skipPhase !== 'none'}
              variant="amber"
              iconOnly
              aria-label="Hint"
            >
              <HelpCircle size={18} />
            </SecondaryButton>
          </div>
          <PrimaryButton
            onClick={handleSubmit}
            disabled={(!input.trim() && skipPhase !== 'reveal') || submitted || skipPhase === 'reveal'}
          >
            {submitted ? 'Checking…' : skipPhase === 'reveal' ? 'Type the sentence below' : mustTypeAfterSkip ? 'Submit typed answer' : 'Check answer'}
          </PrimaryButton>
        </>
      }
    >
      <Card>
        <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
          Listening & Dictation
        </span>

        <div className="flex flex-col items-center gap-4 mt-4">
          <button
            type="button"
            onClick={handleReplay}
            disabled={replaysLeft <= 0 || submitted || isPlaying || skipPhase !== 'none'}
            aria-label={`Play audio${replaysLeft > 0 ? ` (${replaysLeft} replays left)` : ''}`}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-sky-400 ${
              isPlaying
                ? 'bg-sky-100 dark:bg-sky-950/60 ring-4 ring-sky-200 dark:ring-sky-800 cursor-default'
                : replaysLeft > 0 && !submitted && skipPhase === 'none'
                  ? 'bg-slate-100 dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-700 opacity-50 cursor-not-allowed'
            }`}
          >
            <Volume2 size={36} className={`transition-colors ${isPlaying ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`} />
          </button>

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            {isPlaying ? 'Playing…' : skipPhase === 'none' ? 'Tap the speaker to replay' : 'Type what you heard after seeing the answer'}
          </p>

          <div className={`flex items-center gap-2 px-4 min-h-[44px] rounded-xl font-semibold text-sm border-2 ${
            replaysLeft > 0 && !submitted && !isPlaying && skipPhase === 'none'
              ? 'border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
          }`}>
            <RotateCw size={16} />
            {replaysLeft} replay{replaysLeft !== 1 ? 's' : ''} left
          </div>

          {skipPhase === 'none' && (
            <div className="flex gap-2 w-full">
              {([0.75, 1, 1.25] as const).map((mult) => (
                <button
                  key={mult}
                  type="button"
                  disabled={submitted || isPlaying}
                  onClick={() => setSpeedMult(mult * 0.85)}
                  className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold border-2 transition-colors ${
                    Math.abs(speedMult - mult * 0.85) < 0.01
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>
          )}
        </div>

        {(hintRevealed || showHint) && skipPhase === 'none' && (
          <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mt-4">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
              {hintRevealed ? 'Hint (Hebrew)' : 'Tip'}
            </p>
            {hintRevealed && (
              <p className="text-sm text-amber-800 dark:text-amber-200 text-right leading-relaxed" dir="rtl" lang="he">
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

        {(replaysLeft <= 0 && !hintRevealed && !showHint && skipPhase === 'none') && (
          <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mt-4">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
              Text (replays used up)
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 italic">&ldquo;{item.data.context_sentence}&rdquo;</p>
          </div>
        )}

        {skipPhase !== 'none' && (
          <div className="w-full rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-3 mt-4">
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-1">
              {skipPhase === 'reveal' ? 'Answer revealed — now type it from memory' : 'Type the sentence'}
            </p>
            <p className="text-sm text-violet-900 dark:text-violet-100 italic">&ldquo;{item.data.context_sentence}&rdquo;</p>
            {skipPhase === 'reveal' && (
              <button
                type="button"
                onClick={() => { setSkipPhase('type'); focusInput(inputRef.current, 200) }}
                className="mt-2 text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline"
              >
                Ready to type →
              </button>
            )}
          </div>
        )}
      </Card>

      {(skipPhase === 'none' || skipPhase === 'type') && (
        <TextInput
          ref={inputRef}
          label={mustTypeAfterSkip ? 'Type the sentence you saw:' : 'Type what you heard:'}
          hint="Press Enter to submit"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder="Type what you heard…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      )}
    </ExerciseLayout>
  )
}
