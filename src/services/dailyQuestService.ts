export interface DailyQuest {
  id: string
  label: string
  target: number
  metric:
    | 'session_questions'
    | 'session_correct'
    | 'mistakes_reviewed'
    | 'listening_count'
    | 'session_combo'
    | 'shadowing_count'
    | 'perfect_streak'
  isBonus?: boolean
  gemReward: number
}

const QUEST_POOL: DailyQuest[] = [
  { id: 'session_10', label: 'Complete a 10-question session', target: 10, metric: 'session_questions', gemReward: 10 },
  { id: 'review_3', label: 'Review 3 due mistakes', target: 3, metric: 'mistakes_reviewed', gemReward: 10 },
  { id: 'listening_2', label: 'Practice 2 listening exercises', target: 2, metric: 'listening_count', gemReward: 8 },
  { id: 'session_5', label: 'Answer 5 questions correctly', target: 5, metric: 'session_correct', gemReward: 5 },
  { id: 'combo_5', label: 'Reach a ×5 combo in one session', target: 5, metric: 'session_combo', gemReward: 12 },
  { id: 'shadowing_1', label: 'Complete 1 shadowing exercise', target: 1, metric: 'shadowing_count', gemReward: 8 },
  { id: 'perfect_5', label: 'Get 5 correct in a row', target: 5, metric: 'perfect_streak', gemReward: 15 },
]

const BONUS_QUEST: DailyQuest = {
  id: 'bonus_all',
  label: 'Complete 2 other quests to unlock bonus',
  target: 2,
  metric: 'session_correct',
  isBonus: true,
  gemReward: 25,
}

function daySeed(date: Date): number {
  return date.getFullYear() * 1000 + date.getMonth() * 50 + date.getDate()
}

export function getDailyQuests(date = new Date(), includeAudioQuestions = true): DailyQuest[] {
  const seed = daySeed(date)
  const indices = [0, 1, 2].map((i) => (seed + i * 7) % QUEST_POOL.length)
  const unique = [...new Set(indices)]
  while (unique.length < 3) {
    unique.push((unique[unique.length - 1]! + 1) % QUEST_POOL.length)
  }
  const standard = unique.slice(0, 3).map((i) => QUEST_POOL[i]!)
  const filtered = includeAudioQuestions
    ? standard
    : standard.filter((q) => q.metric !== 'listening_count' && q.metric !== 'shadowing_count')
  return [...filtered, BONUS_QUEST]
}

export function getStandardQuests(date = new Date(), includeAudioQuestions = true): DailyQuest[] {
  return getDailyQuests(date, includeAudioQuestions).filter((q) => !q.isBonus)
}

export function isBonusQuestUnlocked(
  quests: DailyQuest[],
  progress: Record<string, number>,
): boolean {
  const standard = quests.filter((q) => !q.isBonus)
  const completedStandard = standard.filter((q) => isQuestComplete(q, progress)).length
  return completedStandard >= 2
}

export function isQuestComplete(
  quest: DailyQuest,
  progress: Record<string, number>,
): boolean {
  if (quest.isBonus) return (progress[quest.id] ?? 0) >= 1
  return (progress[quest.id] ?? 0) >= quest.target
}

export function allQuestsComplete(quests: DailyQuest[], progress: Record<string, number>): boolean {
  const standard = quests.filter((q) => !q.isBonus)
  return standard.every((q) => isQuestComplete(q, progress))
}

export function allQuestsIncludingBonusComplete(
  quests: DailyQuest[],
  progress: Record<string, number>,
): boolean {
  if (!allQuestsComplete(quests, progress)) return false
  if (!isBonusQuestUnlocked(quests, progress)) return false
  const bonus = quests.find((q) => q.isBonus)
  return bonus ? isQuestComplete(bonus, progress) : true
}

export function updateQuestProgressForAnswer(opts: {
  quest: DailyQuest
  progress: Record<string, number>
  isCorrect: boolean
  sessionCombo: number
  itemType: string
  itemTags: string[]
  mistakeReviewMode: boolean
  wasDueMistake: boolean
  includeAudioQuestions: boolean
  bonusUnlocked: boolean
}): Record<string, number> {
  const next = { ...opts.progress }
  const { quest } = opts

  if (quest.isBonus) {
    if (opts.bonusUnlocked && opts.isCorrect) {
      next[quest.id] = 1
    }
    return next
  }

  if (quest.metric === 'session_questions') {
    next[quest.id] = (next[quest.id] ?? 0) + 1
  }
  if (quest.metric === 'session_correct' && opts.isCorrect) {
    next[quest.id] = (next[quest.id] ?? 0) + 1
  }
  if (
    quest.metric === 'listening_count' &&
    opts.itemType === 'listening_dictation' &&
    opts.includeAudioQuestions &&
    !opts.itemTags.includes('shadowing')
  ) {
    next[quest.id] = (next[quest.id] ?? 0) + 1
  }
  if (
    quest.metric === 'shadowing_count' &&
    opts.itemType === 'listening_dictation' &&
    opts.itemTags.includes('shadowing')
  ) {
    next[quest.id] = (next[quest.id] ?? 0) + 1
  }
  if (
    quest.metric === 'mistakes_reviewed' &&
    opts.isCorrect &&
    (opts.mistakeReviewMode || opts.wasDueMistake)
  ) {
    next[quest.id] = (next[quest.id] ?? 0) + 1
  }
  if (quest.metric === 'session_combo') {
    next[quest.id] = Math.max(next[quest.id] ?? 0, opts.sessionCombo)
  }
  if (quest.metric === 'perfect_streak' && opts.isCorrect) {
    next[quest.id] = Math.max(next[quest.id] ?? 0, opts.sessionCombo)
  }

  return next
}
