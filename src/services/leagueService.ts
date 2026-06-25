/** Weekly league — Supabase when available, personal-best fallback offline. */

import { supabase } from '@/services/supabaseClient'

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'sapphire' | 'ruby' | 'diamond'

export const LEAGUE_TIERS: LeagueTier[] = ['bronze', 'silver', 'gold', 'sapphire', 'ruby', 'diamond']

export interface LeagueState {
  leagueTier: LeagueTier
  weeklyXp: number
  weekStartDate: string
  personalBestWeeklyXp: number
  leagueRank: number
  leagueSize: number
  promotedLastWeek: boolean | null
}

export interface LeagueMember {
  name: string
  weeklyXp: number
  isUser: boolean
}

const BOT_NAMES = [
  'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn',
  'Avery', 'Blake', 'Drew', 'Jamie', 'Skyler', 'Reese', 'Parker', 'Hayden',
  'Logan', 'Finley', 'Rowan', 'Emery', 'Sage', 'River', 'Phoenix', 'Dakota',
  'Charlie', 'Frankie', 'Jessie', 'Kai', 'Lane', 'Micah',
]

function weekStartStr(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toDateString()
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export function getCurrentWeekStart(date = new Date()): string {
  return weekStartStr(date)
}

export function isSundayEvening(date = new Date()): boolean {
  return date.getDay() === 0 && date.getHours() >= 18
}

export function createInitialLeagueState(): LeagueState {
  return {
    leagueTier: 'bronze',
    weeklyXp: 0,
    weekStartDate: getCurrentWeekStart(),
    personalBestWeeklyXp: 0,
    leagueRank: 15,
    leagueSize: 30,
    promotedLastWeek: null,
  }
}

export function resetWeeklyLeagueIfNeeded(state: LeagueState, now = new Date()): LeagueState {
  const currentWeek = getCurrentWeekStart(now)
  if (state.weekStartDate === currentWeek) return state

  const promoted = state.leagueRank <= 10
  const demoted = state.leagueRank > 20
  let tierIdx = LEAGUE_TIERS.indexOf(state.leagueTier)
  if (promoted && tierIdx < LEAGUE_TIERS.length - 1) tierIdx += 1
  if (demoted && tierIdx > 0) tierIdx -= 1

  const personalBest = Math.max(state.personalBestWeeklyXp, state.weeklyXp)

  return {
    leagueTier: LEAGUE_TIERS[tierIdx]!,
    weeklyXp: 0,
    weekStartDate: currentWeek,
    personalBestWeeklyXp: personalBest,
    leagueRank: 15,
    leagueSize: 30,
    promotedLastWeek: promoted ? true : demoted ? false : null,
  }
}

export function buildOfflineLeaderboard(
  userXp: number,
  weekStart: string,
): { members: LeagueMember[]; userRank: number } {
  const seed = weekStart.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rand = seededRandom(seed)
  const members: LeagueMember[] = BOT_NAMES.slice(0, 29).map((name, i) => ({
    name,
    weeklyXp: Math.floor(20 + rand() * 180 + i * 2),
    isUser: false,
  }))
  members.push({ name: 'You', weeklyXp: userXp, isUser: true })
  members.sort((a, b) => b.weeklyXp - a.weeklyXp)
  const userRank = members.findIndex((m) => m.isUser) + 1
  return { members, userRank }
}

export async function syncLeagueXp(weeklyXp: number): Promise<void> {
  if (!supabase) return
  try {
    await supabase.rpc('upsert_league_xp', {
      p_user_id: 'anonymous',
      p_weekly_xp: weeklyXp,
    })
  } catch {
    /* offline fallback */
  }
}

export function xpToNextRank(members: LeagueMember[], userRank: number): number {
  if (userRank <= 1) return 0
  const above = members[userRank - 2]
  const user = members[userRank - 1]
  if (!above || !user) return 0
  return Math.max(0, above.weeklyXp - user.weeklyXp + 1)
}

export function leagueTierLabel(tier: LeagueTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}
