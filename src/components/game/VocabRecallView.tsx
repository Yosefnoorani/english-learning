import { useState, useEffect, useRef } from 'react'
import { BookOpen, EyeOff, HelpCircle } from 'lucide-react'
import { SpeakButton } from '@/components/ui/SpeakButton'
import type { ContentItem } from '@/types/game'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameStore } from '@/store/useGameStore'
import { maskWord, buildLetterHint } from '@/utils/wordHint'
import { ExerciseLayout } from '@/components/layout/ExerciseLayout'
import { Card } from '@/components/ui/Card'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { TextInput } from '@/components/ui/TextInput'

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
    <ExerciseLayout
      actions={
        <>
          <div className="flex gap-2">
            <SecondaryButton onClick={handleSkip} disabled={submitted} iconOnly aria-label="Skip">
              <EyeOff size={18} />
            </SecondaryButton>
            <SecondaryButton
              onClick={handleHint}
              disabled={submitted || hintLevel >= 3}
              iconOnly
              variant="amber"
              aria-label="Hint"
            >
              <HelpCircle size={18} />
            </SecondaryButton>
          </div>
          <PrimaryButton onClick={handleSubmit} disabled={!input.trim() || submitted}>
            {submitted ? 'Checking…' : 'Check'}
          </PrimaryButton>
        </>
      }
    >
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <BookOpen size={14} />
            Vocabulary
          </span>
          <SpeakButton text={item.data.context_sentence} size={18} />
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-center" dir="rtl">
            <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mb-1">
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
      </Card>

      <TextInput
        ref={inputRef}
        label="Type the English word:"
        hint="Press Enter to check"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitted}
        placeholder="Type the word…"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </ExerciseLayout>
  )
}
