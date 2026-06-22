import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { SideNav } from './SideNav'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { PracticeHeader } from './PracticeHeader'

type NavView = 'practice' | 'skills' | 'journal' | 'resources' | 'settings'

interface AppShellProps {
  activeView: NavView
  onNavigate: (view: NavView) => void
  onOpenSettings: () => void
  inPracticeSession?: boolean
  children: ReactNode
}

export function AppShell({ activeView, onNavigate, onOpenSettings, inPracticeSession = false, children }: AppShellProps) {
  const theme = useGameStore((s) => s.theme)
  const reducedMotion = useGameStore((s) => s.reducedMotion)

  // Apply theme + reduced-motion to <html>
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark')
    } else if (theme === 'light') {
      html.removeAttribute('data-theme')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) html.setAttribute('data-theme', 'dark')
      else html.removeAttribute('data-theme')
    }

    if (reducedMotion) html.classList.add('motion-reduce')
    else html.classList.remove('motion-reduce')

    const themeMeta = document.getElementById('theme-color-meta') as HTMLMetaElement | null
    if (themeMeta) {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      themeMeta.content = isDark ? '#0f172a' : '#6366f1'
    }
  }, [theme, reducedMotion])

  // Also listen for system preference changes when theme = 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) document.documentElement.setAttribute('data-theme', 'dark')
      else document.documentElement.removeAttribute('data-theme')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return (
    <div className="min-h-svh flex bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <SideNav activeView={activeView} onNavigate={onNavigate} />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        {inPracticeSession ? (
          <PracticeHeader onOpenSettings={onOpenSettings} />
        ) : (
          <TopBar onOpenSettings={onOpenSettings} />
        )}

        {/* Page content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav activeView={activeView} onNavigate={onNavigate} />
    </div>
  )
}
