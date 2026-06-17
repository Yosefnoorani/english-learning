import { useEffect, useRef, useState, useMemo } from 'react'
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react'
import type { AnswerResult } from '@/types/game'
import { SKILL_LABELS } from '@/types/game'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { buildAlignedDiff, buildTypedWordDiff, type DiffToken } from '@/services/gradingService'
import { useGameStore } from '@/store/useGameStore'
import { playCorrect, playWrong, vibrateCorrect, vibrateWrong } from '@/services/soundService'
import { getMistakeFeedback } from '@/services/feedbackService'
import { BidiMixedText } from '@/utils/bidiText'

interface FeedbackDrawerProps {
  result: AnswerResult
  onNext: () => void
}

const OPEN_ANSWER_TYPES = new Set(['sentence_builder', 'translation_he_en', 'listening_dictation'])
const TYPED_ANSWER_TYPES = new Set(['vocabulary', 'word_spelling', 'word_scramble', 'verb_conjugation'])
const CHOICE_ANSWER_TYPES = new Set(['grammar_choice', 'placement_test', ...TYPED_ANSWER_TYPES])
const KEYBOARD_DISMISS_DELAY_MS = 400

function UserDiffDisplay({ tokens }: { tokens: DiffToken[] }) {
  if (tokens.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1" dir="ltr">
      {tokens.map((tok, i) => {
        let cls = 'inline-block px-1.5 py-0.5 rounded text-sm font-medium '
        if (tok.kind === 'correct') cls += 'text-slate-500 dark:text-slate-400'
        else if (tok.kind === 'wrong') cls += 'bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 line-through decoration-rose-500'
        else if (tok.kind === 'extra') cls += 'bg-rose-200 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 underline decoration-rose-400 decoration-wavy'
        else if (tok.kind === 'missing') cls += 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-600'
        return (
          <span key={i} className={cls}>
            {tok.kind === 'missing' ? '___' : tok.text}
          </span>
        )
      })}
    </div>
  )
}

function CorrectDiffDisplay({ tokens }: { tokens: DiffToken[] }) {
  if (tokens.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1" dir="ltr">
      {tokens.map((tok, i) => {
        let cls = 'inline-block px-1.5 py-0.5 rounded text-sm font-medium '
        if (tok.kind === 'correct') cls += 'text-slate-600 dark:text-slate-300'
        else cls += 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-bold ring-1 ring-emerald-400/50'
        return (
          <span key={i} className={cls}>
            {tok.text}
          </span>
        )
      })}
    </div>
  )
}

function AnswerComparison({
  userAnswer,
  correctAnswer,
  userTokens,
  correctTokens,
}: {
  userAnswer: string
  correctAnswer: string
  userTokens?: DiffToken[]
  correctTokens?: DiffToken[]
}) {
  const hasDiff = userTokens && correctTokens && userTokens.length > 0

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3">
        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1.5">כתבת:</p>
        {hasDiff ? (
          <UserDiffDisplay tokens={userTokens} />
        ) : (
          <p className="text-sm font-medium text-rose-800 dark:text-rose-200" dir="ltr">
            {userAnswer}
          </p>
        )}
      </div>
      <div className="flex justify-center text-slate-400 dark:text-slate-500" aria-hidden="true">
        <span className="text-lg">↓</span>
      </div>
      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3">
        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">התשובה הנכונה:</p>
        {hasDiff ? (
          <CorrectDiffDisplay tokens={correctTokens} />
        ) : (
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100" dir="ltr">
            {correctAnswer}
          </p>
        )}
      </div>
      {hasDiff && (
        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 dark:text-slate-400 justify-center" dir="rtl">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-rose-200 dark:bg-rose-900/60" />
            שגוי / מיותר
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-900/60 ring-1 ring-emerald-400/50" />
            התיקון הנדרש
          </span>
        </div>
      )}
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
  const explanation = (result as AnswerResult & { explanation?: string }).explanation
  const isTypedAnswer = TYPED_ANSWER_TYPES.has(item.type)
  const showSentenceDiff =
    !isCorrect && OPEN_ANSWER_TYPES.has(item.type) && userAnswer && userAnswer !== '__skip__'
  const showTypedDiff =
    !isCorrect && isTypedAnswer && userAnswer && userAnswer !== '__skip__'
  const showDiff = showSentenceDiff || showTypedDiff
  const alignedDiff = showTypedDiff
    ? buildTypedWordDiff(item, userAnswer)
    : showSentenceDiff
      ? buildAlignedDiff(item, userAnswer)
      : { userTokens: [], correctTokens: [] }
  const showAnswerComparison =
    !isCorrect &&
    userAnswer &&
    userAnswer !== '__skip__' &&
    (OPEN_ANSWER_TYPES.has(item.type) || CHOICE_ANSWER_TYPES.has(item.type))
  const showTypedComparison = showAnswerComparison && isTypedAnswer
  const showOpenComparison = showAnswerComparison && !isTypedAnswer
  const showNearMiss =
    isCorrect && explanation && explanation !== 'Correct!' && !explanation.startsWith('Well done')

  const staticFeedback = useMemo(() => {
    if (isCorrect) return null
    return getMistakeFeedback(item, userAnswer, {
      isCorrect: result.isCorrect,
      similarity: result.similarity ?? 0,
      errors: result.errorMarks ?? [],
      explanation: '',
    })
  }, [isCorrect, item, userAnswer, result])

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

  const openedAt = useRef(Date.now())
  useEffect(() => {
    openedAt.current = Date.now()
  }, [result])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (Date.now() - openedAt.current < KEYBOARD_DISMISS_DELAY_MS) return
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNext, result])

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
    if (swipeOffset > 80) onNext()
    setSwipeOffset(0)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onNext} aria-hidden="true" />

      <div
        role="dialog"
        aria-live="polite"
        aria-label={isCorrect ? 'Correct answer' : 'Incorrect answer'}
        className={`
          fixed z-50 slide-up
          bottom-0 left-0 right-0
          md:bottom-auto md:top-0 md:right-0 md:left-auto md:h-full md:w-[22rem]
          ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'bg-white dark:bg-slate-900'}
          rounded-t-3xl md:rounded-none md:rounded-l-3xl shadow-2xl
        `}
        style={{ transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined, transition: swipeOffset > 0 ? 'none' : undefined }}
      >
        <div className="flex flex-col h-full max-h-[85svh] md:max-h-full p-6 gap-5 overflow-y-auto">
          <div
            ref={handleRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto md:hidden cursor-grab"
            aria-hidden="true"
          />

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

          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3 py-2">
            <BookOpen size={14} className="text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-indigo-600 dark:text-indigo-300 font-semibold">
              Skill: <span className="font-bold">{skillLabel}</span>
            </span>
          </div>

          {showTypedComparison && (
            <AnswerComparison
              userAnswer={userAnswer}
              correctAnswer={correctAnswer}
              userTokens={showDiff ? alignedDiff.userTokens : undefined}
              correctTokens={showDiff ? alignedDiff.correctTokens : undefined}
            />
          )}

          {showNearMiss && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{explanation}</p>
            </div>
          )}

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

          {!isCorrect && staticFeedback && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide text-right" dir="rtl">
                למה טעית?
              </p>

              {showOpenComparison && (
                <AnswerComparison
                  userAnswer={userAnswer}
                  correctAnswer={correctAnswer}
                  userTokens={showDiff ? alignedDiff.userTokens : undefined}
                  correctTokens={showDiff ? alignedDiff.correctTokens : undefined}
                />
              )}

              {staticFeedback.sentenceWhy && (
                <div className="rounded-lg bg-white/70 dark:bg-slate-900/50 border border-violet-200 dark:border-violet-700 p-3" dir="rtl">
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-300 mb-1">למה כך נכון?</p>
                  <p className="text-sm text-violet-900 dark:text-violet-100 leading-relaxed text-right">
                    <BidiMixedText text={staticFeedback.sentenceWhy} />
                  </p>
                </div>
              )}

              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed text-right" dir="rtl">
                <BidiMixedText text={staticFeedback.rule} prefix={<strong>כלל: </strong>} />
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 italic" dir="ltr">
                {staticFeedback.example}
              </p>
            </div>
          )}

          {item.data.translation && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Translation</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.data.translation}</p>
            </div>
          )}

          <div className="flex-1 hidden md:block" />

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
          </button>
        </div>
      </div>
    </>
  )
}
