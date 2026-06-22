export interface DailyQuest {
  id: string
  label: string
  target: number
  metric: 'session_questions' | 'mistakes_reviewed' | 'listening_count'
}

const QUEST_POOL: DailyQuest[] = [
  { id: 'session_10', label: 'Complete a 10-question session', target: 10, metric: 'session_questions' },
  { id: 'review_3', label: 'Review 3 due mistakes', target: 3, metric: 'mistakes_reviewed' },
  { id: 'listening_2', label: 'Practice 2 listening exercises', target: 2, metric: 'listening_count' },
  { id: 'session_5', label: 'Answer 5 questions correctly', target: 5, metric: 'session_questions' },
]

function daySeed(date: Date): number {
  return date.getFullYear() * 1000 + date.getMonth() * 50 + date.getDate()
}

export function getDailyQuests(date = new Date(), includeAudioQuestions = true): DailyQuest[] {
  const seed = daySeed(date)
  const indices = [0, 1, 2].map((i) => (seed + i * 7) % QUEST_POOL.length)
  const unique = [...new Set(indices)]
  while (unique.length < 3) {
    unique.push((unique[unique.length - 1] + 1) % QUEST_POOL.length)
  }
  const quests = unique.slice(0, 3).map((i) => QUEST_POOL[i])
  if (includeAudioQuestions) return quests
  return quests.filter((q) => q.metric !== 'listening_count')
}

export function isQuestComplete(
  quest: DailyQuest,
  progress: Record<string, number>,
): boolean {
  return (progress[quest.id] ?? 0) >= quest.target
}

export function allQuestsComplete(quests: DailyQuest[], progress: Record<string, number>): boolean {
  return quests.every((q) => isQuestComplete(q, progress))
}
