import type { ContentItem, SkillId, SkillStats, MistakeEntry } from '@/types/game'
import { supabase } from './supabaseClient'
import { ALL_CONTENT, PLACEMENT_CONTENT } from '@/content/index'
import type { TelemetryEntry } from '@/types/game'

// ── Service functions ──────────────────────────────────────

/**
 * Fetch questions filtered by difficulty band around the user's rating.
 * Applies skill-weakness bias: ~40% chance to pick from weakest skill.
 * Falls back to all content when Supabase is not configured.
 */
export async function fetchQuestions(
  rating: number,
  mode: 'gameplay' | 'placement' | 'review' = 'gameplay',
  limit = 15,
  skillStats?: Record<SkillId, SkillStats>,
  mistakeQueue?: MistakeEntry[],
): Promise<ContentItem[]> {
  if (mode === 'placement') {
    return shuffle(PLACEMENT_CONTENT).slice(0, 5)
  }

  // ── Supabase fetch (when configured) ──────────────────────
  if (supabase && mode !== 'review') {
    const band = 100
    const { data, error } = await supabase
      .from('content_bank')
      .select('*')
      .gte('difficulty', rating - band)
      .lte('difficulty', rating + band)
      .limit(limit * 2)

    if (!error && data?.length) {
      return skillBiasedSelect(data as ContentItem[], limit, skillStats, mistakeQueue)
    }
    console.warn('[gameService] Supabase fetch failed, using local content', error)
  }

  // ── Local content fallback ─────────────────────────────────
  const band = 120
  const inBand = ALL_CONTENT.filter(
    (item) =>
      item.difficulty >= rating - band &&
      item.difficulty <= rating + band &&
      item.type !== 'placement_test',
  )
  const pool = inBand.length >= 6 ? inBand : ALL_CONTENT.filter((i) => i.type !== 'placement_test')

  return skillBiasedSelect(pool, limit, skillStats, mistakeQueue)
}

/**
 * Fetch items due for spaced-repetition review.
 */
export async function fetchReviewItems(userId: string): Promise<ContentItem[]> {
  if (!supabase) {
    return shuffle(ALL_CONTENT.filter((i) => i.difficulty >= 550 && i.type !== 'placement_test')).slice(0, 6)
  }
  const { data, error } = await supabase.rpc('get_due_review_items', { p_user_id: userId })
  if (error || !data?.length) return []
  return data as ContentItem[]
}

/**
 * Record the result of a user's answer.
 */
export async function submitTelemetry(entry: TelemetryEntry): Promise<void> {
  if (!supabase) return
  await supabase.rpc('upsert_telemetry', {
    p_user_id: 'anonymous',
    p_content_id: entry.contentId,
    p_correct: entry.isCorrect,
  })
}

// ── Selection helpers ──────────────────────────────────────

/**
 * Select `limit` items from the pool with skill-weakness bias.
 *  - Up to 1 SRS review item (if due)
 *  - 40% chance: pick from weakest skill (mastery < 0.7)
 *  - Diverse type mix
 */
function skillBiasedSelect(
  pool: ContentItem[],
  limit: number,
  skillStats?: Record<SkillId, SkillStats>,
  mistakeQueue?: MistakeEntry[],
): ContentItem[] {
  const now = Date.now()
  const selected: ContentItem[] = []
  const usedIds = new Set<string>()

  // 1. Pull one SRS due item if available
  if (mistakeQueue && skillStats) {
    const dueEntry = mistakeQueue.find((e) => e.nextDueAt <= now)
    if (dueEntry) {
      const srsItem = pool.find((item) => item.id === dueEntry.contentId)
      if (srsItem) {
        selected.push(srsItem)
        usedIds.add(srsItem.id)
      }
    }
  }

  // 2. Identify weakest skill
  let weakSkillItems: ContentItem[] = []
  if (skillStats) {
    const weakSkill = findWeakestSkill(skillStats)
    if (weakSkill) {
      weakSkillItems = pool.filter((item) => item.skill === weakSkill && !usedIds.has(item.id))
    }
  }

  // 3. Fill up to limit with skill bias + type diversity
  const typeCount: Record<string, number> = {}
  const remaining = shuffle(pool.filter((item) => !usedIds.has(item.id)))

  while (selected.length < limit) {
    // 40% of remaining slots: pick from weak skill pool
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

    // Prefer types not over-represented (max 2 of the same type per batch)
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

/** Returns the SkillId with the lowest mastery ratio (or null if no data) */
function findWeakestSkill(skillStats: Record<SkillId, SkillStats>): SkillId | null {
  let worst: { skill: SkillId; mastery: number } | null = null
  for (const [skill, stats] of Object.entries(skillStats) as [SkillId, SkillStats][]) {
    const total = stats.correct + stats.wrong
    if (total < 2) continue // not enough data
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
