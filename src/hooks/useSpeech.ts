import { useCallback, useRef } from 'react'

interface UseSpeechOptions {
  lang?: string
  rate?: number
  pitch?: number
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const { lang = 'en-GB', rate = 0.9, pitch = 1.0 } = options
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) return
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = rate
      utterance.pitch = pitch

      // Prefer a native English voice if available
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')),
      )
      const fallback = voices.find((v) => v.lang === lang)
      if (preferred) utterance.voice = preferred
      else if (fallback) utterance.voice = fallback

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [lang, rate, pitch],
  )

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
  }, [])

  return { speak, stop }
}
