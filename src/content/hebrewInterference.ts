export interface HebrewInterferenceTip {
  id: string
  pattern: string
  wrong: string
  correct: string
  explanation_he: string
}

export const HEBREW_INTERFERENCE_TIPS: HebrewInterferenceTip[] = [
  {
    id: 'articles',
    pattern: 'articles',
    wrong: 'I went to the school',
    correct: 'I went to school',
    explanation_he: 'באנגלית לא תמיד משתמשים ב-the. מוסדות כלליים (school, work, home) לעיתים בלי article.',
  },
  {
    id: 'present_perfect_yesterday',
    pattern: 'present_perfect',
    wrong: 'I have been there yesterday',
    correct: 'I was there yesterday',
    explanation_he: 'yesterday = זמן סגור → Past Simple, לא Present Perfect.',
  },
  {
    id: 'depend_on',
    pattern: 'prepositions',
    wrong: 'depend from',
    correct: 'depend on',
    explanation_he: 'הפועל depend תמיד עם on — לא from.',
  },
  {
    id: 'word_order_adverb',
    pattern: 'word_order',
    wrong: 'I always am tired',
    correct: 'I am always tired',
    explanation_he: 'תואר הפועל (always, usually) בדרך כלל אחרי הפועל to be.',
  },
  {
    id: 'i_am_agree',
    pattern: 'translation',
    wrong: 'I am agree',
    correct: 'I agree',
    explanation_he: 'agree הוא פועל, לא שם תואר — בלי am.',
  },
  {
    id: 'informations',
    pattern: 'uncountable',
    wrong: 'informations',
    correct: 'information',
    explanation_he: 'information הוא uncountable — אין s ברבים.',
  },
]

export function getInterferenceTipForSkill(skill: string): HebrewInterferenceTip | undefined {
  return HEBREW_INTERFERENCE_TIPS.find((t) => t.pattern === skill || skill.includes(t.pattern))
}
