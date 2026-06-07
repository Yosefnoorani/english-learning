// ── App-level settings ──────────────────────────────────────
export type SessionMode = 'quick' | 'standard' | 'deep'
export type AppTheme = 'system' | 'light' | 'dark'

// ── Skill taxonomy ──────────────────────────────────────────
export type SkillId =
  | 'present_simple'
  | 'present_continuous'
  | 'past_simple'
  | 'past_continuous'
  | 'present_perfect'
  | 'past_perfect'
  | 'future_will'
  | 'future_going_to'
  | 'conditionals'
  | 'passive_voice'
  | 'articles'
  | 'prepositions'
  | 'modal_verbs'
  | 'phrasal_verbs'
  | 'reported_speech'
  | 'relative_clauses'
  | 'comparison'
  | 'vocabulary_emotions'
  | 'vocabulary_business'
  | 'vocabulary_travel'
  | 'vocabulary_technology'
  | 'vocabulary_environment'
  | 'vocabulary_academic'
  | 'vocabulary_idioms'
  | 'sentence_structure'

export const SKILL_LABELS: Record<SkillId, string> = {
  present_simple: 'Present Simple',
  present_continuous: 'Present Continuous',
  past_simple: 'Past Simple',
  past_continuous: 'Past Continuous',
  present_perfect: 'Present Perfect',
  past_perfect: 'Past Perfect',
  future_will: 'Future (will)',
  future_going_to: 'Future (going to)',
  conditionals: 'Conditionals',
  passive_voice: 'Passive Voice',
  articles: 'Articles (a/an/the)',
  prepositions: 'Prepositions',
  modal_verbs: 'Modal Verbs',
  phrasal_verbs: 'Phrasal Verbs',
  reported_speech: 'Reported Speech',
  relative_clauses: 'Relative Clauses',
  comparison: 'Comparatives & Superlatives',
  vocabulary_emotions: 'Vocabulary: Emotions',
  vocabulary_business: 'Vocabulary: Business',
  vocabulary_travel: 'Vocabulary: Travel',
  vocabulary_technology: 'Vocabulary: Technology',
  vocabulary_environment: 'Vocabulary: Environment',
  vocabulary_academic: 'Vocabulary: Academic',
  vocabulary_idioms: 'Vocabulary: Idioms',
  sentence_structure: 'Sentence Structure',
}

// ── Question types ──────────────────────────────────────────
export type QuestionType =
  | 'vocabulary'
  | 'grammar_choice'
  | 'sentence_builder'
  | 'placement_test'
  | 'translation_he_en'
  | 'listening_dictation'
  | 'verb_conjugation'
  | 'reading_comprehension'
  | 'word_spelling'

export type GamePhase = 'placement' | 'gameplay' | 'review'

export type NavView = 'practice' | 'skills' | 'journal' | 'resources'

export interface ResumeSnapshot {
  bufferIds: string[]
  currentIndex: number
  sessionAnswered: number
  sessionCorrect: number
  mistakeReviewMode: boolean
}

export interface MistakeExplanation {
  shortExplanation: string
  rule: string
  example: string
}

// ── Comprehension sub-question ──────────────────────────────
export interface ComprehensionQuestion {
  q: string
  options: string[]
  answer: string
}

// ── Content item data ───────────────────────────────────────
export interface ContentItemData {
  word?: string
  translation?: string
  context_sentence: string
  context_translation: string
  question_text?: string
  options?: string[]
  correct_answer: string
  /** Additional accepted answers (for translation / free-form questions) */
  alternate_answers?: string[]
  grammar_hint?: string
  /** Scrambled word chips for sentence_builder */
  word_chips?: string[]
  /** Reading passage (reading_comprehension) */
  passage?: string
  /** Questions about the passage */
  comprehension_questions?: ComprehensionQuestion[]
  /** Infinitive form of the verb (verb_conjugation) */
  verb_base?: string
  /** Target tense label shown to learner */
  target_tense?: string
  /** Target person label shown to learner, e.g. "she / he / it" */
  target_person?: string
  /** When true, DictationView hides the written text */
  audio_only?: boolean
  /** Common learner mistake for this item — shown in feedback */
  common_mistake?: string
}

// ── Content item ────────────────────────────────────────────
export interface ContentItem {
  id: string
  type: QuestionType
  difficulty: number
  /** Primary skill this item trains */
  skill: SkillId
  data: ContentItemData
  tags: string[]
}

// ── User state ──────────────────────────────────────────────
export interface UserState {
  rating: number
  streak: number
  score: number
  dailyGoalProgress: number
  dailyGoalTarget: number
  lastActiveDate: string   // toDateString() e.g. "Mon May 26 2025"
  streakFreezes: number    // 0–3 tokens
}

// ── Per-skill statistics (persisted) ────────────────────────
export interface SkillStats {
  correct: number
  wrong: number
  lastSeen: number
}

// ── Spaced-repetition mistake queue entry ───────────────────
export interface MistakeEntry {
  contentId: string
  failedAt: number
  nextDueAt: number
  failCount: number
  consecutiveCorrect: number
  mastered: boolean
  lastUserAnswer?: string
  inSessionRequeueAt?: number
  questionsUntilRequeue?: number
  cachedExplanation?: MistakeExplanation
}

// ── Telemetry ───────────────────────────────────────────────
export interface TelemetryEntry {
  contentId: string
  isCorrect: boolean
  failCount: number
  lastSeen: Date
  nextReviewDue: Date
}

// ── Answer result ───────────────────────────────────────────
export interface AnswerResult {
  isCorrect: boolean
  correctAnswer: string
  item: ContentItem
  /** Word-level diff (populated by gradingService) */
  errorMarks?: import('@/services/gradingService').ErrorMark[]
  /** Similarity 0..1 (populated by gradingService for open-answer types) */
  similarity?: number
}
