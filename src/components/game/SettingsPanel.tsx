import type { ReactNode } from 'react'
import { useState } from 'react'
import { Sun, Moon, Monitor, Volume2, Target, AlertTriangle, Download, BookOpen, ClipboardList, Sparkles, Lock, Gem, Bell, Trophy } from 'lucide-react'
import { MobileSheet } from '@/components/layout/MobileSheet'
import { useGameStore } from '@/store/useGameStore'
import type { AppTheme, SessionMode } from '@/types/game'
import { downloadContentJson } from '@/services/contentService'
import { getTierLabel, MIN_TIER, MAX_TIER } from '@/services/adaptiveProgressionService'
import { AddContentPanel } from '@/components/game/AddContentPanel'
import { STREAK_FREEZE_GEM_COST, DOUBLE_XP_GEM_COST } from '@/services/rewardService'
import { requestNotificationPermission } from '@/services/notificationService'

interface SettingsPanelProps {
  onClose: () => void
  onShowOnboarding?: () => void
  onShowAchievements?: () => void
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
      }`}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function SettingsPanel({ onClose, onShowOnboarding, onShowAchievements }: SettingsPanelProps) {
  const theme = useGameStore((s) => s.theme)
  const sessionMode = useGameStore((s) => s.sessionMode)
  const sounds = useGameStore((s) => s.sounds)
  const haptics = useGameStore((s) => s.haptics)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const voiceLang = useGameStore((s) => s.voiceLang)
  const voiceRate = useGameStore((s) => s.voiceRate)
  const dailyGoalTarget = useGameStore((s) => s.userState.dailyGoalTarget)
  const gems = useGameStore((s) => s.userState.gems)
  const xp = useGameStore((s) => s.userState.xp)
  const currentTier = useGameStore((s) => s.currentTier)
  const practiceTier = useGameStore((s) => s.practiceTier)
  const highestTierReached = useGameStore((s) => s.highestTierReached)
  const notificationPreferences = useGameStore((s) => s.notificationPreferences)

  const setTheme = useGameStore((s) => s.setTheme)
  const setSessionMode = useGameStore((s) => s.setSessionMode)
  const setSounds = useGameStore((s) => s.setSounds)
  const setHaptics = useGameStore((s) => s.setHaptics)
  const setReducedMotion = useGameStore((s) => s.setReducedMotion)
  const setVoice = useGameStore((s) => s.setVoice)
  const includeAudioQuestions = useGameStore((s) => s.includeAudioQuestions)
  const setIncludeAudioQuestions = useGameStore((s) => s.setIncludeAudioQuestions)
  const detailedFeedback = useGameStore((s) => s.detailedFeedback)
  const setDetailedFeedback = useGameStore((s) => s.setDetailedFeedback)
  const setDailyGoalTarget = useGameStore((s) => s.setDailyGoalTarget)
  const setPracticeTier = useGameStore((s) => s.setPracticeTier)
  const resetProgress = useGameStore((s) => s.resetProgress)
  const startPlacement = useGameStore((s) => s.startPlacement)
  const buyStreakFreeze = useGameStore((s) => s.buyStreakFreeze)
  const buyDoubleXp = useGameStore((s) => s.buyDoubleXp)
  const setNotificationPreferences = useGameStore((s) => s.setNotificationPreferences)

  const [confirmReset, setConfirmReset] = useState(false)
  const [showAddContent, setShowAddContent] = useState(false)

  const allTiers = Array.from({ length: MAX_TIER - MIN_TIER + 1 }, (_, i) => MIN_TIER + i)

  async function handleStartPlacement() {
    onClose()
    await startPlacement()
  }

  const themeOptions: { id: AppTheme; label: string; icon: ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun size={16} /> },
    { id: 'system', label: 'System', icon: <Monitor size={16} /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  ]

  const sessionOptions: { id: SessionMode; label: string; desc: string }[] = [
    { id: 'quick', label: 'Quick', desc: '5 Q' },
    { id: 'standard', label: 'Standard', desc: '10 Q' },
    { id: 'deep', label: 'Deep', desc: '20 Q' },
  ]

  const goalOptions = [5, 10, 15, 20]

  return (
    <>
      <MobileSheet title="Settings" onClose={onClose}>
        <div className="px-5 py-4 flex flex-col gap-6">
          {/* Theme */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Appearance</h3>
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all min-h-[60px] ${
                    theme === opt.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Session mode */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Default Session Length</h3>
            <div className="flex gap-2">
              {sessionOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSessionMode(opt.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all min-h-[60px] ${
                    sessionMode === opt.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="text-[10px] font-semibold">{opt.desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Daily goal */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              <Target size={12} className="inline mr-1" />
              Daily Goal (correct answers)
            </h3>
            <div className="flex gap-2">
              {goalOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setDailyGoalTarget(n)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all min-h-[44px] ${
                    dailyGoalTarget === n
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>

          {/* Gems shop */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Gem size={12} className="text-violet-500" />
              Gems · {gems} · {xp} XP
            </h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => buyStreakFreeze()}
                className="w-full py-3 px-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 text-sm font-semibold text-left min-h-[44px]"
              >
                Streak freeze · {STREAK_FREEZE_GEM_COST} gems
              </button>
              <button
                type="button"
                onClick={() => buyDoubleXp()}
                className="w-full py-3 px-4 rounded-xl border-2 border-violet-200 dark:border-violet-800 text-sm font-semibold text-left min-h-[44px]"
              >
                15-min 2× XP boost · {DOUBLE_XP_GEM_COST} gems
              </button>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Bell size={12} />
              Reminders
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Push notifications</p>
                  <p className="text-xs text-slate-400">Streak alerts, mistakes due, league updates</p>
                </div>
                <Toggle
                  checked={notificationPreferences.enabled}
                  onChange={async (v) => {
                    if (v) {
                      const ok = await requestNotificationPermission()
                      setNotificationPreferences({ enabled: ok })
                    } else {
                      setNotificationPreferences({ enabled: false })
                    }
                  }}
                  label="Push notifications"
                />
              </div>
            </div>
          </section>

          {onShowAchievements && (
            <section>
              <button
                type="button"
                onClick={() => { onClose(); onShowAchievements() }}
                className="w-full py-3 px-4 rounded-xl border-2 border-amber-200 dark:border-amber-800 text-sm font-semibold flex items-center gap-2 min-h-[44px]"
              >
                <Trophy size={16} className="text-amber-500" />
                View achievements gallery
              </button>
            </section>
          )}

          {/* Practice level */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Practice Level</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Your level: <span className="font-semibold">{getTierLabel(currentTier)}</span>
              {practiceTier !== currentTier && (
                <> · Practising: <span className="font-semibold text-amber-600 dark:text-amber-400">{getTierLabel(practiceTier)}</span></>
              )}
            </p>
            <div className="flex flex-col gap-2">
              {allTiers.map((tier) => {
                const isLocked = tier > highestTierReached
                const isCurrent = tier === currentTier
                const isSelected = tier === practiceTier
                return (
                  <button
                    key={tier}
                    disabled={isLocked}
                    title={isLocked ? 'Reach this level to unlock' : undefined}
                    onClick={() => setPracticeTier(tier)}
                    className={`w-full py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all min-h-[44px] text-left flex items-center justify-between gap-2 ${
                      isLocked
                        ? 'border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60'
                        : isSelected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span>
                      T{tier} · {getTierLabel(tier)}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                          Your level
                        </span>
                      )}
                      {isLocked && <Lock size={14} className="text-slate-400" aria-hidden />}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Choose any level you&apos;ve reached. Locked levels unlock when you promote.
            </p>
          </section>

          {/* Audio */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              <Volume2 size={12} className="inline mr-1" />
              Audio
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sound effects</p>
                  <p className="text-xs text-slate-400">Tones on correct / wrong answers</p>
                </div>
                <Toggle checked={sounds} onChange={setSounds} label="Sound effects" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Haptic feedback</p>
                  <p className="text-xs text-slate-400">Vibration on answers (mobile)</p>
                </div>
                <Toggle checked={haptics} onChange={setHaptics} label="Haptic feedback" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detailed feedback</p>
                  <p className="text-xs text-slate-400">Show diff + Hebrew explanations after wrong answers</p>
                </div>
                <Toggle checked={detailedFeedback} onChange={setDetailedFeedback} label="Detailed feedback" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Listening &amp; speaking exercises</p>
                  <p className="text-xs text-slate-400">Dictation and shadowing questions in practice</p>
                </div>
                <Toggle
                  checked={includeAudioQuestions}
                  onChange={setIncludeAudioQuestions}
                  label="Listening and speaking exercises"
                />
              </div>

              {/* Voice accent */}
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Voice accent</p>
                <div className="flex gap-2">
                  {(['en-GB', 'en-US'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setVoice(lang, voiceRate)}
                      className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all min-h-[40px] ${
                        voiceLang === lang
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {lang === 'en-GB' ? '🇬🇧 British' : '🇺🇸 American'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice speed */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reading speed</p>
                  <span className="text-xs text-slate-400 font-mono">{voiceRate.toFixed(1)}×</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={voiceRate}
                  onChange={(e) => setVoice(voiceLang, parseFloat(e.target.value))}
                  className="w-full accent-sky-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Slow</span><span>Normal</span><span>Fast</span>
                </div>
              </div>
            </div>
          </section>

          {/* Learning tools */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Learning</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowAddContent(true)}
                className="w-full flex items-center gap-2 py-3 px-4 rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 text-sm font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors min-h-[44px]"
              >
                <Sparkles size={16} className="text-violet-500" />
                הוסף מילים ומשפטים (Gemini)
              </button>
              <button
                onClick={handleStartPlacement}
                className="w-full flex items-center gap-2 py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-300 transition-colors min-h-[44px]"
              >
                <ClipboardList size={16} className="text-indigo-500" />
                Run Placement Test
              </button>
              {onShowOnboarding && (
                <button
                  onClick={onShowOnboarding}
                  className="w-full flex items-center gap-2 py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-300 transition-colors min-h-[44px]"
                >
                  <BookOpen size={16} className="text-indigo-500" />
                  Show intro tour
                </button>
              )}
              <button
                onClick={() => downloadContentJson()}
                className="w-full flex items-center gap-2 py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-300 transition-colors min-h-[44px]"
              >
                <Download size={16} className="text-emerald-500" />
                Export content.json
              </button>
              <button
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = '/feedback.json'
                  a.download = 'feedback.json'
                  a.click()
                }}
                className="w-full flex items-center gap-2 py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-300 transition-colors min-h-[44px]"
              >
                <Download size={16} className="text-violet-500" />
                Export feedback.json
              </button>
            </div>
          </section>

          {/* Accessibility */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Accessibility</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reduce motion</p>
                <p className="text-xs text-slate-400">Disables flip & slide animations</p>
              </div>
              <Toggle checked={reducedMotion} onChange={setReducedMotion} label="Reduce motion" />
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              <AlertTriangle size={12} className="inline mr-1 text-rose-400" />
              Danger Zone
            </h3>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-3 rounded-xl border-2 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors min-h-[44px]"
              >
                Reset all progress
              </button>
            ) : (
              <div className="rounded-xl border-2 border-rose-300 dark:border-rose-800 p-4 flex flex-col gap-3">
                <p className="text-sm text-rose-700 dark:text-rose-300 font-semibold">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { resetProgress(); onClose() }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold min-h-[44px] hover:bg-rose-700 transition-colors"
                  >
                    Yes, reset
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </MobileSheet>

      {showAddContent && (
        <AddContentPanel onClose={() => setShowAddContent(false)} />
      )}
    </>
  )
}
