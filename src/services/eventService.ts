/** Limited-time events and seasonal bonuses. */

export interface ActiveEvent {
  id: string
  title: string
  description: string
  xpMultiplier: number
  badgeId?: string
  endsAt: number
}

function monthChallengeId(date: Date): string {
  return `monthly_${date.getFullYear()}_${date.getMonth()}`
}

function monthChallengeTitle(date: Date): string {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const themes = [
    'Grammar Sprint', 'Vocab Builder', 'Listening Marathon', 'Reading Challenge',
    'Speaking Focus', 'Writing Workshop', 'Fluency Month', 'Review Blitz',
    'Idiom Explorer', 'Tense Master', 'Business English', 'Holiday Review',
  ]
  return `${names[date.getMonth()]} ${themes[date.getMonth()]}`
}

export function getActiveEvents(now = Date.now()): ActiveEvent[] {
  const date = new Date(now)
  const events: ActiveEvent[] = []

  const day = date.getDay()
  if (day === 0 || day === 6) {
    const weekendEnd = new Date(date)
    weekendEnd.setHours(23, 59, 59, 999)
    if (day === 0) weekendEnd.setDate(weekendEnd.getDate())
    else weekendEnd.setDate(weekendEnd.getDate() + (6 - day))
    events.push({
      id: 'weekend_2x',
      title: 'Weekend 2× XP',
      description: 'Earn double XP on Saturday and Sunday.',
      xpMultiplier: 2,
      endsAt: weekendEnd.getTime(),
    })
  }

  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  events.push({
    id: monthChallengeId(date),
    title: monthChallengeTitle(date),
    description: 'Complete daily quests 5 days this month for a special badge.',
    xpMultiplier: 1,
    badgeId: monthChallengeId(date),
    endsAt: monthEnd.getTime(),
  })

  return events
}

export function getCombinedXpMultiplier(now = Date.now()): number {
  return getActiveEvents(now).reduce((acc, e) => Math.max(acc, e.xpMultiplier), 1)
}

export function getTomorrowFocusSkill(seed: Date): string {
  const skills = [
    'Past Perfect', 'Present Perfect', 'Conditionals', 'Phrasal Verbs',
    'Reported Speech', 'Articles', 'Prepositions', 'Listening',
  ]
  const day = seed.getDate() + seed.getMonth() * 31
  return skills[day % skills.length]!
}
