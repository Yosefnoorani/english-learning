import type { ContentItem, MistakeEntry } from '@/types/game'
import { getAllContent } from './contentService'
import { getDifficultyBand, getTierFromRating } from './adaptiveProgressionService'

export interface PracticePreview {
  words: ContentItem[]
  sentences: ContentItem[]
  totalAvailable: number
}

const RECENT_WINDOW = 40

function daySeed(): number {
  const today = new Date()
  return Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr]
  let s = seed
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function itemPriority(
  item: ContentItem,
  mistakeQueue: MistakeEntry[],
  recentIds: Set<string>,
  now: number,
): number {
  const entry = mistakeQueue.find((e) => e.contentId === item.id)
  if (entry && !entry.mastered && entry.nextDueAt <= now) return 0
  if (entry && !entry.mastered) return 1
  if (!recentIds.has(item.id)) return 2
  return 3
}

function selectByType(
  pool: ContentItem[],
  type: ContentItem['type'],
  limit: number,
  mistakeQueue: MistakeEntry[],
  recentIds: Set<string>,
  seed: number,
  now: number,
): ContentItem[] {
  const candidates = pool.filter((i) => i.type === type)
  const sorted = seededShuffle(candidates, seed)
    .sort((a, b) => itemPriority(a, mistakeQueue, recentIds, now) - itemPriority(b, mistakeQueue, recentIds, now))

  const picked: ContentItem[] = []
  const used = new Set<string>()
  for (const item of sorted) {
    if (picked.length >= limit) break
    if (used.has(item.id)) continue
    picked.push(item)
    used.add(item.id)
  }
  return picked
}

/** Words and sentences the learner should practise next — for home-screen preview. */
export function getPracticePreview(
  rating: number,
  mistakeQueue: MistakeEntry[],
  recentContentIds: string[] = [],
  wordLimit = 6,
  sentenceLimit = 4,
  now = Date.now(),
): PracticePreview {
  const tier = getTierFromRating(rating)
  const { min, max } = getDifficultyBand(tier)
  const all = getAllContent().filter((i) => i.type !== 'placement_test')
  const recentIds = new Set(recentContentIds.slice(-RECENT_WINDOW))

  let pool = all.filter((i) => i.difficulty >= min && i.difficulty <= max)
  if (pool.length < 20) {
    const margin = 75
    pool = all.filter((i) => i.difficulty >= min - margin && i.difficulty <= max + margin)
  }

  const seed = daySeed() + tier * 17

  const words = selectByType(pool, 'vocabulary', wordLimit, mistakeQueue, recentIds, seed, now)
  const sentences = selectByType(pool, 'sentence_builder', sentenceLimit, mistakeQueue, recentIds, seed + 1, now)

  const vocabCount = pool.filter((i) => i.type === 'vocabulary').length
  const sentenceCount = pool.filter((i) => i.type === 'sentence_builder').length

  return {
    words,
    sentences,
    totalAvailable: vocabCount + sentenceCount,
  }
}
