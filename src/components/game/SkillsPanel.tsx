import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore, selectSkillMastery } from '@/store/useGameStore'
import { SKILL_LABELS } from '@/types/game'
import type { SkillId } from '@/types/game'

interface SkillsPanelProps {
  onClose: () => void
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
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{mastery < 0 ? '—' : `${pct}%`}</span>
    </div>
  )
}

export function SkillsPanel({ onClose }: SkillsPanelProps) {
  const masteryData = useGameStore(useShallow(selectSkillMastery))
  const skillStats = useGameStore((s) => s.skillStats)

  // Show all skills that have been seen + all with data
  const practisedSkills = masteryData.filter((d) => d.total > 0)
  const unseenCount = Object.keys(SKILL_LABELS).length - practisedSkills.length

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">My Skills</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {practisedSkills.length} of {Object.keys(SKILL_LABELS).length} skills practised
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Legend */}
        <div className="px-5 pt-3 pb-2 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Strong (≥75%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Building (≥50%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Weak (&lt;50%)</span>
        </div>

        {/* Skills list */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {practisedSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-slate-400 text-sm">No skills practised yet.</p>
              <p className="text-slate-300 text-xs mt-1">Complete some questions to see your progress here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-2">
              {practisedSkills.map(({ skill, mastery, total }) => {
                const stats = skillStats[skill as SkillId]
                const { text, color, Icon } = masteryLabel(mastery)
                return (
                  <div key={skill} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
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
                  </div>
                )
              })}
            </div>
          )}

          {unseenCount > 0 && (
            <p className="text-xs text-slate-300 text-center mt-6">
              {unseenCount} more skill{unseenCount !== 1 ? 's' : ''} will appear as you practise
            </p>
          )}
        </div>
      </div>
    </>
  )
}
