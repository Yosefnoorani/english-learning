import { X, RotateCcw, Clock } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { SKILL_LABELS } from '@/types/game'
import type { SkillId } from '@/types/game'
import { getContentById } from '@/services/contentService'

interface MistakeJournalProps {
  onClose: () => void
  onPractise: () => void
}

function formatDue(nextDueAt: number): string {
  const diff = nextDueAt - Date.now()
  if (diff <= 0) return 'Due now'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `Due in ${hours}h`
  const days = Math.floor(hours / 24)
  return `Due in ${days}d`
}

export function MistakeJournal({ onClose, onPractise }: MistakeJournalProps) {
  const mistakeQueue = useGameStore((s) => s.mistakeQueue)
  const toggleMistakeReview = useGameStore((s) => s.toggleMistakeReview)

  const entries = [...mistakeQueue]
    .filter((e) => !e.mastered)
    .sort((a, b) => a.nextDueAt - b.nextDueAt)
  const dueNow = entries.filter((e) => e.nextDueAt <= Date.now())

  async function handleStartReview() {
    onClose()
    await toggleMistakeReview()
    onPractise()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col slide-in-left">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Mistake Journal</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {entries.length} item{entries.length !== 1 ? 's' : ''} in queue
              {dueNow.length > 0 && ` · ${dueNow.length} due now`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        {dueNow.length > 0 && (
          <div className="px-5 pt-4">
            <button
              onClick={handleStartReview}
              className="w-full min-h-[48px] rounded-xl bg-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:bg-rose-700"
            >
              <RotateCcw size={16} />
              Practise {dueNow.length} due item{dueNow.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-slate-500 text-sm font-semibold">No mistakes yet!</p>
              <p className="text-slate-300 text-xs mt-1">Items you get wrong will appear here for review.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {entries.map((entry) => {
                const item = getContentById(entry.contentId)
                const isDue = entry.nextDueAt <= Date.now()
                return (
                  <div
                    key={entry.contentId}
                    className={`rounded-xl border p-4 flex flex-col gap-2 ${
                      isDue ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 leading-snug">
                          {item?.data.word ?? item?.data.context_sentence ?? entry.contentId}
                        </p>
                        {item && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {SKILL_LABELS[item.skill as SkillId]} · {item.type.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${isDue ? 'text-rose-600' : 'text-slate-400'}`}>
                        <Clock size={12} />
                        {formatDue(entry.nextDueAt)}
                      </div>
                    </div>

                    {item?.data.context_sentence && (
                      <p className="text-xs text-slate-500 italic">"{item.data.context_sentence}"</p>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        entry.failCount >= 3
                          ? 'bg-rose-100 text-rose-700'
                          : entry.failCount === 2
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        Failed {entry.failCount}×
                      </span>
                      {item?.data.correct_answer && (
                        <span className="text-xs text-slate-400">
                          Answer: <strong className="text-slate-600">{item.data.correct_answer}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
