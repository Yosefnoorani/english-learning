import type { ContentItem, MistakeEntry } from '@/types/game'

export const IN_SESSION_REQUEUE_GAP = 3
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
    questionsUntilRequeue: IN_SESSION_REQUEUE_GAP,
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
      questionsUntilRequeue: IN_SESSION_REQUEUE_GAP,
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
