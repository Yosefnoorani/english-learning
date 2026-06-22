export interface AchievementDef {
  id: string
  label: string
  description: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_steps', label: 'First Steps', description: 'Complete the placement test' },
  { id: 'on_fire', label: 'On Fire', description: 'Reach a 7-day streak' },
  { id: 'perfect_session', label: 'Perfect Session', description: '100% accuracy in a 10+ question session' },
  { id: 'grammar_guru', label: 'Grammar Guru', description: '75%+ mastery in 3 grammar skills' },
  { id: 'mistake_master', label: 'Mistake Master', description: 'Master 10 items in the Mistake Journal' },
  { id: 'night_owl', label: 'Night Owl', description: 'Practice after 22:00' },
  { id: 'combo_king', label: 'Combo King', description: 'Reach a ×10 session combo' },
  { id: 'quest_complete', label: 'Quest Complete', description: 'Finish all daily quests in one day' },
]

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
}): string[] {
  const earned = new Set(state.achievements)
  const grammarSkills = Object.entries(state.skillStats).filter(([k]) => !k.startsWith('vocabulary'))
  const strongGrammar = grammarSkills.filter(([, s]) => {
    const total = s.correct + s.wrong
    return total >= 5 && s.correct / total >= 0.75
  })

  if (state.phase === 'gameplay' && state.streak >= 7) earned.add('on_fire')
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
