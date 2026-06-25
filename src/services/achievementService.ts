export interface AchievementDef {
  id: string
  label: string
  description: string
  emoji: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_steps', label: 'First Steps', description: 'Complete the placement test', emoji: '🎯' },
  { id: 'on_fire', label: 'On Fire', description: 'Reach a 7-day streak', emoji: '🔥' },
  { id: 'perfect_session', label: 'Perfect Session', description: '100% accuracy in a 10+ question session', emoji: '💯' },
  { id: 'grammar_guru', label: 'Grammar Guru', description: '75%+ mastery in 3 grammar skills', emoji: '📚' },
  { id: 'mistake_master', label: 'Mistake Master', description: 'Master 10 items in the Mistake Journal', emoji: '✅' },
  { id: 'night_owl', label: 'Night Owl', description: 'Practice after 22:00', emoji: '🦉' },
  { id: 'combo_king', label: 'Combo King', description: 'Reach a ×10 session combo', emoji: '⚡' },
  { id: 'quest_complete', label: 'Quest Complete', description: 'Finish all daily quests in one day', emoji: '🏆' },
]

export interface AchievementProgress {
  current: number
  target: number
  label: string
}

export function getAchievementProgress(
  id: string,
  state: {
    streak: number
    sessionCorrect: number
    sessionAnswered: number
    sessionCombo: number
    skillStats: Record<string, { correct: number; wrong: number }>
    mistakeQueue: { mastered: boolean }[]
    hasCompletedSetup: boolean
    questStreak: number
  },
): AchievementProgress | null {
  const grammarSkills = Object.entries(state.skillStats).filter(([k]) => !k.startsWith('vocabulary'))
  const strongGrammar = grammarSkills.filter(([, s]) => {
    const total = s.correct + s.wrong
    return total >= 5 && s.correct / total >= 0.75
  })
  const mastered = state.mistakeQueue.filter((e) => e.mastered).length

  switch (id) {
    case 'first_steps':
      return { current: state.hasCompletedSetup ? 1 : 0, target: 1, label: 'Complete placement' }
    case 'on_fire':
      return { current: Math.min(state.streak, 7), target: 7, label: 'Day streak' }
    case 'perfect_session':
      return {
        current: state.sessionAnswered >= 10 && state.sessionCorrect === state.sessionAnswered ? 1 : 0,
        target: 1,
        label: 'Perfect 10+ session',
      }
    case 'grammar_guru':
      return { current: strongGrammar.length, target: 3, label: 'Strong grammar skills' }
    case 'mistake_master':
      return { current: Math.min(mastered, 10), target: 10, label: 'Mastered mistakes' }
    case 'night_owl':
      return { current: new Date().getHours() >= 22 ? 1 : 0, target: 1, label: 'Practice after 22:00' }
    case 'combo_king':
      return { current: Math.min(state.sessionCombo, 10), target: 10, label: 'Session combo' }
    case 'quest_complete':
      return { current: state.questStreak > 0 ? 1 : 0, target: 1, label: 'All quests today' }
    default:
      return null
  }
}

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

export function checkAchievements(state: {
  achievements: string[]
  streak: number
  sessionCorrect: number
  sessionAnswered: number
  sessionCombo: number
  skillStats: Record<string, { correct: number; wrong: number }>
  mistakeQueue: { mastered: boolean }[]
  phase: string
  dailyQuestComplete: boolean
  hasCompletedSetup?: boolean
  questStreak?: number
}): string[] {
  const earned = new Set(state.achievements)
  const grammarSkills = Object.entries(state.skillStats).filter(([k]) => !k.startsWith('vocabulary'))
  const strongGrammar = grammarSkills.filter(([, s]) => {
    const total = s.correct + s.wrong
    return total >= 5 && s.correct / total >= 0.75
  })

  if (state.hasCompletedSetup) earned.add('first_steps')
  if (state.streak >= 7) earned.add('on_fire')
  if (state.sessionAnswered >= 10 && state.sessionCorrect === state.sessionAnswered) earned.add('perfect_session')
  if (strongGrammar.length >= 3) earned.add('grammar_guru')
  if (state.mistakeQueue.filter((e) => e.mastered).length >= 10) earned.add('mistake_master')
  if (new Date().getHours() >= 22) earned.add('night_owl')
  if (state.sessionCombo >= 10) earned.add('combo_king')
  if (state.dailyQuestComplete) earned.add('quest_complete')

  return [...earned]
}

export function awardAchievement(achievements: string[], id: string): string[] {
  if (achievements.includes(id)) return achievements
  return [...achievements, id]
}
