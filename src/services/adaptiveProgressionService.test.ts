import { describe, it, expect } from 'vitest'
import {
  onWrong,
  onCorrect,
  TIER_PROGRESS_PENALTY,
  DEMOTION_WRONG_STREAK,
} from './adaptiveProgressionService'

describe('onWrong', () => {
  it('applies partial penalty on single wrong answer instead of resetting streak', () => {
    const result = onWrong(5, 5, 0)
    expect(result.tierCorrectStreak).toBe(5 - TIER_PROGRESS_PENALTY)
    expect(result.demoted).toBe(false)
    expect(result.newTier).toBe(5)
    expect(result.tierWrongStreak).toBe(1)
  })

  it('does not demote before reaching wrong streak threshold', () => {
    const first = onWrong(5, 3, 0)
    expect(first.demoted).toBe(false)
    expect(first.newTier).toBe(5)

    const second = onWrong(5, first.tierCorrectStreak, first.tierWrongStreak)
    expect(second.demoted).toBe(false)
    expect(second.newTier).toBe(5)
    expect(second.tierWrongStreak).toBe(2)
  })

  it('demotes and fully resets tier progress after consecutive wrong answers', () => {
    let tier = 5
    let correctStreak = 6
    let wrongStreak = 0

    for (let i = 0; i < DEMOTION_WRONG_STREAK; i++) {
      const action = onWrong(tier, correctStreak, wrongStreak)
      tier = action.newTier
      correctStreak = action.tierCorrectStreak
      wrongStreak = action.tierWrongStreak
    }

    expect(tier).toBe(4)
    expect(correctStreak).toBe(0)
    expect(wrongStreak).toBe(0)
  })

  it('floors tier progress at zero when penalty exceeds current streak', () => {
    const result = onWrong(3, 1, 0)
    expect(result.tierCorrectStreak).toBe(0)
    expect(result.demoted).toBe(false)
  })
})

describe('onCorrect after mistake', () => {
  it('promotes only after full post-mistake target', () => {
    let streak = 0
    for (let i = 0; i < 10; i++) {
      const action = onCorrect(5, streak, 0, true)
      streak = action.tierCorrectStreak
      expect(action.promoted).toBe(false)
    }
    const promoted = onCorrect(5, streak, 0, true)
    expect(promoted.promoted).toBe(true)
    expect(promoted.newTier).toBe(6)
  })
})
