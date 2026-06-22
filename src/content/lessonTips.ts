import type { SkillId } from '@/types/game'

export interface LessonTip {
  skill: SkillId
  title: string
  rule_he: string
  example_en: string
}

export const LESSON_TIPS: LessonTip[] = [
  {
    skill: 'present_simple',
    title: 'Present Simple',
    rule_he: 'לפועל בזמן הווה פשוט: I/you/we/they + פועל בסיס. he/she/it + פועל + s/es.',
    example_en: 'She works every day. They work on Mondays.',
  },
  {
    skill: 'present_continuous',
    title: 'Present Continuous',
    rule_he: 'am/is/are + פועל + ing — פעולה שקורית עכשיו או זמנית.',
    example_en: 'I am studying now. He is working from home.',
  },
  {
    skill: 'past_simple',
    title: 'Past Simple',
    rule_he: 'פעולה שהסתיימה בזמן מוגדר — פועל בזמן עבר (regular: -ed).',
    example_en: 'I visited London last year. She finished the report yesterday.',
  },
  {
    skill: 'present_perfect',
    title: 'Present Perfect',
    rule_he: 'have/has + past participle — קשר לעכשיו. לא עם yesterday!',
    example_en: 'I have lived here for five years. She has already finished.',
  },
  {
    skill: 'articles',
    title: 'Articles',
    rule_he: 'a/an לפני שם עצם ביחיד ספיר; the כשמדברים על משהו ספציפי; לפעמים אין article.',
    example_en: 'I saw a dog. The dog was friendly.',
  },
  {
    skill: 'prepositions',
    title: 'Prepositions',
    rule_he: 'מילות יחס (in, on, at, for...) — לומדים בביטויים, לא תרגום מילה-במילה.',
    example_en: 'depend on · interested in · good at',
  },
]

export function getLessonTip(skill: SkillId): LessonTip | undefined {
  return LESSON_TIPS.find((t) => t.skill === skill)
}
