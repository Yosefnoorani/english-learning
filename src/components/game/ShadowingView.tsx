import { useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { Card } from '@/components/ui/Card'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameStore } from '@/store/useGameStore'

interface ShadowingViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
}

function similarity(a: string, b: string): number {
  const na = a.toLowerCase().replace(/[^\w\s]/g, '').trim()
  const nb = b.toLowerCase().replace(/[^\w\s]/g, '').trim()
  if (na === nb) return 1
  if (!na || !nb) return 0
  const wordsA = na.split(/\s+/)
  const wordsB = nb.split(/\s+/)
  const matches = wordsA.filter((w) => wordsB.includes(w)).length
  return matches / Math.max(wordsA.length, wordsB.length)
}

export function ShadowingView({ item, onAnswer }: ShadowingViewProps) {
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const { speak } = useSpeech({ lang: voiceLang, rate: voiceRate })
  const { listening, result, supported, start, stop } = useSpeechRecognition(voiceLang)

  const target = item.data.context_sentence ?? item.data.correct_answer

  useEffect(() => {
    speak(target)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  function handleCheck() {
    if (!result) return
    const score = similarity(result.transcript, target)
    onAnswer(score >= 0.7 ? target : result.transcript)
  }

  if (!supported) {
    return (
      <div className="px-4 max-w-xl mx-auto">
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Speech recognition is not supported in this browser. Try Chrome on Android or desktop.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4 max-w-xl mx-auto flex flex-col gap-5">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-2">
          Shadowing
        </p>
        <p className="text-[17px] leading-7 text-slate-800 dark:text-slate-100 mb-3">{target}</p>
        <SpeakButton text={target} size={18} />
      </Card>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={listening ? stop : start}
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

      <PrimaryButton onClick={handleCheck} disabled={!result}>
        Check pronunciation
      </PrimaryButton>
    </div>
  )
}
