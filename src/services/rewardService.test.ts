import { describe, it, expect } from 'vitest'
import {
  levelFromXp,
  xpProgressInLevel,
  streakXpMultiplier,
  getUnclaimedStreakMilestones,
} from './rewardService'

describe('rewardService', () => {
  it('computes level from xp', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
    expect(levelFromXp(250)).toBe(2)
    expect(levelFromXp(300)).toBe(3)
  })

  it('tracks progress within level', () => {
    const p = xpProgressInLevel(150)
    expect(p.level).toBe(2)
    expect(p.current).toBe(50)
    expect(p.target).toBe(200)
  })

  it('applies streak multipliers', () => {
    expect(streakXpMultiplier(1)).toBe(1)
    expect(streakXpMultiplier(3)).toBe(1.2)
    expect(streakXpMultiplier(7)).toBe(1.5)
    expect(streakXpMultiplier(30)).toBe(2)
  })

  it('finds unclaimed milestones', () => {
    const unclaimed = getUnclaimedStreakMilestones(10, [])
    expect(unclaimed.map((m) => m.days)).toContain(7)
    expect(unclaimed.map((m) => m.days)).not.toContain(30)
  })
})
