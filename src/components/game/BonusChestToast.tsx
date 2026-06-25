import { Sparkles } from 'lucide-react'

interface BonusChestToastProps {
  gems: number
  goldenCombo: boolean
  onDismiss: () => void
}

export function BonusChestToast({ gems, goldenCombo, onDismiss }: BonusChestToastProps) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[55] fade-in">
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-3 shadow-xl flex items-center gap-3">
        <Sparkles size={20} className={goldenCombo ? 'animate-spin' : ''} />
        <div>
          <p className="font-bold text-sm">{goldenCombo ? 'Golden chest!' : 'Bonus chest!'}</p>
          <p className="text-xs opacity-90">+{gems} gems</p>
        </div>
        <button type="button" onClick={onDismiss} className="ml-2 text-xs font-bold opacity-80 hover:opacity-100">
          OK
        </button>
      </div>
    </div>
  )
}
