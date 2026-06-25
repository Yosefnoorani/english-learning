import { Lock, CheckCircle2, Map } from 'lucide-react'
import { useGameStore, selectLevelLabel } from '@/store/useGameStore'
import { CURRICULUM_UNITS } from '@/types/game'
import { xpProgressInLevel } from '@/services/rewardService'
import { MobileSheet } from '@/components/layout/MobileSheet'

interface UnitMapProps {
  onClose: () => void
  onStartUnit?: (unitId: string) => void
}

export function UnitMap({ onClose, onStartUnit }: UnitMapProps) {
  const xp = useGameStore((s) => s.userState.xp)
  const currentTier = useGameStore((s) => s.currentTier)
  const unitsCompleted = useGameStore((s) => s.unitsCompleted)
  const levelLabel = useGameStore(selectLevelLabel)
  const { level, percent } = xpProgressInLevel(xp)

  return (
    <MobileSheet title="Learning Journey" onClose={onClose}>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 p-4">
          <Map size={24} className="text-indigo-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{levelLabel}</p>
            <p className="text-xs text-slate-500">XP Level {level} · {percent}% to next</p>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {CURRICULUM_UNITS.map((unit, idx) => {
            const requiredTier = idx + 1
            const unlocked = currentTier >= requiredTier || unitsCompleted.includes(unit.id)
            const completed = unitsCompleted.includes(unit.id)

            return (
              <li
                key={unit.id}
                className={`rounded-2xl border p-4 flex items-start gap-3 ${
                  completed
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : unlocked
                      ? 'border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 opacity-60'
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                  {completed ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : unlocked ? (
                    <span className="text-lg font-bold text-indigo-600">{idx + 1}</span>
                  ) : (
                    <Lock size={16} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{unit.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {unit.skills.length} skills · Tier {requiredTier}+
                  </p>
                  {!unlocked && (
                    <p className="text-[10px] text-slate-400 mt-1">Reach tier {requiredTier} to unlock</p>
                  )}
                  {unlocked && !completed && onStartUnit && (
                    <button
                      type="button"
                      onClick={() => onStartUnit(unit.id)}
                      className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Start unit →
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </MobileSheet>
  )
}
