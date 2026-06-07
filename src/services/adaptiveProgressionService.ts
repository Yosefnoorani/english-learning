/** Tier-based adaptive progression — X=7, Y=4 per plan */

export const PROMOTION_X = 7
export const PROMOTION_Y = 4
export const PROMOTION_AFTER_MISTAKE = PROMOTION_X + PROMOTION_Y // 11
export const DEMOTION_WRONG_STREAK = 2
export const MIN_TIER = 1
export const MAX_TIER = 10
export const TIER_MIN_DIFFICULTY = 350
export const TIER_STEP = 50

export const TIER_LABELS: Record<number, string> = {
  1: 'Starter',
  2: 'Beginner',
  3: 'Elementary',
  4: 'Lower-Intermediate',
  5: 'Intermediate',
  6: 'Upper-Intermediate',
  7: 'Advanced',
  8: 'Proficient',
  9: 'Expert',
  10: 'Master',
}

export interface DifficultyBand {
  min: number
  max: number
}

export interface TierAction {
  newTier: number
  newRating: number
  tierCorrectStreak: number
  tierWrongStreak: number
  hadRecentMistakeAtTier: boolean
  promoted: boolean
  demoted: boolean
}

export function getTierFromRating(rating: number): number {
  const clamped = Math.max(TIER_MIN_DIFFICULTY, Math.min(900, rating))
  return Math.min(MAX_TIER, Math.floor((clamped - TIER_MIN_DIFFICULTY) / TIER_STEP) + 1)
}

export function getRatingFromTier(tier: number): number {
  const t = Math.max(MIN_TIER, Math.min(MAX_TIER, tier))
  return TIER_MIN_DIFFICULTY + (t - 1) * TIER_STEP
}

export function getDifficultyBand(tier: number): DifficultyBand {
  const t = Math.max(MIN_TIER, Math.min(MAX_TIER, tier))
  const min = TIER_MIN_DIFFICULTY + (t - 1) * TIER_STEP
  return { min, max: min + TIER_STEP - 1 }
}

export function getPromotionTarget(hadRecentMistake: boolean): number {
  return hadRecentMistake ? PROMOTION_AFTER_MISTAKE : PROMOTION_X
}

export function shouldPromote(streak: number, hadRecentMistake: boolean): boolean {
  return streak >= getPromotionTarget(hadRecentMistake)
}

export function shouldDemote(wrongStreak: number): boolean {
  return wrongStreak >= DEMOTION_WRONG_STREAK
}

export function getTierLabel(tier: number): string {
  return TIER_LABELS[tier] ?? `Tier ${tier}`
}

/** Tier used for question selection when user chooses to practice below their current level. */
export function getEffectivePracticeTier(currentTier: number, practiceTierOffset: number): number {
  const maxOffset = Math.max(0, currentTier - MIN_TIER)
  const offset = Math.max(0, Math.min(maxOffset, practiceTierOffset))
  return currentTier - offset
}

export function onCorrect(
  currentTier: number,
  tierCorrectStreak: number,
  _tierWrongStreak: number,
  hadRecentMistakeAtTier: boolean,
): TierAction {
  const newWrongStreak = 0
  const newStreak = tierCorrectStreak + 1

  if (shouldPromote(newStreak, hadRecentMistakeAtTier) && currentTier < MAX_TIER) {
    const newTier = currentTier + 1
    return {
      newTier,
      newRating: getRatingFromTier(newTier),
      tierCorrectStreak: 0,
      tierWrongStreak: 0,
      hadRecentMistakeAtTier: false,
      promoted: true,
      demoted: false,
    }
  }

  return {
    newTier: currentTier,
    newRating: getRatingFromTier(currentTier),
    tierCorrectStreak: newStreak,
    tierWrongStreak: newWrongStreak,
    hadRecentMistakeAtTier,
    promoted: false,
    demoted: false,
  }
}

export function onWrong(
  currentTier: number,
  _tierCorrectStreak: number,
  tierWrongStreak: number,
): TierAction {
  const newWrongStreak = tierWrongStreak + 1

  if (shouldDemote(newWrongStreak) && currentTier > MIN_TIER) {
    const newTier = currentTier - 1
    return {
      newTier,
      newRating: getRatingFromTier(newTier),
      tierCorrectStreak: 0,
      tierWrongStreak: 0,
      hadRecentMistakeAtTier: true,
      promoted: false,
      demoted: true,
    }
  }

  return {
    newTier: currentTier,
    newRating: getRatingFromTier(currentTier),
    tierCorrectStreak: 0,
    tierWrongStreak: newWrongStreak,
    hadRecentMistakeAtTier: true,
    promoted: false,
    demoted: false,
  }
}
