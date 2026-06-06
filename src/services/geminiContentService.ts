import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ContentItem, QuestionType, SkillId } from '@/types/game'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL = 'gemini-2.0-flash'

export type GeneratableType = 'vocabulary' | 'sentence_builder' | 'translation_he_en'

export interface GenerateContentOptions {
  count?: number
  types?: GeneratableType[]
  /** User's current difficulty rating */
  rating: number
  /** Generate content one tier above current level */
  advancedTier?: number
  existingIds: string[]
}

function getClient(): GoogleGenerativeAI {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Add it to .env.local')
  }
  return new GoogleGenerativeAI(API_KEY)
}

function buildPrompt(opts: GenerateContentOptions): string {
  const count = opts.count ?? 5
  const types = opts.types ?? ['vocabulary', 'sentence_builder', 'translation_he_en']
  // Always target one tier above the user's current level
  const tier = opts.advancedTier ?? Math.min(10, Math.floor((opts.rating - 350) / 50) + 2)
  const targetRating = 350 + (tier - 1) * 50
  const band = `${targetRating}–${targetRating + 49}`

  return `You are an English teacher for Hebrew speakers. Generate exactly ${count} learning items as a JSON array.
IMPORTANT: Content must be SLIGHTLY MORE ADVANCED than the learner's current level (difficulty ${band}).
Use richer vocabulary and slightly more complex sentence structures while staying clear for Hebrew speakers.

Each item must match this TypeScript shape:
{
  "id": "gen-{unique}",
  "type": "${types.join('|')}",
  "difficulty": number (${band}),
  "skill": SkillId string,
  "tags": string[],
  "data": {
    "word"?: string,
    "translation"?: string,
    "context_sentence": string (English),
    "context_translation": string (Hebrew),
    "correct_answer": string,
    "word_chips"?: string[] (for sentence_builder — scrambled words),
    "grammar_hint"?: string,
    "common_mistake"?: string,
    "alternate_answers"?: string[]
  }
}

Rules:
- Mix types: ${types.join(', ')}
- vocabulary: include word, translation, context_sentence, context_translation, correct_answer (= word)
- sentence_builder: correct_answer is full sentence; word_chips are shuffled tokens of that sentence
- translation_he_en: context_sentence in Hebrew, correct_answer in English
- Use varied skills from: vocabulary_emotions, vocabulary_business, vocabulary_travel, past_simple, present_perfect, sentence_structure
- IDs must be unique, format gen-${Date.now()}-N
- Return ONLY valid JSON array, no markdown fences`
}

function isValidItem(raw: unknown): raw is ContentItem {
  if (!raw || typeof raw !== 'object') return false
  const item = raw as ContentItem
  return (
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.difficulty === 'number' &&
    typeof item.skill === 'string' &&
    Array.isArray(item.tags) &&
    item.data !== null &&
    typeof item.data === 'object' &&
    typeof item.data.context_sentence === 'string' &&
    typeof item.data.context_translation === 'string' &&
    typeof item.data.correct_answer === 'string'
  )
}

function normalizeItem(raw: ContentItem, index: number): ContentItem {
  const id = raw.id?.startsWith('gen-') ? raw.id : `gen-${Date.now()}-${index}`
  return {
    ...raw,
    id,
    type: raw.type as QuestionType,
    skill: raw.skill as SkillId,
    tags: raw.tags ?? ['generated'],
  }
}

export async function generateContentBatch(opts: GenerateContentOptions): Promise<ContentItem[]> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL })
  const result = await model.generateContent(buildPrompt(opts))
  const text = result.response.text().trim()

  let parsed: unknown
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Gemini returned invalid JSON. Try again.')
  }

  if (!Array.isArray(parsed)) throw new Error('Expected JSON array from Gemini')

  const existing = new Set(opts.existingIds)
  const items = (parsed as unknown[])
    .filter(isValidItem)
    .map((item, i) => normalizeItem(item, i))
    .filter((item) => !existing.has(item.id))

  if (items.length === 0) throw new Error('No valid items generated. Try again.')
  return items
}

export function isGeminiConfigured(): boolean {
  return Boolean(API_KEY)
}
