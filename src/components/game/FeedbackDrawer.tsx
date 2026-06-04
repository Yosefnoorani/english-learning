import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react'
import type { AnswerResult } from '@/types/game'
import { SKILL_LABELS } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { buildDiffTokens, type DiffToken } from '@/services/gradingService'
import { useGameStore } from '@/store/useGameStore'
import { playCorrect, playWrong, vibrateCorrect, vibrateWrong } from '@/services/soundService'

interface FeedbackDrawerProps {
  result: AnswerResult
  onNext: () => void
}

const OPEN_ANSWER_TYPES = new Set(['sentence_builder', 'translation_he_en', 'listening_dictation'])

function DiffDisplay({ tokens }: { tokens: DiffToken[] }) {
  if (tokens.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {tokens.map((tok, i) => {
        let cls = 'inline-block px-1.5 py-0.5 rounded text-sm font-medium '
        if (tok.kind === 'correct') cls += 'text-slate-700 dark:text-slate-200'
        else if (tok.kind === 'wrong') cls += 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 line-through decoration-rose-400'
        else if (tok.kind === 'extra') cls += 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
        else if (tok.kind === 'missing') cls += 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
        return (
          <span key={i} className={cls}>
            {tok.kind === 'missing' ? `[${tok.text}]` : tok.text}
          </span>
        )
      })}
    </div>
  )
}

export function FeedbackDrawer({ result, onNext }: FeedbackDrawerProps) {
  const { isCorrect, correctAnswer, item } = result
  const sounds = useGameStore((s) => s.sounds)
  const haptics = useGameStore((s) => s.haptics)
  const speakText = `${correctAnswer}. ${item.data.context_sentence}`
  const skillLabel = SKILL_LABELS[item.skill] ?? item.skill

  const userAnswer = (result as AnswerResult & { userAnswer?: string }).userAnswer ?? ''
  const showDiff = !isCorrect && OPEN_ANSWER_TYPES.has(item.type) && userAnswer && userAnswer !== '__skip__'
  const diffTokens = showDiff ? buildDiffTokens(item, userAnswer) : []

  // Sound + haptic on mount
  useEffect(() => {
    if (sounds) {
      if (isCorrect) playCorrect()
      else playWrong()
    }
    if (haptics) {
      if (isCorrect) vibrateCorrect()
      else vibrateWrong()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard: Enter advances, Esc dismisses
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNext])

  // Swipe-to-dismiss on the handle bar
  const handleRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)
  const [swipeOffset, setSwipeOffset] = useState(0)

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setSwipeOffset(delta)
  }

  function onTouchEnd() {
    if (swipeOffset > 80) {
      onNext()
    }
    setSwipeOffset(0)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30 md:hidden"
        onClick={onNext}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-live="polite"
        aria-label={isCorrect ? 'Correct answer' : 'Incorrect answer'}
        className={`
          fixed z-40 slide-up
          bottom-0 left-0 right-0
          md:bottom-auto md:top-0 md:right-0 md:left-auto md:h-full md:w-[22rem]
          ${isCorrect
            ? 'bg-emerald-50 dark:bg-emerald-950/60'
            : 'bg-white dark:bg-slate-900'
          }
          rounded-t-3xl md:rounded-none md:rounded-l-3xl shadow-2xl
        `}
        style={{ transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined, transition: swipeOffset > 0 ? 'none' : undefined }}
      >
        <div className="flex flex-col h-full max-h-[85svh] md:max-h-full p-6 gap-5 overflow-y-auto">
          {/* Handle bar — swipe target */}
          <div
            ref={handleRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto md:hidden cursor-grab"
            aria-hidden="true"
          />

          {/* Status header */}
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <CheckCircle2 size={28} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle size={28} className="text-rose-500 flex-shrink-0" />
            )}
            <div>
              <p className={`text-lg font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {isCorrect ? 'Correct!' : 'Not quite…'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isCorrect ? 'Great work, keep it up!' : "Here's what you need to know:"}
              </p>
            </div>
          </div>

          {/* Skill badge */}
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3 py-2">
            <BookOpen size={14} className="text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-indigo-600 dark:text-indigo-300 font-semibold">
              Skill: <span className="font-bold">{skillLabel}</span>
            </span>
          </div>

          {/* Word diff */}
          {!isCorrect && showDiff && diffTokens.length > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">What you wrote</p>
              <DiffDisplay tokens={diffTokens} />
              <div className="mt-2 flex gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-rose-100 dark:bg-rose-900/40" /> wrong/extra
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/40" /> missing
                </span>
              </div>
            </div>
          )}

          {/* Correct answer */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Correct answer</span>
              <SpeakButton text={speakText} size={16} />
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug">{correctAnswer}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
              "{item.data.context_sentence}"
            </p>
            <p className="text-xs text-slate-400">{item.data.context_translation}</p>
          </div>

          {/* Alternate answers */}
          {!isCorrect && item.data.alternate_answers && item.data.alternate_answers.length > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Also accepted</p>
              {item.data.alternate_answers.map((alt) => (
                <p key={alt} className="text-sm text-slate-600 dark:text-slate-300 italic">"{alt}"</p>
              ))}
            </div>
          )}

          {/* Grammar tip */}
          {!isCorrect && item.data.grammar_hint && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Grammar tip</p>
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{item.data.grammar_hint}</p>
            </div>
          )}

          {/* Common mistake */}
          {!isCorrect && item.data.common_mistake && !item.data.grammar_hint && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Common mistake</p>
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{item.data.common_mistake}</p>
            </div>
          )}

          {/* Translation */}
          {item.data.translation && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Translation</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.data.translation}</p>
            </div>
          )}

          <div className="flex-1 hidden md:block" />

          {/* CTA */}
          <button
            onClick={onNext}
            autoFocus
            className={`w-full min-h-[56px] rounded-xl font-bold text-base transition-all shadow-md active:scale-[0.98] ${
              isCorrect
                ? 'bg-emerald-500 text-white active:bg-emerald-600 hover:bg-emerald-600'
                : 'bg-indigo-600 text-white active:bg-indigo-700 hover:bg-indigo-700'
            }`}
          >
            Got it, next!
            <span className="ml-2 text-xs opacity-60 hidden md:inline">(Enter)</span>
          </button>
        </div>
      </div>
    </>
  )
}
