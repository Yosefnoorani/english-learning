import { useState, useEffect, useMemo } from 'react'
import { Link2 } from 'lucide-react'
import type { ContentItem } from '@/types/game'

interface MatchingPairsViewProps {
  item: ContentItem
  onAnswer: (answer: string) => void
  showHint?: boolean
}

type Pair = { en: string; he: string }

export function MatchingPairsView({ item, onAnswer, showHint }: MatchingPairsViewProps) {
  const pairs = item.data.match_pairs ?? []
  const [selectedEn, setSelectedEn] = useState<string | null>(null)
  const [matchedEn, setMatchedEn] = useState<Set<string>>(new Set())
  const [userPairs, setUserPairs] = useState<Pair[]>([])
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const enList = pairs.map((p) => p.en)
  const heList = useMemo(
    () => [...pairs.map((p) => p.he)].sort(() => Math.random() - 0.5),
    [item.id],
  )

  useEffect(() => {
    setSelectedEn(null)
    setMatchedEn(new Set())
    setUserPairs([])
    setWrongFlash(null)
    setSubmitted(false)
  }, [item.id])

  function handleEnTap(en: string) {
    if (submitted || matchedEn.has(en)) return
    setSelectedEn(en)
    setWrongFlash(null)
  }

  function handleHeTap(he: string) {
    if (submitted || !selectedEn) return

    const correctHe = pairs.find((p) => p.en === selectedEn)?.he
    if (correctHe === he) {
      setMatchedEn((prev) => new Set([...prev, selectedEn]))
      setUserPairs((prev) => [...prev, { en: selectedEn, he }])
      setSelectedEn(null)

      if (matchedEn.size + 1 === pairs.length) {
        setSubmitted(true)
        onAnswer(JSON.stringify([...userPairs, { en: selectedEn, he }]))
      }
    } else {
      setWrongFlash(he)
      setTimeout(() => setWrongFlash(null), 600)
      setSelectedEn(null)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
        <div className="mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
            <Link2 size={14} />
            Match English ↔ Hebrew
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Tap an English word, then tap its Hebrew translation.
        </p>

        {showHint && item.data.common_mistake && (
          <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Tip</p>
            <p className="text-sm text-amber-700 dark:text-amber-200 leading-relaxed">{item.data.common_mistake}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">English</p>
            {enList.map((en) => {
              const isMatched = matchedEn.has(en)
              const isSelected = selectedEn === en
              return (
                <button
                  key={en}
                  type="button"
                  disabled={submitted || isMatched}
                  onClick={() => handleEnTap(en)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all focus-visible:ring-2 focus-visible:ring-teal-400 ${
                    isMatched
                      ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 opacity-60'
                      : isSelected
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-200 ring-2 ring-teal-200 dark:ring-teal-800'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-teal-300 dark:hover:border-teal-600'
                  }`}
                >
                  {en}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide" dir="rtl">עברית</p>
            {heList.map((he) => {
              const isUsed = userPairs.some((p) => p.he === he)
              const isWrong = wrongFlash === he
              return (
                <button
                  key={he}
                  type="button"
                  disabled={submitted || isUsed || !selectedEn}
                  onClick={() => handleHeTap(he)}
                  dir="rtl"
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all focus-visible:ring-2 focus-visible:ring-teal-400 ${
                    isUsed
                      ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 opacity-60'
                      : isWrong
                        ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-600 animate-pulse'
                        : selectedEn
                          ? 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-teal-300 dark:hover:border-teal-600'
                          : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-400 cursor-default'
                  }`}
                >
                  {he}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center">
          {matchedEn.size}/{pairs.length} matched
          {submitted && ' · Checking…'}
        </p>
      </div>
    </div>
  )
}
