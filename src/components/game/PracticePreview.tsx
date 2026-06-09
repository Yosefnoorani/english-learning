import { BookOpen, MessageSquare } from 'lucide-react'
import { getPracticePreview } from '@/services/practicePreviewService'
import { useGameStore } from '@/store/useGameStore'
import { SKILL_LABELS } from '@/types/game'

export function PracticePreview() {
  const rating = useGameStore((s) => s.userState.rating)
  const mistakeQueue = useGameStore((s) => s.mistakeQueue)
  const recentContentIds = useGameStore((s) => s.recentContentIds)

  const preview = getPracticePreview(rating, mistakeQueue, recentContentIds)

  if (preview.words.length === 0 && preview.sentences.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Up next to practise</p>
        <span className="text-[10px] text-slate-400 font-medium">
          {preview.totalAvailable} items at your level
        </span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-4 shadow-sm">
        {preview.words.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <BookOpen size={14} />
              <span className="text-xs font-bold uppercase tracking-wide">Words</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {preview.words.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl px-3 py-2 min-w-[120px]"
                >
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {item.data.word}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {item.data.translation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {preview.sentences.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
              <MessageSquare size={14} />
              <span className="text-xs font-bold uppercase tracking-wide">Sentences</span>
            </div>
            <div className="flex flex-col gap-2">
              {preview.sentences.map((item) => (
                <div
                  key={item.id}
                  className="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 rounded-xl px-3 py-2.5"
                >
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">
                    {item.data.correct_answer}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {SKILL_LABELS[item.skill]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
