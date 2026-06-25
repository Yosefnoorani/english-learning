/** Focus a field without the browser scrolling the page to reveal it. */
export function focusInput(el: HTMLElement | null | undefined, delayMs = 0) {
  if (!el) return

  const focus = () => {
    try {
      el.focus({ preventScroll: true })
    } catch {
      el.focus()
    }
  }

  if (delayMs > 0) setTimeout(focus, delayMs)
  else focus()
}
