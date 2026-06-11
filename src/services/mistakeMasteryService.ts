import type { ContentItem, MistakeEntry } from '@/types/game'

export const IN_SESSION_REQUEUE_GAP = 6
export const MASTERY_CONSECUTIVE_CORRECT = 2

const SRS_INTERVALS_MS = [
  4 * 60 * 60 * 1000,       // 4 hours
  1 * 24 * 60 * 60 * 1000,  // 1 day
  3 * 24 * 60 * 60 * 1000,  // 3 days
]

function nextSrsInterval(failCount: number): number {
  const idx = Math.min(Math.max(0, failCount - 1), SRS_INTERVALS_MS.length - 1)
  return SRS_INTERVALS_MS[idx]
}

/** Returns the in-session requeue gap for a given failCount.
 *  Each repeated failure on the same item increases the gap, so the user
 *  sees more variety before being tested on the same word again. */
export function getInSessionRequeueGap(failCount: number): number {
  return Math.min(12, IN_SESSION_REQUEUE_GAP + (failCount - 1) * 2)
}

export function createMistakeEntry(contentId: string, userAnswer?: string): MistakeEntry {
  const now = Date.now()
  return {
    contentId,
    failedAt: now,
    nextDueAt: now + nextSrsInterval(1),
    failCount: 1,
    consecutiveCorrect: 0,
    mastered: false,
    lastUserAnswer: userAnswer,
    inSessionRequeueAt: now,
    questionsUntilRequeue: getInSessionRequeueGap(1),
  }
}

export function upsertMistakeOnWrong(
  queue: MistakeEntry[],
  contentId: string,
  userAnswer?: string,
): MistakeEntry[] {
  const existing = queue.find((e) => e.contentId === contentId)
  const now = Date.now()

  if (existing && !existing.mastered) {
    const failCount = existing.failCount + 1
    const updated: MistakeEntry = {
      ...existing,
      failedAt: now,
      nextDueAt: now + nextSrsInterval(failCount),
      failCount,
      consecutiveCorrect: 0,
      mastered: false,
      lastUserAnswer: userAnswer ?? existing.lastUserAnswer,
      inSessionRequeueAt: now,
      questionsUntilRequeue: getInSessionRequeueGap(failCount),
    }
    return [...queue.filter((e) => e.contentId !== contentId), updated]
  }

  return [...queue.filter((e) => e.contentId !== contentId), createMistakeEntry(contentId, userAnswer)]
}

export function upsertMistakeOnCorrect(queue: MistakeEntry[], contentId: string): MistakeEntry[] {
  const existing = queue.find((e) => e.contentId === contentId)
  if (!existing || existing.mastered) {
    return queue.filter((e) => e.contentId !== contentId)
  }

  const consecutiveCorrect = existing.consecutiveCorrect + 1
  if (consecutiveCorrect >= MASTERY_CONSECUTIVE_CORRECT) {
    return queue.filter((e) => e.contentId !== contentId)
  }

  const now = Date.now()
  const updated: MistakeEntry = {
    ...existing,
    consecutiveCorrect,
    nextDueAt: now + nextSrsInterval(existing.failCount),
    inSessionRequeueAt: undefined,
    questionsUntilRequeue: undefined,
  }
  return [...queue.filter((e) => e.contentId !== contentId), updated]
}

/** Decrement requeue counters after each answered question */
export function tickInSessionRequeue(queue: MistakeEntry[]): MistakeEntry[] {
  return queue.map((e) => {
    if (e.mastered || e.questionsUntilRequeue === undefined) return e
    const next = e.questionsUntilRequeue - 1
    return { ...e, questionsUntilRequeue: Math.max(0, next) }
  })
}

/** Items ready to inject into the question buffer this turn */
export function getInSessionRequeueItems(
  queue: MistakeEntry[],
  allContent: ContentItem[],
): ContentItem[] {
  const ready = queue.filter(
    (e) => !e.mastered && e.questionsUntilRequeue === 0 && e.inSessionRequeueAt !== undefined,
  )
  const map = new Map(allContent.map((i) => [i.id, i]))
  return ready.map((e) => map.get(e.contentId)).filter((i): i is ContentItem => i !== undefined)
}

export function getDueMistakeItems(
  queue: MistakeEntry[],
  allContent: ContentItem[],
): ContentItem[] {
  const now = Date.now()
  const due = queue.filter((e) => !e.mastered && e.nextDueAt <= now)
  const map = new Map(allContent.map((i) => [i.id, i]))
  return due.map((e) => map.get(e.contentId)).filter((i): i is ContentItem => i !== undefined)
}

export function clearRequeueAfterShown(queue: MistakeEntry[], contentId: string): MistakeEntry[] {
  return queue.map((e) =>
    e.contentId === contentId
      ? { ...e, inSessionRequeueAt: undefined, questionsUntilRequeue: undefined }
      : e,
  )
}

/**
 * Pick the single best mistake item to inject next.
 *
 * - Only considers items with questionsUntilRequeue === 0 (ready to show).
 * - Skips any ID present in excludeIds (buffer ahead + recent session mistakes).
 * - Among the remaining candidates, picks the one that failed earliest (failedAt ASC),
 *   which guarantees round-robin rotation across all failed words.
 */
export function pickNextRequeueItem(
  queue: MistakeEntry[],
  allContent: ContentItem[],
  excludeIds: Set<string> = new Set(),
): ContentItem | undefined {
  const ready = queue.filter(
    (e) => !e.mastered && e.questionsUntilRequeue === 0 && e.inSessionRequeueAt !== undefined && !excludeIds.has(e.contentId),
  )
  if (ready.length === 0) return undefined

  ready.sort((a, b) => a.failedAt - b.failedAt)

  const map = new Map(allContent.map((i) => [i.id, i]))
  for (const entry of ready) {
    const item = map.get(entry.contentId)
    if (item) return item
  }
  return undefined
}
