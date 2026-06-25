/** Local notification scheduling for PWA retention loops. */

export interface NotificationPreferences {
  enabled: boolean
  streakAtRisk: boolean
  mistakesDue: boolean
  leaguePressure: boolean
  winBack: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: false,
  streakAtRisk: true,
  mistakesDue: true,
  leaguePressure: true,
  winBack: true,
}

const SCHEDULED_KEY = 'english-notif-scheduled'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function canUseNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

export function showLocalNotification(title: string, body: string, tag?: string): void {
  if (!canUseNotifications()) return
  try {
    new Notification(title, { body, tag, icon: '/favicon.ico' })
  } catch {
    /* ignore */
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    console.warn('SW registration failed', e)
    return null
  }
}

interface ScheduleContext {
  streak: number
  dailyGoalProgress: number
  dailyGoalTarget: number
  dueMistakes: number
  leagueRank: number
  xpBehindNext: number
  streakRiskHour: number
  lastActiveDate: string
}

function msUntilHour(hour: number): number {
  const now = new Date()
  const target = new Date(now)
  target.setHours(hour, 0, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

export function scheduleRetentionNotifications(
  prefs: NotificationPreferences,
  ctx: ScheduleContext,
): void {
  if (!prefs.enabled || !canUseNotifications()) return

  const today = new Date().toDateString()
  const goalMet = ctx.dailyGoalProgress >= ctx.dailyGoalTarget
  const activeToday = ctx.lastActiveDate === today

  if (prefs.streakAtRisk && ctx.streak > 0 && !goalMet) {
    const delay = msUntilHour(ctx.streakRiskHour)
    window.setTimeout(() => {
      if (ctx.dailyGoalProgress < ctx.dailyGoalTarget) {
        showLocalNotification(
          'Streak at risk!',
          `Your ${ctx.streak}-day streak ends tonight. ${ctx.dailyGoalTarget - ctx.dailyGoalProgress} more to go.`,
          'streak-risk',
        )
      }
    }, delay)
  }

  if (prefs.mistakesDue && ctx.dueMistakes > 0 && !activeToday) {
    const morningDelay = msUntilHour(9)
    window.setTimeout(() => {
      showLocalNotification(
        'Mistakes ready to review',
        `${ctx.dueMistakes} mistake${ctx.dueMistakes !== 1 ? 's' : ''} ready — 3 min review.`,
        'mistakes-due',
      )
    }, morningDelay)
  }

  if (prefs.leaguePressure && ctx.leagueRank > 1 && ctx.xpBehindNext > 0) {
    const sunday = new Date()
    if (sunday.getDay() === 0) {
      const eveningDelay = msUntilHour(18)
      window.setTimeout(() => {
        showLocalNotification(
          'League update',
          `You're ${ctx.xpBehindNext} XP from rank #${ctx.leagueRank - 1}!`,
          'league-pressure',
        )
      }, eveningDelay)
    }
  }

  if (prefs.winBack) {
    window.setTimeout(() => {
      const state = localStorage.getItem('english-game-storage')
      if (!state) return
      try {
        const parsed = JSON.parse(state)
        const last = parsed?.state?.userState?.lastActiveDate
        if (last && last !== new Date().toDateString()) {
          showLocalNotification(
            'We miss you!',
            'Your streak freeze is waiting. Come back for a quick session.',
            'win-back',
          )
        }
      } catch {
        /* ignore */
      }
    }, 48 * 60 * 60 * 1000)
  }

  localStorage.setItem(SCHEDULED_KEY, new Date().toISOString())
}

export function rescheduleNotifications(
  prefs: NotificationPreferences,
  ctx: ScheduleContext,
): void {
  scheduleRetentionNotifications(prefs, ctx)
}
