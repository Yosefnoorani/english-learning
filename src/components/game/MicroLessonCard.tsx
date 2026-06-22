import { SpeakButton } from '@/components/ui/SpeakButton'
import type { LessonTip } from '@/content/lessonTips'

interface MicroLessonCardProps {
  tip: LessonTip
  onDismiss: () => void
}

export function MicroLessonCard({ tip, onDismiss }: MicroLessonCardProps) {
  return (
    <div className="mx-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 p-5 shadow-lg flex flex-col gap-3">
      <p className="text-xs font-semibold text-violet-200 uppercase tracking-wide">Quick lesson · {tip.title}</p>
      <p className="text-[15px] text-white leading-relaxed text-right" dir="rtl">
        {tip.rule_he}
      </p>
      <div className="flex items-center justify-between gap-2 bg-white/15 rounded-xl px-3 py-2">
        <p className="text-sm text-white font-medium italic" dir="ltr">{tip.example_en}</p>
        <SpeakButton text={tip.example_en} size={16} />
      </div>
      <button
        onClick={onDismiss}
        className="w-full min-h-[44px] rounded-xl bg-white text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-colors"
      >
        Got it — start practising
      </button>
    </div>
  )
}
