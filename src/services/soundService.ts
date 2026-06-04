let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx || audioCtx.state === 'closed') {
    try { audioCtx = new AudioContext() } catch { return null }
  }
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.25) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // ignore – AudioContext may be suspended until user gesture
  }
}

export function playCorrect() {
  playTone(880, 0.12, 'sine', 0.2)
  setTimeout(() => playTone(1108, 0.1, 'sine', 0.15), 80)
}

export function playWrong() {
  playTone(220, 0.18, 'square', 0.15)
}

export function playMilestone() {
  playTone(523, 0.1)
  setTimeout(() => playTone(659, 0.1), 110)
  setTimeout(() => playTone(784, 0.18), 220)
}

export function vibrateCorrect() {
  navigator.vibrate?.([50])
}

export function vibrateWrong() {
  navigator.vibrate?.([30, 60, 30])
}
