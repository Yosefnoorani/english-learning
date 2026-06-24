/**
 * AI Grading Service — LLM-ready stub
 *
 * Set VITE_ENABLE_AI=true and provide VITE_OPENAI_API_KEY (or equivalent)
 * to enable real LLM grading. Until then, all functions return mock responses.
 *
 * Intended endpoints when activated:
 *  - gradeFreeWriting: open-ended writing feedback
 *  - explainMistake:   per-item natural-language explanation of an error
 */

const AI_ENABLED = import.meta.env.VITE_ENABLE_AI === 'true'
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_KEY) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        }),
      },
    )
    if (!res.ok) return null
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  } catch {
    return null
  }
}

// ── Public types ─────────────────────────────────────────────

export interface FreeWritingResult {
  score: number          // 0..10
  isAcceptable: boolean  // true if score >= 6
  feedback: string
  suggestedCorrection: string
}

export interface MistakeExplanation {
  shortExplanation: string
  sentenceWhy: string
  rule: string
  example: string
}

// ── Public API ───────────────────────────────────────────────

/**
 * Grade a free-writing answer (e.g. an open translation or essay sentence).
 * Compares against the expected answer and returns structured feedback.
 */
export async function gradeFreeWriting(
  expectedAnswer: string,
  userAnswer: string,
  skillContext: string,
): Promise<FreeWritingResult> {
  if (AI_ENABLED || GEMINI_KEY) {
    const prompt = `You are an English teacher helping a Hebrew speaker. Grade this translation.
Expected: "${expectedAnswer}"
Student wrote: "${userAnswer}"
Skill: ${skillContext}
Respond ONLY as JSON: {"score":0-10,"isAcceptable":bool,"feedback":"Hebrew explanation if meaning wrong or unnatural","suggestedCorrection":"..."}`
    const raw = await callGemini(prompt)
    if (raw) {
      try {
        const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as FreeWritingResult
        return json
      } catch { /* fall through */ }
    }
  }

  return mockFreeWritingResult(expectedAnswer, userAnswer)
}

/**
 * Generate a natural-language explanation of why an answer was wrong.
 */
export async function explainMistake(
  _itemId: string,
  correctAnswer: string,
  userAnswer: string,
  skillContext: string,
): Promise<MistakeExplanation> {
  if (!AI_ENABLED) {
    return mockMistakeExplanation(correctAnswer, userAnswer, skillContext)
  }

  // Real implementation when AI_ENABLED:
  // const response = await callLLM(...)
  // return JSON.parse(response)

  return mockMistakeExplanation(correctAnswer, userAnswer, skillContext)
}

// ── Mock implementations (used when AI_ENABLED=false) ────────

function mockFreeWritingResult(expected: string, got: string): FreeWritingResult {
  const norm = (s: string) => s.toLowerCase().trim().replace(/[.,!?;:]+$/g, '')
  const similarity = norm(expected) === norm(got) ? 10 : norm(got).length > 0 ? 5 : 0
  return {
    score: similarity,
    isAcceptable: similarity >= 6,
    feedback: similarity >= 8
      ? 'Great answer! Close to the model answer.'
      : 'Your answer differs from the expected response. Review the model answer.',
    suggestedCorrection: expected,
  }
}

function mockMistakeExplanation(
  correct: string,
  _got: string,
  skill: string,
): MistakeExplanation {
  return {
    shortExplanation: `The correct answer is "${correct}".`,
    sentenceWhy: `The correct answer is "${correct}".`,
    rule: `Review the rules for ${skill}.`,
    example: `Correct usage: "${correct}"`,
  }
}

const explanationCache = new Map<string, MistakeExplanation>()

function explanationCacheKey(contentId: string, userAnswer: string): string {
  return `${contentId}:${userAnswer.trim().toLowerCase().slice(0, 80)}`
}

/** Fetch AI explanation with in-memory cache keyed by content + answer. */
export async function getCachedOrFetchExplanation(
  contentId: string,
  correctAnswer: string,
  userAnswer: string,
  skillContext: string,
): Promise<MistakeExplanation> {
  const key = explanationCacheKey(contentId, userAnswer)
  const cached = explanationCache.get(key)
  if (cached) return cached

  const result = await explainMistake(contentId, correctAnswer, userAnswer, skillContext)
  explanationCache.set(key, result)
  return result
}

// ── Internal helper (placeholder) ───────────────────────────

// async function callLLM(prompt: string): Promise<string> {
//   const apiKey = import.meta.env.VITE_OPENAI_API_KEY
//   const response = await fetch('https://api.openai.com/v1/chat/completions', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
//     body: JSON.stringify({
//       model: 'gpt-4o-mini',
//       messages: [{ role: 'user', content: prompt }],
//       temperature: 0.3,
//     }),
//   })
//   const data = await response.json()
//   return data.choices[0].message.content
// }
