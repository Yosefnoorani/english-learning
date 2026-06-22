import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  iconOnly?: boolean
  variant?: 'default' | 'amber'
}

export function SecondaryButton({
  children,
  iconOnly = false,
  variant = 'default',
  className = '',
  disabled,
  ...props
}: SecondaryButtonProps) {
  const colors =
    variant === 'amber'
      ? disabled
        ? 'border-slate-200 dark:border-slate-600 text-slate-300 cursor-not-allowed'
        : 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
      : disabled
        ? 'border-slate-200 dark:border-slate-600 text-slate-300 cursor-not-allowed'
        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'

  return (
    <button
      disabled={disabled}
      className={`flex items-center justify-center gap-2 border-2 rounded-xl font-semibold text-sm transition-all focus-visible:ring-2 focus-visible:ring-indigo-400 min-h-[52px] ${
        iconOnly ? 'px-4' : 'px-4 flex-1'
      } ${colors} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
