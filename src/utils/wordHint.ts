/** Mask the target word with blanks in a context sentence */
export function maskWord(sentence: string, word: string): string {
  if (!word) return sentence
  const blanks = '_'.repeat(Math.max(word.length, 4))
  return sentence.replace(new RegExp(`\\b${word}\\b`, 'i'), blanks)
}

/** Progressive letter hints for active recall (levels 1–3) */
export function buildLetterHint(word: string, level: number): string {
  if (!word || level <= 0) return ''
  const len = word.length
  if (level === 1) {
    return `${word[0]} (${len} letters)`
  }
  if (level === 2) {
    if (len <= 2) return word
    const parts = word.split('').map((ch, i) => {
      if (i === 0 || i === len - 1) return ch
      return '_'
    })
    return parts.join(' ')
  }
  // level 3+: reveal ~50% of interior letters
  const reveal = new Set<number>([0, len - 1])
  const interior = Array.from({ length: len }, (_, i) => i).filter((i) => i > 0 && i < len - 1)
  const toReveal = Math.ceil(interior.length / 2)
  for (let i = 0; i < toReveal; i++) {
    reveal.add(interior[i])
  }
  return word
    .split('')
    .map((ch, i) => (reveal.has(i) ? ch : '_'))
    .join(' ')
}

export function scrambleWord(word: string): string {
  const chars = word.split('')
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  const scrambled = chars.join('')
  if (scrambled.toLowerCase() === word.toLowerCase() && word.length > 1) {
    return scrambleWord(word)
  }
  return scrambled
}
