import type { ContentItem } from '@/types/game'
import { scrambleWord } from '@/utils/wordHint'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function isValidVocab(item: ContentItem): boolean {
  return item.type === 'vocabulary' && Boolean(item.data.word) && Boolean(item.data.translation)
}

function buildChoiceItem(item: ContentItem, pool: ContentItem[]): ContentItem {
  const word = item.data.word!
  let distractors = shuffle(
    pool.filter((i) => i.id !== item.id && i.skill === item.skill && i.data.word),
  ).slice(0, 3)

  if (distractors.length < 3) {
    const extra = shuffle(
      pool.filter(
        (i) =>
          i.id !== item.id &&
          i.data.word &&
          !distractors.some((d) => d.id === i.id),
      ),
    ).slice(0, 3 - distractors.length)
    distractors = [...distractors, ...extra]
  }

  const options = shuffle([word, ...distractors.map((d) => d.data.word!)].filter(Boolean))

  return {
    id: `choice-${item.id}`,
    type: 'vocabulary_choice',
    difficulty: item.difficulty,
    skill: item.skill,
    tags: [...item.tags, 'derived', 'choice'],
    data: {
      translation: item.data.translation,
      context_sentence: item.data.context_sentence,
      context_translation: item.data.context_translation,
      question_text: 'Choose the correct English word:',
      options,
      correct_answer: item.data.correct_answer,
      common_mistake: item.data.common_mistake,
    },
  }
}

function buildMatchItem(items: ContentItem[]): ContentItem {
  const pairs = items.map((i) => ({ en: i.data.word!, he: i.data.translation! }))
  const avgDiff = Math.round(items.reduce((s, i) => s + i.difficulty, 0) / items.length)

  return {
    id: `match-${items.map((i) => i.id).join('-')}`,
    type: 'vocabulary_match',
    difficulty: avgDiff,
    skill: items[0].skill,
    tags: ['derived', 'matching', ...items[0].tags.slice(0, 2)],
    data: {
      match_pairs: pairs,
      context_sentence: '',
      context_translation: '',
      correct_answer: JSON.stringify(pairs),
    },
  }
}

function buildScrambleItem(item: ContentItem): ContentItem {
  const word = item.data.word ?? item.data.correct_answer

  return {
    id: `scramble-${item.id}`,
    type: 'word_scramble',
    difficulty: item.difficulty,
    skill: item.skill,
    tags: [...item.tags, 'derived', 'scramble'],
    data: {
      word,
      translation: item.data.translation,
      context_sentence: item.data.context_sentence,
      context_translation: item.data.context_translation,
      scrambled_word: scrambleWord(word),
      correct_answer: word,
      common_mistake: item.data.common_mistake,
    },
  }
}

function vocabForDerivation(pool: ContentItem[], allContent: ContentItem[]): ContentItem[] {
  if (pool.length === 0) return []
  const bandMin = Math.min(...pool.map((p) => p.difficulty))
  const bandMax = Math.max(...pool.map((p) => p.difficulty))
  const margin = 50
  return allContent.filter(
    (v) =>
      isValidVocab(v) &&
      v.difficulty >= bandMin - margin &&
      v.difficulty <= bandMax + margin,
  )
}

/**
 * Derives vocabulary_match, vocabulary_choice, and word_scramble items
 * from vocabulary content in the pool (no duplicate authoring).
 */
export function expandPoolWithVocabDerivatives(
  pool: ContentItem[],
  allContent?: ContentItem[],
): ContentItem[] {
  const vocab = vocabForDerivation(pool, allContent ?? pool)
  if (vocab.length < 4) return pool

  const derived: ContentItem[] = []
  const derivedIds = new Set<string>()

  const choiceCandidates = shuffle(vocab).slice(0, Math.max(1, Math.ceil(vocab.length / 3)))
  for (const item of choiceCandidates) {
    const derivedItem = buildChoiceItem(item, vocab)
    if (!derivedIds.has(derivedItem.id)) {
      derived.push(derivedItem)
      derivedIds.add(derivedItem.id)
    }
  }

  const scrambleCandidates = shuffle(vocab).slice(0, Math.max(1, Math.ceil(vocab.length / 3)))
  for (const item of scrambleCandidates) {
    const derivedItem = buildScrambleItem(item)
    if (!derivedIds.has(derivedItem.id)) {
      derived.push(derivedItem)
      derivedIds.add(derivedItem.id)
    }
  }

  const bySkill = new Map<string, ContentItem[]>()
  for (const item of vocab) {
    const list = bySkill.get(item.skill) ?? []
    list.push(item)
    bySkill.set(item.skill, list)
  }

  for (const items of bySkill.values()) {
    if (items.length < 4) continue
    const shuffled = shuffle(items)
    const groupCount = Math.min(3, Math.floor(shuffled.length / 4))
    for (let g = 0; g < groupCount; g++) {
      const group = shuffled.slice(g * 4, g * 4 + 4)
      const derivedItem = buildMatchItem(group)
      if (!derivedIds.has(derivedItem.id)) {
        derived.push(derivedItem)
        derivedIds.add(derivedItem.id)
      }
    }
  }

  return [...pool, ...derived]
}
