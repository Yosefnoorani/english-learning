import type { ContentItem, VocabReviewEntry } from '@/types/game'

/** Review intervals in ms: 1d, 3d, 7d, 30d */
const INTERVALS_MS = [
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
]

const ADVANCE_CONSECUTIVE = 2

export function isVocabItem(item: ContentItem): boolean {
  return item.type === 'vocabulary' || !!item.data.word
}

export function registerVocabSeen(
  queue: VocabReviewEntry[],
  contentId: string,
  now = Date.now(),
): VocabReviewEntry[] {
  const existing = queue.find((e) => e.contentId === contentId)
  if (existing) {
    return queue.map((e) =>
      e.contentId === contentId ? { ...e, lastSeenAt: now } : e,
    )
  }
  return [
    ...queue,
    {
      contentId,
      lastSeenAt: now,
      nextReviewAt: now + INTERVALS_MS[0],
      reviewStage: 0,
      consecutiveCorrect: 0,
    },
  ]
}

export function advanceVocabReview(
  queue: VocabReviewEntry[],
  contentId: string,
  now = Date.now(),
): VocabReviewEntry[] {
  return queue.map((e) => {
    if (e.contentId !== contentId) return e
    const consecutiveCorrect = (e.consecutiveCorrect ?? 0) + 1
    if (consecutiveCorrect < ADVANCE_CONSECUTIVE) {
      return { ...e, consecutiveCorrect, lastSeenAt: now }
    }
    const nextStage = Math.min(e.reviewStage + 1, INTERVALS_MS.length - 1)
    return {
      ...e,
      reviewStage: nextStage,
      consecutiveCorrect: 0,
      lastSeenAt: now,
      nextReviewAt: now + INTERVALS_MS[nextStage],
    }
  })
}

export function regressVocabReview(
  queue: VocabReviewEntry[],
  contentId: string,
  now = Date.now(),
): VocabReviewEntry[] {
  return queue.map((e) => {
    if (e.contentId !== contentId) return e
    const nextStage = Math.max(0, e.reviewStage - 1)
    return {
      ...e,
      reviewStage: nextStage,
      consecutiveCorrect: 0,
      lastSeenAt: now,
      nextReviewAt: now + INTERVALS_MS[nextStage],
    }
  })
}

export function getDueVocabReviews(
  queue: VocabReviewEntry[],
  allContent: ContentItem[],
  now = Date.now(),
  limit = 2,
): ContentItem[] {
  const dueIds = queue
    .filter((e) => e.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
    .slice(0, limit)
    .map((e) => e.contentId)

  const byId = new Map(allContent.map((c) => [c.id, c]))
  return dueIds.map((id) => byId.get(id)).filter(Boolean) as ContentItem[]
}
