import type { ContentItem, SkillId, SkillStats, MistakeEntry, VocabReviewEntry } from '@/types/game'
import { supabase } from './supabaseClient'
import { getAllContent, getPlacementContent } from './contentService'
import { getDifficultyBand } from './adaptiveProgressionService'
import {
  getDueMistakeItems,
  pickNextRequeueItem,
} from './mistakeMasteryService'
import { expandPoolWithVocabDerivatives } from './vocabDerivationService'
import { getDueVocabReviews } from './vocabReviewService'
import type { TelemetryEntry } from '@/types/game'

/** Listening dictation and shadowing — exercises that require hearing or speaking. */
export function isAudioQuestion(item: ContentItem): boolean {
  return item.type === 'listening_dictation'
}

export function filterByAudioPreference(items: ContentItem[], includeAudio: boolean): ContentItem[] {
  if (includeAudio) return items
  return items.filter((item) => !isAudioQuestion(item))
}

/**
 * Fetch questions filtered by difficulty tier band.
 * Applies skill-weakness bias and mistake requeue priority.
 */
export async function fetchQuestions(
  tier: number,
  mode: 'gameplay' | 'placement' | 'review' = 'gameplay',
  limit = 15,
  skillStats?: Record<SkillId, SkillStats>,
  mistakeQueue?: MistakeEntry[],
  excludeIds: string[] = [],
  vocabReviewQueue?: VocabReviewEntry[],
  includeAudioQuestions = true,
): Promise<ContentItem[]> {
  if (mode === 'placement') {
    return shuffle(filterByAudioPreference(getPlacementContent(), includeAudioQuestions)).slice(0, 5)
  }

  const rating = getDifficultyBand(tier).min + 25

  if (supabase && mode !== 'review') {
    const band = 100
    const { data, error } = await supabase
      .from('content_bank')
      .select('*')
      .gte('difficulty', rating - band)
      .lte('difficulty', rating + band)
      .limit(limit * 2)

    if (!error && data?.length) {
      return skillBiasedSelect(
        filterByAudioPreference(data as ContentItem[], includeAudioQuestions),
        limit,
        skillStats,
        mistakeQueue,
        tier,
        excludeIds,
        vocabReviewQueue,
        includeAudioQuestions,
      )
    }
    console.warn('[gameService] Supabase fetch failed, using local content', error)
  }

  const { min, max } = getDifficultyBand(tier)
  const all = getAllContent()
  const inBand = filterByAudioPreference(
    all.filter(
      (item) =>
        item.difficulty >= min &&
        item.difficulty <= max &&
        item.type !== 'placement_test',
    ),
    includeAudioQuestions,
  )
  const fallback = filterByAudioPreference(
    all.filter((i) => i.type !== 'placement_test'),
    includeAudioQuestions,
  )
  const pool = inBand.length >= 6 ? inBand : fallback
  const expandedPool = expandPoolWithVocabDerivatives(pool, getAllContent())

  return skillBiasedSelect(
    expandedPool,
    limit,
    skillStats,
    mistakeQueue,
    tier,
    excludeIds,
    vocabReviewQueue,
    includeAudioQuestions,
  )
}

/** Load due items from the local mistake SRS queue for dedicated review sessions. */
export function fetchDueMistakeReviewItems(
  mistakeQueue: MistakeEntry[],
  limit = 12,
  includeAudioQuestions = true,
): ContentItem[] {
  const all = getAllContent()
  const due = filterByAudioPreference(getDueMistakeItems(mistakeQueue, all), includeAudioQuestions)
  return shuffle(due).slice(0, limit)
}

/** Adaptive skill-focused lesson using the same selection pipeline as gameplay. */
export async function fetchSkillLessonQuestions(
  skill: SkillId,
  tier: number,
  limit: number,
  skillStats?: Record<SkillId, SkillStats>,
  mistakeQueue?: MistakeEntry[],
  excludeIds: string[] = [],
  vocabReviewQueue?: VocabReviewEntry[],
  includeAudioQuestions = true,
): Promise<ContentItem[]> {
  const batch = await fetchQuestions(
    tier,
    'gameplay',
    limit * 4,
    skillStats,
    mistakeQueue,
    excludeIds,
    vocabReviewQueue,
    includeAudioQuestions,
  )
  const skillItems = batch.filter((i) => i.skill === skill)
  if (skillItems.length >= limit) return skillItems.slice(0, limit)

  const { min, max } = getDifficultyBand(tier)
  const all = getAllContent()
  const pool = shuffle(
    filterByAudioPreference(
      all.filter(
        (i) =>
          i.skill === skill &&
          i.type !== 'placement_test' &&
          i.difficulty >= min - 50 &&
          i.difficulty <= max + 50,
      ),
      includeAudioQuestions,
    ),
  )
  const merged = [...skillItems]
  for (const item of pool) {
    if (merged.length >= limit) break
    if (!merged.some((m) => m.id === item.id)) merged.push(item)
  }
  return merged.slice(0, limit)
}

/** @deprecated Use fetchDueMistakeReviewItems with local mistakeQueue instead. */
export async function fetchReviewItems(_userId: string): Promise<ContentItem[]> {
  return fetchDueMistakeReviewItems([], 6)
}

export async function submitTelemetry(entry: TelemetryEntry): Promise<void> {
  if (!supabase) return
  await supabase.rpc('upsert_telemetry', {
    p_user_id: 'anonymous',
    p_content_id: entry.contentId,
    p_correct: entry.isCorrect,
  })
}

export async function submitExperimentEvent(
  experimentId: string,
  variant: string,
  event: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  console.debug('[telemetry/experiment]', { experimentId, variant, event, payload })
  if (!supabase) return
  try {
    await supabase.rpc('log_experiment_event', {
      p_experiment_id: experimentId,
      p_variant: variant,
      p_event: event,
      p_payload: payload ?? {},
    })
  } catch {
    /* optional RPC */
  }
}

const RECENT_EXCLUDE_CAP = 30

/** Per-type caps per batch — conjugation gets a higher share than most types. */
const TYPE_CAPS: Partial<Record<ContentItem['type'], number>> = {
  verb_conjugation: 4,
}
const DEFAULT_TYPE_CAP = 2

function getTypeCap(type: ContentItem['type']): number {
  return TYPE_CAPS[type] ?? DEFAULT_TYPE_CAP
}

/** Ensure at least this fraction of each batch is verb conjugation (when available). */
function minConjugationSlots(batchSize: number): number {
  return Math.max(1, Math.ceil(batchSize * 0.25))
}

function skillBiasedSelect(
  pool: ContentItem[],
  limit: number,
  skillStats?: Record<SkillId, SkillStats>,
  mistakeQueue?: MistakeEntry[],
  _tier?: number,
  excludeIds: string[] = [],
  vocabReviewQueue?: VocabReviewEntry[],
  includeAudioQuestions = true,
): ContentItem[] {
  const allContent = getAllContent()
  const selected: ContentItem[] = []
  const usedIds = new Set<string>()
  const recentExclude = new Set(excludeIds.slice(-RECENT_EXCLUDE_CAP))

  let workingPool = filterByAudioPreference(
    pool.filter((item) => !recentExclude.has(item.id)),
    includeAudioQuestions,
  )
  if (workingPool.length < limit) {
    workingPool = filterByAudioPreference(pool, includeAudioQuestions)
  }

  if (vocabReviewQueue) {
    for (const item of getDueVocabReviews(vocabReviewQueue, allContent)) {
      if (selected.length >= 2) break
      if (!usedIds.has(item.id) && !recentExclude.has(item.id)) {
        selected.push(item)
        usedIds.add(item.id)
      }
    }
  }

  if (mistakeQueue) {
    // At most 1 in-session requeue item — chosen via round-robin (oldest failedAt first)
    // so the user sees variety across all failed words, not the same one repeatedly.
    const requeueItem = pickNextRequeueItem(mistakeQueue, allContent, recentExclude)
    if (requeueItem && !usedIds.has(requeueItem.id) && (includeAudioQuestions || !isAudioQuestion(requeueItem))) {
      selected.push(requeueItem)
      usedIds.add(requeueItem.id)
    }

    // At most 1 SRS-due item on top of the requeue slot (keeps mistake density low).
    const dueItems = filterByAudioPreference(getDueMistakeItems(mistakeQueue, allContent), includeAudioQuestions)
    for (const item of dueItems) {
      if (selected.length >= 2) break
      if (!usedIds.has(item.id) && !recentExclude.has(item.id)) {
        selected.push(item)
        usedIds.add(item.id)
      }
    }
  }

  if (skillStats) {
    const staleGrammarSkill = findStaleGrammarSkill(skillStats)
    if (staleGrammarSkill) {
      const staleItem = workingPool.find(
        (item) => item.skill === staleGrammarSkill && !usedIds.has(item.id) && !item.skill.startsWith('vocabulary'),
      )
      if (staleItem && selected.length < limit) {
        selected.push(staleItem)
        usedIds.add(staleItem.id)
      }
    }
  }

  let weakSkillItems: ContentItem[] = []
  if (skillStats) {
    const weakSkill = findWeakestSkill(skillStats)
    if (weakSkill) {
      weakSkillItems = workingPool.filter((item) => item.skill === weakSkill && !usedIds.has(item.id))
    }
  }

  const typeCount: Record<string, number> = {}
  const remaining = shuffle(workingPool.filter((item) => !usedIds.has(item.id)))

  // Reserve conjugation slots early so they are not crowded out by vocab derivatives.
  const conjugationMin = minConjugationSlots(limit)
  const conjugationCandidates = shuffle(
    workingPool.filter((item) => item.type === 'verb_conjugation' && !usedIds.has(item.id)),
  )
  for (const item of conjugationCandidates) {
    if (selected.length >= limit) break
    if ((typeCount.verb_conjugation ?? 0) >= conjugationMin) break
    selected.push(item)
    usedIds.add(item.id)
    typeCount.verb_conjugation = (typeCount.verb_conjugation ?? 0) + 1
  }

  while (selected.length < limit) {
    const useWeakSkill = weakSkillItems.length > 0 && Math.random() < 0.4
    const candidatePool = useWeakSkill ? weakSkillItems : remaining.filter((i) => !usedIds.has(i.id))

    if (candidatePool.length === 0) {
      const fallback = remaining.find((i) => !usedIds.has(i.id))
      if (!fallback) break
      selected.push(fallback)
      usedIds.add(fallback.id)
      weakSkillItems = weakSkillItems.filter((i) => i.id !== fallback.id)
      typeCount[fallback.type] = (typeCount[fallback.type] ?? 0) + 1
      continue
    }

    const pick =
      candidatePool.find((i) => (typeCount[i.type] ?? 0) < getTypeCap(i.type)) ??
      candidatePool[0]

    selected.push(pick)
    usedIds.add(pick.id)
    weakSkillItems = weakSkillItems.filter((i) => i.id !== pick.id)
    typeCount[pick.type] = (typeCount[pick.type] ?? 0) + 1
  }

  return selected
}

function findWeakestSkill(skillStats: Record<SkillId, SkillStats>): SkillId | null {
  let worst: { skill: SkillId; mastery: number } | null = null
  for (const [skill, stats] of Object.entries(skillStats) as [SkillId, SkillStats][]) {
    const total = stats.correct + stats.wrong
    if (total < 2) continue
    const mastery = stats.correct / total
    if (mastery < 0.7 && (worst === null || mastery < worst.mastery)) {
      worst = { skill, mastery }
    }
  }
  return worst?.skill ?? null
}

const GRAMMAR_REVIEW_MS = 7 * 24 * 60 * 60 * 1000

function findStaleGrammarSkill(skillStats: Record<SkillId, SkillStats>, now = Date.now()): SkillId | null {
  let candidate: { skill: SkillId; mastery: number; lastSeen: number } | null = null
  for (const [skill, stats] of Object.entries(skillStats) as [SkillId, SkillStats][]) {
    if (skill.startsWith('vocabulary')) continue
    const total = stats.correct + stats.wrong
    if (total < 5) continue
    const mastery = stats.correct / total
    if (mastery >= 0.75) continue
    if (now - stats.lastSeen < GRAMMAR_REVIEW_MS) continue
    if (!candidate || stats.lastSeen < candidate.lastSeen) {
      candidate = { skill, mastery, lastSeen: stats.lastSeen }
    }
  }
  return candidate?.skill ?? null
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

const BLOCKED_INTRO_COUNT = 5
const BLOCKED_INTRO_THRESHOLD = 3

function findNewestSkill(skillStats: Record<SkillId, SkillStats>): SkillId | null {
  const candidates = (Object.entries(skillStats) as [SkillId, SkillStats][])
    .filter(([, s]) => s.correct + s.wrong < BLOCKED_INTRO_THRESHOLD)
    .sort((a, b) => a[1].correct + a[1].wrong - (b[1].correct + b[1].wrong))
  return candidates[0]?.[0] ?? null
}

/** Front-load items for a new skill (< 3 attempts) before mixed practice. */
export function applyBlockedPractice(
  items: ContentItem[],
  skillStats: Record<SkillId, SkillStats>,
  allContent: ContentItem[],
  includeAudioQuestions = true,
): ContentItem[] {
  const newSkill = findNewestSkill(skillStats)

  if (!newSkill) return items

  const blocked = shuffle(
    filterByAudioPreference(
      allContent.filter((i) => i.skill === newSkill && i.type !== 'placement_test'),
      includeAudioQuestions,
    ),
  ).slice(0, BLOCKED_INTRO_COUNT)

  if (blocked.length === 0) return items

  const blockedIds = new Set(blocked.map((i) => i.id))
  const rest = items.filter((i) => !blockedIds.has(i.id))
  return [...blocked, ...rest].slice(0, items.length)
}
