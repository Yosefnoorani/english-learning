import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { GrammarSentence } from '@/components/game/GrammarSentence'

interface RevealTranslationProps {
  text?: string
  resetKey?: string
}

/** Hebrew translation hidden until the user taps to reveal. */
export function RevealTranslation({ text, resetKey }: RevealTranslationProps) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setRevealed(false)
  }, [resetKey, text])

  if (!text) return null

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="mt-2 flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors self-start focus-visible:ring-2 focus-visible:ring-indigo-400"
        dir="rtl"
      >
        <Eye size={15} aria-hidden />
        <span className="font-medium">הצג תרגום</span>
        <span
          className="text-slate-300 dark:text-slate-600 tracking-widest select-none blur-[3px]"
          aria-hidden
        >
          ████████
        </span>
      </button>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-1 items-start" dir="rtl">
      <button
        type="button"
        onClick={() => setRevealed(false)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors min-h-[32px] px-1"
      >
        <EyeOff size={13} aria-hidden />
        הסתר תרגום
      </button>
      <p className="text-sm text-slate-400 italic text-right leading-relaxed w-full">
        <GrammarSentence text={text} />
      </p>
    </div>
  )
}
