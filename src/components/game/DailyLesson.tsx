import { CalendarDays, Zap } from 'lucide-react'
import type { SkillId, SkillStats } from '@/types/game'
import { SKILL_LABELS } from '@/types/game'
import { getAllContent } from '@/services/contentService'

interface DailyLessonProps {
  skillStats: Record<SkillId, SkillStats>
  rating: number
  onStartLesson: (skillId: SkillId) => void
}

const ALL_SKILL_IDS = Object.keys(SKILL_LABELS) as SkillId[]

/** Deterministic daily skill based on date + rotation, with weak-skill bias */
export function getDailySkill(skillStats: Record<SkillId, SkillStats>, rating: number): SkillId {
  // Weak skills the user has practised
  const weakSkills = (Object.entries(skillStats) as [SkillId, SkillStats][])
    .filter(([, s]) => s.correct + s.wrong >= 2 && s.correct / (s.correct + s.wrong) < 0.7)
    .map(([skill]) => skill)

  // Use date as rotation seed
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)

  if (weakSkills.length > 0) {
    return weakSkills[dayOfYear % weakSkills.length]
  }

  // Rotate through relevant skill list by difficulty/rating
  const relevantSkills = ALL_SKILL_IDS.filter((s) => {
    const items = getAllContent().filter((i) => i.skill === s && i.type !== 'placement_test')
    const avg = items.reduce((sum, i) => sum + i.difficulty, 0) / (items.length || 1)
    return Math.abs(avg - rating) < 150
  })

  const pool = relevantSkills.length > 0 ? relevantSkills : ALL_SKILL_IDS
  return pool[dayOfYear % pool.length]
}

export function DailyLesson({ skillStats, rating, onStartLesson }: DailyLessonProps) {
  const todaySkill = getDailySkill(skillStats, rating)
  const skillName = SKILL_LABELS[todaySkill]

  // Count available items for this skill
  const itemCount = getAllContent().filter(
    (i) => i.skill === todaySkill && i.type !== 'placement_test',
  ).length

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5 shadow-lg cursor-pointer hover:shadow-xl transition-shadow active:scale-[0.98]"
      onClick={() => onStartLesson(todaySkill)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold">
          <CalendarDays size={14} />
          <span>Today's Focus · {dateStr}</span>
        </div>
        <div className="bg-white/20 rounded-lg px-2 py-0.5 text-white text-xs font-bold">
          {itemCount} questions
        </div>
      </div>

      <p className="text-white font-bold text-xl leading-tight">{skillName}</p>
      <p className="text-indigo-200 text-sm mt-1">
        Targeted practice for today's recommended skill
      </p>

      <button className="mt-4 flex items-center gap-2 bg-white text-indigo-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors">
        <Zap size={15} />
        Start lesson
      </button>
    </div>
  )
}
