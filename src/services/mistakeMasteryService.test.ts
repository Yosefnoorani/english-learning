import { describe, it, expect } from 'vitest'
import type { ContentItem, MistakeEntry } from '@/types/game'
import {
  getInSessionRequeueGap,
  createMistakeEntry,
  upsertMistakeOnWrong,
  pickNextRequeueItem,
} from './mistakeMasteryService'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(id: string): ContentItem {
  return {
    id,
    type: 'vocabulary',
    difficulty: 400,
    skill: 'vocabulary_emotions',
    tags: [],
    data: {
      word: id,
      translation: id,
      context_sentence: '',
      context_translation: '',
      correct_answer: id,
    },
  } as unknown as ContentItem
}

function makeReadyEntry(contentId: string, failedAt: number, failCount = 1): MistakeEntry {
  return {
    contentId,
    failedAt,
    nextDueAt: failedAt + 1000,
    failCount,
    consecutiveCorrect: 0,
    mastered: false,
    inSessionRequeueAt: failedAt,
    questionsUntilRequeue: 0,
  }
}

// ── getInSessionRequeueGap ────────────────────────────────────────────────────

describe('getInSessionRequeueGap', () => {
  it('returns 6 for the first failure (failCount 1)', () => {
    expect(getInSessionRequeueGap(1)).toBe(6)
  })

  it('returns 8 for failCount 2', () => {
    expect(getInSessionRequeueGap(2)).toBe(8)
  })

  it('returns 10 for failCount 3', () => {
    expect(getInSessionRequeueGap(3)).toBe(10)
  })

  it('caps at 12 for very high failCounts', () => {
    expect(getInSessionRequeueGap(10)).toBe(12)
    expect(getInSessionRequeueGap(100)).toBe(12)
  })
})

// ── createMistakeEntry uses the new gap ───────────────────────────────────────

describe('createMistakeEntry', () => {
  it('sets questionsUntilRequeue to 6 (gap for failCount 1)', () => {
    const entry = createMistakeEntry('v1')
    expect(entry.questionsUntilRequeue).toBe(6)
  })
})

// ── upsertMistakeOnWrong uses dynamic gap ─────────────────────────────────────

describe('upsertMistakeOnWrong — dynamic gap', () => {
  it('increases questionsUntilRequeue on repeated failure', () => {
    let queue: MistakeEntry[] = []
    queue = upsertMistakeOnWrong(queue, 'v1', 'wrong1')
    const first = queue.find((e) => e.contentId === 'v1')!
    expect(first.questionsUntilRequeue).toBe(6)

    queue = upsertMistakeOnWrong(queue, 'v1', 'wrong2')
    const second = queue.find((e) => e.contentId === 'v1')!
    expect(second.questionsUntilRequeue).toBe(8)
  })
})

// ── pickNextRequeueItem ───────────────────────────────────────────────────────

describe('pickNextRequeueItem', () => {
  const items = ['a', 'b', 'c'].map(makeItem)

  it('returns undefined when no items are ready', () => {
    const queue: MistakeEntry[] = items.map((i) => ({ ...makeReadyEntry(i.id, 1000), questionsUntilRequeue: 3 }))
    expect(pickNextRequeueItem(queue, items)).toBeUndefined()
  })

  it('returns undefined when all ready items are excluded', () => {
    const queue = items.map((i) => makeReadyEntry(i.id, 1000))
    const exclude = new Set(['a', 'b', 'c'])
    expect(pickNextRequeueItem(queue, items, exclude)).toBeUndefined()
  })

  it('skips excluded IDs and returns the next available item', () => {
    const queue = items.map((i, idx) => makeReadyEntry(i.id, 1000 + idx))
    const exclude = new Set(['a'])
    const result = pickNextRequeueItem(queue, items, exclude)
    // 'a' is excluded; 'b' has the earliest failedAt among remaining
    expect(result?.id).toBe('b')
  })

  it('rotates by failedAt — returns the item that failed earliest', () => {
    // 'c' failed first, then 'a', then 'b'
    const queue = [
      makeReadyEntry('c', 1000),
      makeReadyEntry('a', 2000),
      makeReadyEntry('b', 3000),
    ]
    const result = pickNextRequeueItem(queue, items)
    expect(result?.id).toBe('c')
  })

  it('with the earliest excluded, picks the next in failedAt order', () => {
    const queue = [
      makeReadyEntry('c', 1000),
      makeReadyEntry('a', 2000),
      makeReadyEntry('b', 3000),
    ]
    const exclude = new Set(['c'])
    const result = pickNextRequeueItem(queue, items, exclude)
    expect(result?.id).toBe('a')
  })
})
