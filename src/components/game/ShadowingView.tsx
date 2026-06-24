import { useState, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { Card } from '@/components/ui/Card'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { ExerciseLayout } from '@/components/layout/ExerciseLayout'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameStore } from '@/store/useGameStore'

interface ShadowingViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
}

export function ShadowingView({ item, onAnswer }: ShadowingViewProps) {
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const { speak } = useSpeech({ lang: voiceLang, rate: voiceRate })
  const { listening, result, supported, start, stop } = useSpeechRecognition(voiceLang)
  const [hasAttempted, setHasAttempted] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const target = item.data.context_sentence ?? item.data.correct_answer

  useEffect(() => {
    setHasAttempted(false)
    setSubmitted(false)
    speak(target)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  function handleRecordToggle() {
    if (listening) {
      stop()
      setHasAttempted(true)
    } else {
      start()
    }
  }

  function handleCheck() {
    if (!result || submitted) return
    setSubmitted(true)
    onAnswer(result.transcript.trim() || '__skip__')
  }

  if (!supported) {
    return (
      <ExerciseLayout actions={null}>
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Speech recognition is not supported in this browser. Try Chrome on Android or desktop.
          </p>
        </Card>
      </ExerciseLayout>
    )
  }

  return (
    <ExerciseLayout
      actions={
        <PrimaryButton onClick={handleCheck} disabled={!result || submitted}>
          {submitted ? 'Checking…' : 'Check pronunciation'}
        </PrimaryButton>
      }
    >
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-2">
          Shadowing
        </p>
        {hasAttempted ? (
          <>
            <p className="text-[17px] leading-7 text-slate-800 dark:text-slate-100 mb-3">{target}</p>
            <SpeakButton text={target} size={18} />
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Listen first, then tap the mic and repeat the sentence without reading it.
          </p>
        )}
      </Card>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleRecordToggle}
          disabled={submitted}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-600 text-white'
          }`}
          aria-label={listening ? 'Stop recording' : 'Start recording'}
        >
          {listening ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
        <p className="text-sm text-slate-500">{listening ? 'Listening…' : 'Tap and repeat the sentence'}</p>
        {result && (
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 w-full text-center">
            You said: {result.transcript}
          </p>
        )}
      </div>
    </ExerciseLayout>
  )
}
