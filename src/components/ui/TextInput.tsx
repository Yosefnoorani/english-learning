import { forwardRef } from 'react'

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, hint, className = '', disabled, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full rounded-xl border-2 px-4 py-3 text-lg font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            disabled
              ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-indigo-400'
          } ${className}`}
          {...props}
        />
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
    )
  },
)

TextInput.displayName = 'TextInput'
