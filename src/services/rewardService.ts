/** XP, gems, streak multipliers, and variable reward logic. */

export const XP_PER_CORRECT = 10
export const WELCOME_XP_BONUS = 50
export const STREAK_REPAIR_GEM_COST = 50
export const STREAK_FREEZE_GEM_COST = 30
export const DOUBLE_XP_GEM_COST = 25
export const DOUBLE_XP_DURATION_MS = 15 * 60 * 1000
export const MAX_CONTINUE_NUDGES_PER_DAY = 2
export const BONUS_CHEST_CHANCE = 0.05
export const MAX_STREAK_REPAIRS_PER_MONTH = 2

export const QUEST_GEM_REWARDS: Record<string, number> = {
  session_10: 10,
  session_5: 5,
  review_3: 10,
  listening_2: 8,
  combo_5: 12,
  shadowing_1: 8,
  perfect_5: 15,
  bonus_all: 25,
}

export const STREAK_MILESTONES: { days: number; gems: number }[] = [
  { days: 7, gems: 20 },
  { days: 30, gems: 50 },
  { days: 100, gems: 100 },
  { days: 365, gems: 500 },
]

export function xpForLevel(level: number): number {
  return level * 100
}

export function levelFromXp(xp: number): number {
  let level = 1
  let remaining = xp
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level += 1
  }
  return level
}

export function xpProgressInLevel(xp: number): { level: number; current: number; target: number; percent: number } {
  const level = levelFromXp(xp)
  let spent = 0
  for (let l = 1; l < level; l++) spent += xpForLevel(l)
  const current = xp - spent
  const target = xpForLevel(level)
  return { level, current, target, percent: Math.round((current / target) * 100) }
}

export function streakXpMultiplier(streak: number): number {
  if (streak >= 30) return 2
  if (streak >= 7) return 1.5
  if (streak >= 3) return 1.2
  return 1
}

export function rollBonusChest(): { gems: number; goldenCombo: boolean } | null {
  if (Math.random() > BONUS_CHEST_CHANCE) return null
  const goldenCombo = Math.random() < 0.1
  const gems = goldenCombo
    ? 75 + Math.floor(Math.random() * 26)
    : 25 + Math.floor(Math.random() * 26)
  return { gems, goldenCombo }
}

export function computeCorrectAnswerRewards(opts: {
  streak: number
  doubleXpUntil: number
  now?: number
}): { xp: number; gems: number; bonusChest: { gems: number; goldenCombo: boolean } | null } {
  const now = opts.now ?? Date.now()
  const mult = streakXpMultiplier(opts.streak)
  const doubleActive = opts.doubleXpUntil > now
  const xp = Math.round(XP_PER_CORRECT * mult * (doubleActive ? 2 : 1))
  const bonusChest = rollBonusChest()
  const gems = bonusChest?.gems ?? 0
  return { xp, gems, bonusChest }
}

export function isWeekendDoubleXp(date = new Date()): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function weekendXpMultiplier(date = new Date()): number {
  return isWeekendDoubleXp(date) ? 2 : 1
}

export function getUnclaimedStreakMilestones(
  streak: number,
  claimed: number[],
): { days: number; gems: number }[] {
  return STREAK_MILESTONES.filter((m) => streak >= m.days && !claimed.includes(m.days))
}

export function estimateMinutesToGoal(remaining: number): number {
  return Math.max(1, Math.ceil(remaining * 0.5))
}
