import { useEffect, useState } from 'react'

/** Returns extra bottom padding when the on-screen keyboard is open (Visual Viewport API). */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      if (!vv) return
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setInset(keyboardHeight > 50 ? keyboardHeight : 0)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
