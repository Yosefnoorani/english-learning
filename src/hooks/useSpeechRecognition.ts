import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionResult {
  transcript: string
  confidence: number
}

type SpeechRecognitionCtor = new () => {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string; confidence: number } } } }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(lang = 'en-US') {
  const [listening, setListening] = useState(false)
  const [result, setResult] = useState<SpeechRecognitionResult | null>(null)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null)

  useEffect(() => {
    setSupported(!!getSpeechRecognition())
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const alt = event.results[0]?.[0]
      if (alt) setResult({ transcript: alt.transcript.trim(), confidence: alt.confidence })
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    setResult(null)
    setListening(true)
    recognition.start()
  }, [lang])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, result, supported, start, stop }
}
