import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  fullWidth?: boolean
}

export function PrimaryButton({ children, fullWidth = true, className = '', disabled, ...props }: PrimaryButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`${fullWidth ? 'w-full' : ''} min-h-[52px] rounded-xl font-bold text-base transition-all focus-visible:ring-2 focus-visible:ring-indigo-400 active:scale-[0.98] ${
        disabled
          ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          : 'bg-indigo-600 text-white shadow-md active:bg-indigo-700 hover:bg-indigo-700'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
