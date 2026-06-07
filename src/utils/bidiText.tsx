import type { ElementType, ReactNode } from 'react'

const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/
const LATIN_RE = /[A-Za-z]/

/** Split mixed Hebrew/English strings into directionally consistent runs. */
export function segmentMixedBidiText(text: string): Array<{ dir: 'rtl' | 'ltr'; text: string }> {
  if (!text) return []

  const tokenRe =
    /"[^"]*"|'[^']*'|\([^)]*[A-Za-z][^)]*\)|[\u0590-\u05FF\uFB1D-\uFB4F]+|[A-Za-z][A-Za-z0-9\s.,;:!?'"\-()•→·/—]*/gu

  const segments: Array<{ dir: 'rtl' | 'ltr'; text: string }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ dir: 'rtl', text: text.slice(lastIndex, match.index) })
    }

    const token = match[0]
    const dir: 'rtl' | 'ltr' = HEBREW_RE.test(token)
      ? 'rtl'
      : LATIN_RE.test(token)
        ? 'ltr'
        : 'rtl'
    segments.push({ dir, text: token })
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    segments.push({ dir: 'rtl', text: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ dir: 'rtl', text }]
}

interface BidiMixedTextProps {
  text: string
  className?: string
  /** Wrapper element; use `span` when embedding inside an existing RTL block. */
  as?: ElementType
  prefix?: ReactNode
}

/** Renders Hebrew RTL copy with isolated LTR runs for embedded English. */
export function BidiMixedText({ text, className, as: Tag = 'span', prefix }: BidiMixedTextProps) {
  const segments = segmentMixedBidiText(text)
  const inline = Tag === 'span'

  return (
    <Tag className={className} dir={inline ? undefined : 'rtl'}>
      {prefix}
      {segments.map((seg, i) =>
        seg.dir === 'ltr' ? (
          <bdi key={i} dir="ltr" className="inline-block">
            {seg.text}
          </bdi>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </Tag>
  )
}
