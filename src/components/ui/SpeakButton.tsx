import { Volume2 } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameStore } from '@/store/useGameStore'

interface SpeakButtonProps {
  text: string
  className?: string
  size?: number
}

export function SpeakButton({ text, className = '', size = 20 }: SpeakButtonProps) {
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const { speak } = useSpeech({ lang: voiceLang, rate: voiceRate })

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      aria-label="Listen to pronunciation"
      className={`inline-flex items-center justify-center rounded-full p-2 min-h-[44px] min-w-[44px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:bg-indigo-100 dark:active:bg-indigo-950/50 transition-colors ${className}`}
    >
      <Volume2 size={size} />
    </button>
  )
}
