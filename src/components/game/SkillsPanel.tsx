import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'
import { useGameStore, getSkillMastery } from '@/store/useGameStore'
import { SKILL_LABELS, CURRICULUM_UNITS } from '@/types/game'
import type { SkillId } from '@/types/game'
import { MobileSheet } from '@/components/layout/MobileSheet'

interface SkillsPanelProps {
  onClose: () => void
  onPracticeSkill?: (skillId: SkillId) => void
}

function masteryLabel(mastery: number): { text: string; color: string; Icon: typeof TrendingUp } {
  if (mastery < 0) return { text: 'New', color: 'text-slate-400', Icon: Minus }
  if (mastery < 0.5) return { text: 'Weak', color: 'text-rose-500', Icon: TrendingDown }
  if (mastery < 0.75) return { text: 'Building', color: 'text-amber-500', Icon: Minus }
  return { text: 'Strong', color: 'text-emerald-500', Icon: TrendingUp }
}

function MasteryBar({ mastery }: { mastery: number }) {
  const pct = mastery < 0 ? 0 : Math.round(mastery * 100)
  let barColor = 'bg-slate-200'
  if (mastery >= 0.75) barColor = 'bg-emerald-400'
  else if (mastery >= 0.5) barColor = 'bg-amber-400'
  else if (mastery >= 0) barColor = 'bg-rose-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{mastery < 0 ? '—' : `${pct}%`}</span>
    </div>
  )
}

export function SkillsPanel({ onClose, onPracticeSkill }: SkillsPanelProps) {
  const skillStats = useGameStore((s) => s.skillStats)
  const masteryData = useMemo(() => getSkillMastery(skillStats), [skillStats])
  const practisedSkills = masteryData.filter((d) => d.total > 0)
  const unseenCount = Object.keys(SKILL_LABELS).length - practisedSkills.length

  return (
    <MobileSheet title="My Skills" onClose={onClose}>
      <div className="px-5 py-4 flex flex-col gap-4">
        <p className="text-xs text-slate-400">
          {practisedSkills.length} of {Object.keys(SKILL_LABELS).length} skills practised
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Curriculum</p>
          {CURRICULUM_UNITS.map((unit) => {
            const unitSkills = practisedSkills.filter((d) => unit.skills.includes(d.skill))
            const avg =
              unitSkills.length > 0
                ? Math.round((unitSkills.reduce((s, d) => s + Math.max(0, d.mastery), 0) / unit.skills.length) * 100)
                : 0
            return (
              <div key={unit.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  <span>{unit.title}</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{avg}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${avg}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Strong</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Building</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Weak</span>
        </div>

        {practisedSkills.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Complete some questions to see your progress here.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {practisedSkills.map(({ skill, mastery, total }) => {
              const stats = skillStats[skill as SkillId]
              const { text, color, Icon } = masteryLabel(mastery)
              return (
                <div key={skill} className="flex flex-col gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{SKILL_LABELS[skill as SkillId]}</span>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
                      <Icon size={12} />
                      {text}
                    </span>
                  </div>
                  <MasteryBar mastery={mastery} />
                  <p className="text-xs text-slate-400">
                    {stats?.correct ?? 0} correct · {stats?.wrong ?? 0} incorrect · {total} total
                  </p>
                  {onPracticeSkill && (
                    <button
                      onClick={() => { onPracticeSkill(skill as SkillId); onClose() }}
                      className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold text-sm border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
                    >
                      <Zap size={14} />
                      Practice this skill
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {unseenCount > 0 && (
          <p className="text-xs text-slate-300 text-center">
            {unseenCount} more skill{unseenCount !== 1 ? 's' : ''} will appear as you practise
          </p>
        )}
      </div>
    </MobileSheet>
  )
}
