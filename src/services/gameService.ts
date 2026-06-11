import type { ContentItem, SkillId, SkillStats, MistakeEntry } from '@/types/game'
import { supabase } from './supabaseClient'
import { getAllContent, getPlacementContent } from './contentService'
import { getDifficultyBand } from './adaptiveProgressionService'
import {
  getDueMistakeItems,
  pickNextRequeueItem,
} from './mistakeMasteryService'
import type { TelemetryEntry } from '@/types/game'

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
): Promise<ContentItem[]> {
  if (mode === 'placement') {
    return shuffle(getPlacementContent()).slice(0, 5)
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
      return skillBiasedSelect(data as ContentItem[], limit, skillStats, mistakeQueue, tier, excludeIds)
    }
    console.warn('[gameService] Supabase fetch failed, using local content', error)
  }

  const { min, max } = getDifficultyBand(tier)
  const all = getAllContent()
  const inBand = all.filter(
    (item) =>
      item.difficulty >= min &&
      item.difficulty <= max &&
      item.type !== 'placement_test',
  )
  const pool = inBand.length >= 6 ? inBand : all.filter((i) => i.type !== 'placement_test')

  return skillBiasedSelect(pool, limit, skillStats, mistakeQueue, tier, excludeIds)
}

export async function fetchReviewItems(_userId: string): Promise<ContentItem[]> {
  const all = getAllContent()
  if (!supabase) {
    return shuffle(all.filter((i) => i.difficulty >= 550 && i.type !== 'placement_test')).slice(0, 6)
  }
  const { data, error } = await supabase.rpc('get_due_review_items', { p_user_id: _userId })
  if (error || !data?.length) return []
  return data as ContentItem[]
}

export async function submitTelemetry(entry: TelemetryEntry): Promise<void> {
  if (!supabase) return
  await supabase.rpc('upsert_telemetry', {
    p_user_id: 'anonymous',
    p_content_id: entry.contentId,
    p_correct: entry.isCorrect,
  })
}

const RECENT_EXCLUDE_CAP = 30

function skillBiasedSelect(
  pool: ContentItem[],
  limit: number,
  skillStats?: Record<SkillId, SkillStats>,
  mistakeQueue?: MistakeEntry[],
  _tier?: number,
  excludeIds: string[] = [],
): ContentItem[] {
  const allContent = getAllContent()
  const selected: ContentItem[] = []
  const usedIds = new Set<string>()
  const recentExclude = new Set(excludeIds.slice(-RECENT_EXCLUDE_CAP))

  let workingPool = pool.filter((item) => !recentExclude.has(item.id))
  if (workingPool.length < limit) {
    workingPool = pool
  }

  if (mistakeQueue) {
    // At most 1 in-session requeue item — chosen via round-robin (oldest failedAt first)
    // so the user sees variety across all failed words, not the same one repeatedly.
    const requeueItem = pickNextRequeueItem(mistakeQueue, allContent, recentExclude)
    if (requeueItem && !usedIds.has(requeueItem.id)) {
      selected.push(requeueItem)
      usedIds.add(requeueItem.id)
    }

    // At most 1 SRS-due item on top of the requeue slot (keeps mistake density low).
    const dueItems = getDueMistakeItems(mistakeQueue, allContent)
    for (const item of dueItems) {
      if (selected.length >= 2) break
      if (!usedIds.has(item.id) && !recentExclude.has(item.id)) {
        selected.push(item)
        usedIds.add(item.id)
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
      candidatePool.find((i) => (typeCount[i.type] ?? 0) < 2) ??
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

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}
