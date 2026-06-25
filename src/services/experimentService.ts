/** Lightweight A/B experiment assignment and telemetry hooks. */

export type ExperimentId =
  | 'streak_risk_hour'
  | 'session_summary_cta'
  | 'quest_gem_amount'

export type ExperimentVariant = string

const STORAGE_KEY = 'english-experiments-v1'

const DEFAULTS: Record<ExperimentId, ExperimentVariant[]> = {
  streak_risk_hour: ['20', '21'],
  session_summary_cta: ['continue', 'done'],
  quest_gem_amount: ['standard', 'generous'],
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return Math.abs(h)
}

function stableVariant(experimentId: ExperimentId, userSeed: string): ExperimentVariant {
  const variants = DEFAULTS[experimentId]
  const idx = hashString(`${experimentId}:${userSeed}`) % variants.length
  return variants[idx]!
}

export function loadExperiments(userSeed: string): Record<ExperimentId, ExperimentVariant> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>
      return {
        streak_risk_hour: parsed.streak_risk_hour ?? stableVariant('streak_risk_hour', userSeed),
        session_summary_cta: parsed.session_summary_cta ?? stableVariant('session_summary_cta', userSeed),
        quest_gem_amount: parsed.quest_gem_amount ?? stableVariant('quest_gem_amount', userSeed),
      }
    }
  } catch {
    /* ignore */
  }
  const assigned = {
    streak_risk_hour: stableVariant('streak_risk_hour', userSeed),
    session_summary_cta: stableVariant('session_summary_cta', userSeed),
    quest_gem_amount: stableVariant('quest_gem_amount', userSeed),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assigned))
  return assigned
}

export function getStreakRiskHour(experiments: Record<string, string>): number {
  const v = experiments.streak_risk_hour ?? '20'
  return parseInt(v, 10) || 20
}

export function getQuestGemMultiplier(experiments: Record<string, string>): number {
  return experiments.quest_gem_amount === 'generous' ? 1.5 : 1
}

export function shouldDefaultContinueCta(experiments: Record<string, string>): boolean {
  return (experiments.session_summary_cta ?? 'continue') === 'continue'
}

export interface ExperimentEvent {
  experimentId: ExperimentId
  variant: ExperimentVariant
  event: string
  payload?: Record<string, unknown>
}

export function logExperimentEvent(event: ExperimentEvent): void {
  console.debug('[experiment]', event)
}
