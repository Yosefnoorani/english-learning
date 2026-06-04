import { useState } from 'react'
import { Flame, BookOpen, RotateCcw, BarChart2, ClipboardList, Library } from 'lucide-react'
import { useGameStore, selectLevelLabel } from '@/store/useGameStore'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { SkillsPanel } from '@/components/game/SkillsPanel'
import { ResourcesPanel } from '@/components/game/ResourcesPanel'

interface DashboardProps {
  onOpenJournal?: () => void
}

export function Dashboard({ onOpenJournal }: DashboardProps) {
  const userState = useGameStore((s) => s.userState)
  const phase = useGameStore((s) => s.phase)
  const mistakeReviewMode = useGameStore((s) => s.mistakeReviewMode)
  const toggleMistakeReview = useGameStore((s) => s.toggleMistakeReview)
  const levelLabel = useGameStore(selectLevelLabel)

  const [showSkills, setShowSkills] = useState(false)
  const [showResources, setShowResources] = useState(false)

  const goalPercent = Math.round(
    (userState.dailyGoalProgress / userState.dailyGoalTarget) * 100,
  )

  return (
    <>
      <header className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="w-full max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Level badge */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Level</span>
            <span className="text-sm font-bold text-indigo-700 truncate">{levelLabel}</span>
            <span className="text-xs text-slate-400">Rating {userState.rating}</span>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1.5 bg-orange-50 rounded-xl px-3 py-2">
            <Flame size={18} className="text-orange-500 flex-shrink-0" />
            <span className="text-sm font-bold text-orange-600">{userState.streak}</span>
          </div>

          {/* Daily goal ring */}
          <div className="flex flex-col items-center">
            <ProgressRing progress={goalPercent} size={52} strokeWidth={5} color="#10b981" trackColor="#d1fae5">
              <span className="text-[10px] font-bold text-emerald-700">{goalPercent}%</span>
            </ProgressRing>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {userState.dailyGoalProgress}/{userState.dailyGoalTarget}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-end min-w-0">
            <span className="text-xs text-slate-400">Score</span>
            <span className="text-sm font-bold text-slate-700">{userState.score}</span>
          </div>

          {phase !== 'placement' && (
            <div className="flex items-center gap-1">
              {/* Skills panel */}
              <button
                onClick={() => setShowSkills(true)}
                aria-label="My skills"
                className="p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <BarChart2 size={18} />
              </button>

              {/* Mistake journal */}
              {onOpenJournal && (
                <button
                  onClick={onOpenJournal}
                  aria-label="Mistake journal"
                  className="p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                >
                  <ClipboardList size={18} />
                </button>
              )}

              {/* Resources */}
              <button
                onClick={() => setShowResources(true)}
                aria-label="Recommended resources"
                className="p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
              >
                <Library size={18} />
              </button>

              {/* Review toggle */}
              <button
                onClick={() => toggleMistakeReview()}
                aria-label={mistakeReviewMode ? 'Exit review' : 'Mistake review'}
                className={`p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  mistakeReviewMode
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {mistakeReviewMode ? <BookOpen size={18} /> : <RotateCcw size={18} />}
              </button>
            </div>
          )}
        </div>
      </header>

      {showSkills && <SkillsPanel onClose={() => setShowSkills(false)} />}
      {showResources && <ResourcesPanel levelLabel={levelLabel} onClose={() => setShowResources(false)} />}
    </>
  )
}
