import type { ContentItem } from '@/types/game'
import { SKILL_LABELS } from '@/types/game'

// ── Public types ─────────────────────────────────────────────
export interface ErrorMark {
  position: number
  type: 'extra' | 'missing' | 'wrong' | 'order'
  expected?: string
  got?: string
}

export interface GradingResult {
  isCorrect: boolean
  /** 0..1 similarity score */
  similarity: number
  errors: ErrorMark[]
  /** Human-readable feedback sentence */
  explanation: string
}

// ── Helpers ──────────────────────────────────────────────────

/** Normalise a string for comparison: lowercase, collapse whitespace, strip punctuation */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, "'")         // smart quotes
    .replace(/["""]/g, '"')
    .replace(/[.,!?;:]+$/g, '')    // trailing punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenise(s: string): string[] {
  return normalise(s).split(' ').filter(Boolean)
}

/**
 * Word-level Levenshtein distance between two token arrays.
 * Returns the number of word edits (insert / delete / substitute).
 */
function wordEditDistance(a: string[], b: string[]): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/**
 * Character-level similarity — for short inputs (conjugation / dictation close calls).
 * Returns 0..1.
 */
function charSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const na = normalise(a)
  const nb = normalise(b)
  if (na === nb) return 1
  const longer = Math.max(na.length, nb.length)
  if (longer === 0) return 1
  const dist = charEditDistance(na, nb)
  return 1 - dist / longer
}

function charEditDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

/**
 * Build an array of ErrorMark objects by aligning user tokens to expected tokens.
 * Uses a basic diff based on the edit-distance back-trace.
 */
function buildErrorMarks(expected: string[], got: string[]): ErrorMark[] {
  const m = expected.length
  const n = got.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (expected[i - 1] === got[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  // Back-trace
  const marks: ErrorMark[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expected[i - 1] === got[j - 1]) {
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j] && dp[i][j - 1] <= dp[i - 1][j - 1])) {
      marks.push({ position: j - 1, type: 'extra', got: got[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i - 1][j] <= dp[i][j - 1] && dp[i - 1][j] <= dp[i - 1][j - 1])) {
      marks.push({ position: i - 1, type: 'missing', expected: expected[i - 1] })
      i--
    } else {
      marks.push({ position: i - 1, type: 'wrong', expected: expected[i - 1], got: got[j - 1] })
      i--
      j--
    }
  }
  return marks
}

// ── Main grading function ────────────────────────────────────

export function gradeAnswer(item: ContentItem, userInput: string): GradingResult {
  const type = item.type

  // Special pseudo-answers used by views
  if (userInput === '__skip__') {
    return {
      isCorrect: false,
      similarity: 0,
      errors: [],
      explanation: 'You skipped this question. Review the model answer below.',
    }
  }
  if (userInput === '__wrong__') {
    return {
      isCorrect: false,
      similarity: 0,
      errors: [],
      explanation: 'Marked as still learning.',
    }
  }
  if (userInput === '__correct__') {
    return {
      isCorrect: true,
      similarity: 1,
      errors: [],
      explanation: 'Well done on the reading passage!',
    }
  }

  const primaryAnswer = item.data.correct_answer
  const allAnswers = [primaryAnswer, ...(item.data.alternate_answers ?? [])]

  // ── Exact / near-exact match (vocab, grammar_choice, conjugation, spelling) ─
  if (
    type === 'vocabulary' ||
    type === 'grammar_choice' ||
    type === 'placement_test' ||
    type === 'verb_conjugation' ||
    type === 'word_spelling'
  ) {
    const normInput = normalise(userInput)
    const isExact = allAnswers.some((a) => normalise(a) === normInput)
    if (isExact) {
      return { isCorrect: true, similarity: 1, errors: [], explanation: 'Correct!' }
    }

    // Near-miss for conjugation (tolerate one char typo)
    if (type === 'verb_conjugation') {
      const bestSim = Math.max(...allAnswers.map((a) => charSimilarity(a, userInput)))
      if (bestSim >= 0.85) {
        return {
          isCorrect: true,
          similarity: bestSim,
          errors: [],
          explanation: `Almost perfect — minor typo accepted. The correct form is "${primaryAnswer}."`,
        }
      }
      return {
        isCorrect: false,
        similarity: bestSim,
        errors: [{ position: 0, type: 'wrong', expected: primaryAnswer, got: userInput }],
        explanation: buildConjugationExplanation(item, userInput),
      }
    }

    if (type === 'word_spelling') {
      const bestSim = Math.max(...allAnswers.map((a) => charSimilarity(a, userInput)))
      const threshold = primaryAnswer.length >= 10 ? 0.88 : 0.9
      if (bestSim >= threshold) {
        return {
          isCorrect: true,
          similarity: bestSim,
          errors: [],
          explanation: `Almost perfect — minor typo accepted. The correct spelling is "${primaryAnswer}".`,
        }
      }
      return {
        isCorrect: false,
        similarity: bestSim,
        errors: [{ position: 0, type: 'wrong', expected: primaryAnswer, got: userInput }],
        explanation: item.data.common_mistake ?? `The correct spelling is "${primaryAnswer}".`,
      }
    }

    return {
      isCorrect: false,
      similarity: charSimilarity(primaryAnswer, userInput),
      errors: [{ position: 0, type: 'wrong', expected: primaryAnswer, got: userInput }],
      explanation: buildSkillExplanation(item),
    }
  }

  // ── Open-answer types: sentence_builder, translation_he_en, listening_dictation ─
  // Check all acceptable answers
  const bestMatchIdx = allAnswers.reduce(
    (best, ans, idx) => {
      const dist = wordEditDistance(tokenise(ans), tokenise(userInput))
      return dist < best.dist ? { idx, dist } : best
    },
    { idx: 0, dist: Infinity },
  )

  const bestAnswer = allAnswers[bestMatchIdx.idx]
  const bestTokens = tokenise(bestAnswer)
  const userTokens = tokenise(userInput)

  const editDist = wordEditDistance(bestTokens, userTokens)
  const maxLen = Math.max(bestTokens.length, userTokens.length, 1)
  const similarity = 1 - editDist / maxLen

  // For dictation: char-level similarity is more appropriate for short sentences
  const charSim = charSimilarity(bestAnswer, userInput)
  const finalSim = type === 'listening_dictation' ? charSim : similarity

  // Thresholds
  const isCorrect = type === 'listening_dictation' ? charSim >= 0.88 : similarity >= 0.9

  if (isCorrect) {
    return {
      isCorrect: true,
      similarity: finalSim,
      errors: [],
      explanation: similarity < 1 ? `Accepted — close enough to the model answer.` : 'Correct!',
    }
  }

  // Build word-level errors against the best accepted answer
  const errors = buildErrorMarks(
    tokenise(allAnswers[0]), // always diff against primary for display
    userTokens,
  )

  return {
    isCorrect: false,
    similarity: finalSim,
    errors,
    explanation: buildOpenExplanation(item, errors),
  }
}

// ── Explanation builders ─────────────────────────────────────

function buildSkillExplanation(item: ContentItem): string {
  const skillLabel = SKILL_LABELS[item.skill] ?? item.skill
  const hint = item.data.grammar_hint ?? item.data.common_mistake
  if (hint) return hint
  return `This question practises ${skillLabel}. Study the correct answer carefully.`
}

function buildConjugationExplanation(item: ContentItem, got: string): string {
  const base = item.data.verb_base ?? 'the verb'
  const tense = item.data.target_tense ?? ''
  const person = item.data.target_person ?? ''
  const correct = item.data.correct_answer
  const hint = item.data.common_mistake
  if (hint) return hint
  return `"${base}" in ${tense} for "${person}" is "${correct}", not "${got}".`
}

function buildOpenExplanation(item: ContentItem, errors: ErrorMark[]): string {
  const skillLabel = SKILL_LABELS[item.skill] ?? item.skill
  const wrongWords = errors.filter((e) => e.type === 'wrong').map((e) => `"${e.got}" → "${e.expected}"`).join(', ')
  const missingWords = errors.filter((e) => e.type === 'missing').map((e) => `"${e.expected}"`).join(', ')
  const extraWords = errors.filter((e) => e.type === 'extra').map((e) => `"${e.got}"`).join(', ')

  const parts: string[] = []
  if (wrongWords) parts.push(`Wrong words: ${wrongWords}`)
  if (missingWords) parts.push(`Missing: ${missingWords}`)
  if (extraWords) parts.push(`Extra words: ${extraWords}`)

  const hint = item.data.common_mistake
  if (hint) parts.push(hint)

  if (parts.length > 0) return parts.join(' · ')
  return `Review the ${skillLabel} rules and try again.`
}

/** Render the user's answer with coloured diff tokens.
 *  Returns an array of { text, type } for inline rendering.
 */
export interface DiffToken {
  text: string
  kind: 'correct' | 'wrong' | 'extra' | 'missing'
}

export function buildDiffTokens(item: ContentItem, userInput: string): DiffToken[] {
  if (userInput === '__skip__' || userInput === '__wrong__' || userInput === '__correct__') return []

  const allAnswers = [item.data.correct_answer, ...(item.data.alternate_answers ?? [])]
  const bestAnswer = allAnswers.reduce((best, ans) => {
    const d = wordEditDistance(tokenise(ans), tokenise(userInput))
    return d < wordEditDistance(tokenise(best), tokenise(userInput)) ? ans : best
  }, allAnswers[0])

  const expectedTokens = tokenise(bestAnswer)
  const userTokens = tokenise(userInput)

  if (userTokens.length === 0) return expectedTokens.map((t) => ({ text: t, kind: 'missing' }))

  // Build dp table
  const m = expectedTokens.length
  const n = userTokens.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (expectedTokens[i - 1] === userTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  // Back-trace collecting aligned pairs
  const pairs: Array<{ expected: string | null; got: string | null }> = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expectedTokens[i - 1] === userTokens[j - 1]) {
      pairs.push({ expected: expectedTokens[i - 1], got: userTokens[j - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] < dp[i - 1][j] && dp[i][j - 1] < dp[i - 1][j - 1])) {
      pairs.push({ expected: null, got: userTokens[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i - 1][j] < dp[i][j - 1] && dp[i - 1][j] < dp[i - 1][j - 1])) {
      pairs.push({ expected: expectedTokens[i - 1], got: null })
      i--
    } else {
      pairs.push({ expected: expectedTokens[i - 1], got: userTokens[j - 1] })
      i--; j--
    }
  }
  pairs.reverse()

  return pairs.map(({ expected, got }) => {
    if (expected === null && got !== null) return { text: got, kind: 'extra' }
    if (got === null && expected !== null) return { text: expected, kind: 'missing' }
    if (expected === got) return { text: got!, kind: 'correct' }
    return { text: got!, kind: 'wrong' }
  })
}
