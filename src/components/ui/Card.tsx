import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-md md:shadow-lg p-4 md:p-5 ${className}`}>
      {children}
    </div>
  )
}
