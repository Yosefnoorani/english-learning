import { splitGrammarBlanks, hasGrammarBlank } from '@/utils/grammarBlank'

interface GrammarSentenceProps {
  text: string
  className?: string
}

/** Renders a sentence; `___` blanks appear as an underline gap (not spoken as "underscore"). */
export function GrammarSentence({ text, className = '' }: GrammarSentenceProps) {
  if (!hasGrammarBlank(text)) {
    return <span className={className}>{text}</span>
  }

  const parts = splitGrammarBlanks(text)

  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              className="inline-block min-w-[3.25rem] border-b-2 border-indigo-400 dark:border-indigo-500 mx-0.5 align-baseline"
              aria-label="blank"
              role="presentation"
            />
          )}
        </span>
      ))}
    </span>
  )
}
