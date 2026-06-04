const GRAMMAR_BLANK = /___+/

/** Split text around blank markers for rendering */
export function splitGrammarBlanks(text: string): string[] {
  return text.split(GRAMMAR_BLANK)
}

export function hasGrammarBlank(text: string): boolean {
  return GRAMMAR_BLANK.test(text)
}

/** TTS-friendly: avoid reading "underscore" for each `_` */
export function grammarTextForSpeech(text: string): string {
  return text.replace(/\s*___+\s*/g, ' ').replace(/\s+/g, ' ').trim()
}
