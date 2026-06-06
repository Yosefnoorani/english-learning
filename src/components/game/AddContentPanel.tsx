import { useState } from 'react'
import { X, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import type { ContentItem } from '@/types/game'
import { generateContentBatch, isGeminiConfigured } from '@/services/geminiContentService'
import { addUserContent, getAllContent } from '@/services/contentService'
import { useGameStore } from '@/store/useGameStore'

interface AddContentPanelProps {
  onClose: () => void
  onAdded?: () => void
}

export function AddContentPanel({ onClose, onAdded }: AddContentPanelProps) {
  const rating = useGameStore((s) => s.userState.rating)
  const currentTier = useGameStore((s) => s.currentTier)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ContentItem[] | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleGenerate() {
    if (!isGeminiConfigured()) {
      setError('הוסף VITE_GEMINI_API_KEY לקובץ .env.local')
      return
    }
    setLoading(true)
    setError(null)
    setPreview(null)
    setSaved(false)
    try {
      const items = await generateContentBatch({
        count: 5,
        rating,
        advancedTier: Math.min(10, currentTier + 1),
        existingIds: getAllContent().map((i) => i.id),
      })
      setPreview(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת תוכן')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!preview?.length) return
    addUserContent(preview)
    setSaved(true)
    onAdded?.()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="הוסף תוכן חדש"
        className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-violet-500" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">הוסף מילים ומשפטים</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {!preview && !saved && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gemini ייצור 5 פריטים חדשים (מילים, משפטים, תרגומים) ברמה מתקדמת יותר מהרמה הנוכחית שלך (Tier {currentTier + 1}).
            </p>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 p-4 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={20} />
              <span className="text-sm font-semibold">נוספו {preview?.length ?? 0} פריטים בהצלחה!</span>
            </div>
          )}

          {preview && !saved && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-400 uppercase">תצוגה מקדימה</p>
              {preview.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-1"
                >
                  <span className="text-[10px] font-bold text-indigo-500 uppercase">{item.type}</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {item.data.word ?? item.data.correct_answer}
                  </p>
                  {item.data.translation && (
                    <p className="text-xs text-slate-500">{item.data.translation}</p>
                  )}
                  <p className="text-xs text-slate-400 italic truncate">{item.data.context_sentence}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          {!preview && !saved && (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'Gemini מייצר...' : 'צור תוכן חדש'}
            </button>
          )}
          {preview && !saved && (
            <>
              <button
                onClick={() => setPreview(null)}
                className="flex-1 min-h-[48px] rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
              >
                אישור והוספה
              </button>
            </>
          )}
          {saved && (
            <button
              onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl bg-indigo-600 text-white font-bold text-sm"
            >
              סגור
            </button>
          )}
        </div>
      </div>
    </>
  )
}
