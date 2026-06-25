import { useRef } from 'react'
import { Share2, Download } from 'lucide-react'
import { useGameStore, selectLevelLabel } from '@/store/useGameStore'

interface ShareStreakCardProps {
  onClose: () => void
}

export function ShareStreakCard({ onClose }: ShareStreakCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streak = useGameStore((s) => s.userState.streak)
  const levelLabel = useGameStore(selectLevelLabel)
  const xp = useGameStore((s) => s.userState.xp)

  function drawCard(): HTMLCanvasElement | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = 600
    canvas.height = 400
    const grad = ctx.createLinearGradient(0, 0, 600, 400)
    grad.addColorStop(0, '#6366f1')
    grad.addColorStop(1, '#10b981')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 600, 400)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px system-ui'
    ctx.fillText('🔥', 40, 80)
    ctx.font = 'bold 56px system-ui'
    ctx.fillText(`${streak}`, 100, 85)
    ctx.font = '24px system-ui'
    ctx.fillText('day streak', 100, 120)

    ctx.font = 'bold 28px system-ui'
    ctx.fillText(levelLabel, 40, 200)
    ctx.font = '20px system-ui'
    ctx.fillText(`${xp} XP earned`, 40, 240)
    ctx.font = '18px system-ui'
    ctx.fillText('English Learning', 40, 360)

    return canvas
  }

  async function handleShare() {
    const canvas = drawCard()
    if (!canvas) return
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) return

    const file = new File([blob], 'streak.png', { type: 'image/png' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `${streak}-day streak!`,
        text: `I'm on a ${streak}-day English learning streak!`,
        files: [file],
      }).catch(() => {})
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'streak.png'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col gap-4">
        <h2 className="text-lg font-bold text-center text-slate-800 dark:text-slate-100">Share your streak</h2>
        <canvas ref={canvasRef} className="hidden" />
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-6 text-white text-center">
          <p className="text-5xl font-bold">{streak} 🔥</p>
          <p className="text-sm mt-1">day streak</p>
          <p className="text-lg font-bold mt-4">{levelLabel}</p>
          <p className="text-sm opacity-80">{xp} XP</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { void handleShare() }}
            className="w-full min-h-[44px] rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            Share
          </button>
          <button
            type="button"
            onClick={() => { void handleShare() }}
            className="w-full min-h-[44px] rounded-xl border-2 border-slate-200 dark:border-slate-700 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Download image
          </button>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
