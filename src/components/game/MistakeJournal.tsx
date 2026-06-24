import { RotateCcw, Clock, Download } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { SKILL_LABELS } from '@/types/game'
import type { SkillId } from '@/types/game'
import { getContentById } from '@/services/contentService'
import { MobileSheet } from '@/components/layout/MobileSheet'

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
  const masteredCount = mistakeQueue.filter((e) => e.mastered).length

  async function handleStartReview() {
    onClose()
    await toggleMistakeReview()
    onPractise()
  }

  function exportJournal() {
    const rows = entries.map((e) => {
      const item = getContentById(e.contentId)
      const word = (item?.data.word ?? item?.data.correct_answer ?? '').replace(/"/g, '""')
      return `"${e.contentId}","${word}",${e.failCount}`
    })
    const csv = `id,word,failCount\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mistake-journal.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <MobileSheet title="Mistake Journal" onClose={onClose}>
      <div className="px-5 pb-6 flex flex-col gap-4">
        <p className="text-xs text-slate-400">
          {entries.length} active · {dueNow.length} due now
          {masteredCount > 0 && ` · ${masteredCount} mastered`}
        </p>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={exportJournal}
            className="w-full min-h-[44px] rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={16} />
            Export journal (CSV)
          </button>
        )}

        {dueNow.length > 0 && (
          <button
            type="button"
            onClick={handleStartReview}
            className="w-full min-h-[48px] rounded-xl bg-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:bg-rose-700"
          >
            <RotateCcw size={16} />
            Practise {dueNow.length} due item{dueNow.length !== 1 ? 's' : ''}
          </button>
        )}

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-slate-500 text-sm font-semibold">No mistakes yet!</p>
            <p className="text-slate-400 text-xs mt-1">Items you get wrong will appear here for review.</p>
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
                    isDue
                      ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                        {item?.data.word ?? item?.data.context_sentence ?? entry.contentId}
                      </p>
                      {item && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {SKILL_LABELS[item.skill as SkillId]} · {item.type.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${isDue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                      <Clock size={12} />
                      {formatDue(entry.nextDueAt)}
                    </div>
                  </div>

                  {item?.data.context_sentence && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">&ldquo;{item.data.context_sentence}&rdquo;</p>
                  )}

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      entry.failCount >= 3
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                        : entry.failCount === 2
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}>
                      Failed {entry.failCount}×
                    </span>
                    {entry.consecutiveCorrect > 0 && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {entry.consecutiveCorrect}/2 toward mastery
                      </span>
                    )}
                    {item?.data.correct_answer && (
                      <span className="text-xs text-slate-400">
                        Answer: <strong className="text-slate-600 dark:text-slate-300">{item.data.correct_answer}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MobileSheet>
  )
}
