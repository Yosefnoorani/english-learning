import { useEffect, useState } from 'react'

const KEYBOARD_THRESHOLD = 50

export interface VisualViewportState {
  keyboardInset: number
  isKeyboardOpen: boolean
  viewportHeight: number
  offsetTop: number
}

function readVisualViewport(): VisualViewportState {
  const vv = window.visualViewport
  if (!vv) {
    return {
      keyboardInset: 0,
      isKeyboardOpen: false,
      viewportHeight: window.innerHeight,
      offsetTop: 0,
    }
  }

  const keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  const isKeyboardOpen = keyboardInset > KEYBOARD_THRESHOLD

  return {
    keyboardInset: isKeyboardOpen ? keyboardInset : 0,
    isKeyboardOpen,
    viewportHeight: vv.height,
    offsetTop: vv.offsetTop,
  }
}

function applyViewportCss(state: VisualViewportState) {
  const root = document.documentElement
  root.style.setProperty('--vv-height', `${state.viewportHeight}px`)
  root.style.setProperty('--vv-offset-top', `${state.offsetTop}px`)
  root.style.setProperty('--keyboard-inset', `${state.keyboardInset}px`)
  root.classList.toggle('keyboard-open', state.isKeyboardOpen)
  document.body.style.overflow = state.isKeyboardOpen ? 'hidden' : ''
}

/** Tracks on-screen keyboard via Visual Viewport API and exposes layout helpers. */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => readVisualViewport())

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      const next = readVisualViewport()
      applyViewportCss(next)
      setState(next)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      applyViewportCss({
        keyboardInset: 0,
        isKeyboardOpen: false,
        viewportHeight: window.innerHeight,
        offsetTop: 0,
      })
    }
  }, [])

  return state
}

/** @deprecated Use useVisualViewport().keyboardInset */
export function useKeyboardInset(): number {
  return useVisualViewport().keyboardInset
}
