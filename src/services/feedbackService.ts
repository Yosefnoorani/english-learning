import type { ContentItem, MistakeExplanation, QuestionType, SkillId } from '@/types/game'
import { SKILL_LABELS } from '@/types/game'
import type { ErrorMark, GradingResult } from '@/services/gradingService'
import { gradeAnswer } from '@/services/gradingService'

export type MistakeTypeId =
  | 'wrong_choice'
  | 'wrong_word'
  | 'missing_word'
  | 'extra_word'
  | 'word_order'
  | 'spelling'
  | 'empty_answer'
  | 'partial_translation'
  | 'dictation_gap'
  | 'wrong_conjugation'
  | 'reading_misread'
  | 'vocabulary_confusion'

interface FeedbackTemplate {
  shortExplanation_he: string
  rule_he: string
  example_en: string
}

interface SkillFeedbackSnippet {
  rule_he: string
  example_en: string
}

interface ResolvedFeedback {
  shortExplanation_he: string
  sentenceWhy_he: string
  rule_he: string
  example_en: string
}

function buildErrorSummaryHe(errors: ErrorMark[]): string {
  const wrong = errors
    .filter((e) => e.type === 'wrong')
    .map((e) => `"${e.got}" במקום "${e.expected}"`)
    .join(', ')
  const missing = errors
    .filter((e) => e.type === 'missing')
    .map((e) => `"${e.expected}"`)
    .join(', ')
  const extra = errors
    .filter((e) => e.type === 'extra')
    .map((e) => `"${e.got}"`)
    .join(', ')

  const parts: string[] = []
  if (wrong) parts.push(`מילים שגויות: ${wrong}`)
  if (missing) parts.push(`חסר: ${missing}`)
  if (extra) parts.push(`מיותר: ${extra}`)
  return parts.join(' · ')
}

function buildSentenceWhy(item: ContentItem, errors: ErrorMark[]): string {
  const hint = item.data.grammar_hint ?? item.data.common_mistake
  const errorSummary = buildErrorSummaryHe(errors)

  if (hint && errorSummary) return `${errorSummary}. ${hint}`
  if (hint) return hint
  if (errorSummary) return errorSummary
  return ''
}

interface FeedbackFile {
  version: number
  mistakeTypes: Record<MistakeTypeId, FeedbackTemplate>
  byQuestionType: Record<QuestionType, MistakeTypeId>
  bySkill: Partial<Record<SkillId, SkillFeedbackSnippet>>
}

let feedbackData: FeedbackFile | null = null

export async function loadFeedback(): Promise<void> {
  if (feedbackData) return
  const res = await fetch('/feedback.json')
  if (!res.ok) throw new Error(`Failed to load feedback.json: ${res.status}`)
  feedbackData = (await res.json()) as FeedbackFile
}

export function isFeedbackLoaded(): boolean {
  return feedbackData !== null
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`)
}

function isEmptyAnswer(userAnswer: string): boolean {
  const t = userAnswer.trim()
  return !t || t === '__skip__' || t === '__wrong__'
}

/** Classify which mistake template best fits this wrong answer */
export function classifyMistake(
  item: ContentItem,
  userAnswer: string,
  grading: GradingResult,
): MistakeTypeId {
  if (!feedbackData) return 'wrong_choice'

  if (isEmptyAnswer(userAnswer)) return 'empty_answer'

  const typeDefault = feedbackData.byQuestionType[item.type] ?? 'wrong_choice'

  if (item.type === 'verb_conjugation' && grading.similarity >= 0.5 && grading.similarity < 0.85) {
    return 'spelling'
  }

  if (item.type === 'word_spelling') {
    if (grading.similarity >= 0.5 && grading.similarity < 0.9) return 'spelling'
    return typeDefault
  }

  if (
    item.type === 'vocabulary' ||
    item.type === 'grammar_choice' ||
    item.type === 'placement_test' ||
    item.type === 'reading_comprehension'
  ) {
    return typeDefault
  }

  const errors = grading.errors
  if (errors.length === 0) return typeDefault

  const missing = errors.filter((e) => e.type === 'missing').length
  const extra = errors.filter((e) => e.type === 'extra').length
  const wrong = errors.filter((e) => e.type === 'wrong').length

  if (missing > 0 && extra === 0 && wrong === 0) return 'missing_word'
  if (extra > 0 && missing === 0 && wrong === 0) return 'extra_word'
  if (wrong > 0 && missing === 0 && extra === 0) return 'wrong_word'
  if (wrong > 0 || missing > 0) {
    if (item.type === 'sentence_builder') return 'word_order'
    if (item.type === 'translation_he_en') return 'partial_translation'
    if (item.type === 'listening_dictation') return 'dictation_gap'
    return 'wrong_word'
  }

  return typeDefault
}

function buildItemSpecificExplanation(
  item: ContentItem,
  userAnswer: string,
  errors: ErrorMark[],
): ResolvedFeedback | null {
  const hint = item.data.grammar_hint ?? item.data.common_mistake
  const sentenceWhy = buildSentenceWhy(item, errors)
  if (!hint && !sentenceWhy) return null

  return {
    shortExplanation_he: userAnswer.trim()
      ? 'השווה בין מה שכתבת לבין התשובה הנכונה למטה.'
      : 'לא הזנת תשובה — עיין בתשובה הנכונה למטה.',
    sentenceWhy_he: sentenceWhy,
    rule_he: hint ?? sentenceWhy,
    example_en: item.data.context_sentence,
  }
}

function buildFromTemplate(
  mistakeType: MistakeTypeId,
  item: ContentItem,
  userAnswer: string,
  errors: ErrorMark[],
): ResolvedFeedback {
  const template = feedbackData!.mistakeTypes[mistakeType]
  const skillSnippet = feedbackData!.bySkill[item.skill]
  const skillLabel = SKILL_LABELS[item.skill] ?? item.skill

  const wrongDetail = errors
    .filter((e) => e.type === 'wrong')
    .map((e) => `"${e.got}" → "${e.expected}"`)
    .join(', ')
  const missingDetail = errors
    .filter((e) => e.type === 'missing')
    .map((e) => e.expected)
    .join(', ')

  const vars: Record<string, string> = {
    correct: item.data.correct_answer,
    user: userAnswer || '(ריק)',
    skill: skillLabel,
    word: item.data.word ?? item.data.correct_answer,
    context: item.data.context_sentence,
    wrongDetail,
    missingDetail,
  }

  const shortExplanation = interpolate(template.shortExplanation_he, vars)
  const sentenceWhy = buildSentenceWhy(item, errors) || shortExplanation

  const rule = skillSnippet?.rule_he
    ? `${interpolate(template.rule_he, vars)} ${skillSnippet.rule_he}`
    : interpolate(template.rule_he, vars)

  const example = skillSnippet?.example_en ?? template.example_en

  return {
    shortExplanation_he: shortExplanation,
    sentenceWhy_he: sentenceWhy,
    rule_he: rule,
    example_en: example,
  }
}

/** Resolve static feedback — item fields first, then feedback.json templates */
export function resolveMistakeFeedback(
  item: ContentItem,
  userAnswer: string,
  grading?: GradingResult,
): ResolvedFeedback {
  const gradingResult = grading ?? gradeAnswer(item, userAnswer)

  const itemSpecific = buildItemSpecificExplanation(item, userAnswer, gradingResult.errors)
  if (itemSpecific && (item.data.grammar_hint || item.data.common_mistake)) {
    const skillSnippet = feedbackData?.bySkill[item.skill]
    if (skillSnippet) {
      return {
        ...itemSpecific,
        rule_he: `${itemSpecific.rule_he} ${skillSnippet.rule_he}`,
        example_en: skillSnippet.example_en,
      }
    }
    return itemSpecific
  }

  if (!feedbackData) {
    const sentenceWhy =
      buildSentenceWhy(item, gradingResult.errors) ||
      `התשובה הנכונה היא "${item.data.correct_answer}".`
    return {
      shortExplanation_he: 'השווה בין מה שכתבת לבין התשובה הנכונה.',
      sentenceWhy_he: sentenceWhy,
      rule_he: `שים לב לכללי ${SKILL_LABELS[item.skill] ?? item.skill}.`,
      example_en: item.data.context_sentence,
    }
  }

  const mistakeType = classifyMistake(item, userAnswer, gradingResult)
  return buildFromTemplate(mistakeType, item, userAnswer, gradingResult.errors)
}

/** Alias matching MistakeExplanation for UI */
export function getMistakeFeedback(
  item: ContentItem,
  userAnswer: string,
  grading?: GradingResult,
): MistakeExplanation {
  const fb = resolveMistakeFeedback(item, userAnswer, grading)
  return {
    shortExplanation: fb.shortExplanation_he,
    sentenceWhy: fb.sentenceWhy_he,
    rule: fb.rule_he,
    example: fb.example_en,
  }
}
