import type { ContentItem } from '@/types/game'
import { VOCABULARY_ITEMS } from './vocabulary'
import { GRAMMAR_ITEMS } from './grammar'
import { SENTENCE_ITEMS } from './sentences'
import { TRANSLATION_ITEMS } from './translation'
import { LISTENING_ITEMS } from './listening'
import { CONJUGATION_ITEMS } from './conjugation'
import { READING_ITEMS } from './reading'

// Placement-test items — lightweight grammar_choice set
const PLACEMENT_ITEMS: ContentItem[] = [
  {
    id: 'p1',
    type: 'placement_test',
    difficulty: 420,
    skill: 'past_simple',
    tags: ['placement'],
    data: {
      question_text: 'Choose the correct form:',
      context_sentence: 'She ___ a great film last weekend.',
      context_translation: 'היא ___ סרט נהדר בסוף השבוע שעבר.',
      options: ['watched', 'has watched', 'was watching', 'watches'],
      correct_answer: 'watched',
      grammar_hint: '"Last weekend" is a finished past time — use Past Simple.',
    },
  },
  {
    id: 'p2',
    type: 'placement_test',
    difficulty: 500,
    skill: 'present_perfect',
    tags: ['placement'],
    data: {
      question_text: 'Choose the correct form:',
      context_sentence: 'I ___ to Paris three times.',
      context_translation: 'נסעתי לפריז שלוש פעמים.',
      options: ['have been', 'went', 'was', 'am going'],
      correct_answer: 'have been',
      grammar_hint: '"Three times" as an experience uses Present Perfect.',
    },
  },
  {
    id: 'p3',
    type: 'placement_test',
    difficulty: 580,
    skill: 'conditionals',
    tags: ['placement'],
    data: {
      question_text: 'Which sentence is grammatically correct?',
      context_sentence: 'If she ___ harder, she would pass the exam.',
      context_translation: 'אם היא ___ קשה יותר, היא הייתה עוברת את הבחינה.',
      options: ['studied', 'studies', 'would study', 'will study'],
      correct_answer: 'studied',
      grammar_hint: 'Second conditional: If + past simple…',
    },
  },
  {
    id: 'p4',
    type: 'placement_test',
    difficulty: 640,
    skill: 'passive_voice',
    tags: ['placement'],
    data: {
      question_text: 'Choose the passive voice form:',
      context_sentence: 'The email ___ to all employees by the HR manager.',
      context_translation: 'האימייל ___ לכל העובדים על ידי מנהל משאבי אנוש.',
      options: ['was sent', 'sent', 'has sent', 'is sending'],
      correct_answer: 'was sent',
      grammar_hint: 'Past passive: was/were + past participle.',
    },
  },
  {
    id: 'p5',
    type: 'placement_test',
    difficulty: 700,
    skill: 'relative_clauses',
    tags: ['placement'],
    data: {
      question_text: 'Select the correct relative pronoun:',
      context_sentence: 'The professor ___ lectures I attended won a Nobel Prize.',
      context_translation: 'הפרופסור ___ הרצאות נכחתי בהן זכה בפרס נובל.',
      options: ['whose', 'who', 'which', 'that'],
      correct_answer: 'whose',
      grammar_hint: '"Whose" expresses possession — the professor\'s lectures.',
    },
  },
]

export const ALL_CONTENT: ContentItem[] = [
  ...PLACEMENT_ITEMS,
  ...VOCABULARY_ITEMS,
  ...GRAMMAR_ITEMS,
  ...SENTENCE_ITEMS,
  ...TRANSLATION_ITEMS,
  ...LISTENING_ITEMS,
  ...CONJUGATION_ITEMS,
  ...READING_ITEMS,
]

export const PLACEMENT_CONTENT = PLACEMENT_ITEMS
