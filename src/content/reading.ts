import type { ContentItem } from '@/types/game'

export const READING_ITEMS: ContentItem[] = [
  {
    id: 'r1',
    type: 'reading_comprehension',
    difficulty: 480,
    skill: 'vocabulary_environment',
    tags: ['environment', 'reading', 'intermediate'],
    data: {
      context_sentence: 'Read the passage and answer the questions below.',
      context_translation: 'קרא את הקטע וענה על השאלות למטה.',
      correct_answer: '',
      passage: `The Amazon rainforest covers more than 5.5 million square kilometres and is often called "the lungs of the Earth." It produces roughly 20% of the world's oxygen and is home to at least 10% of all species on the planet. Despite its importance, the Amazon faces serious threats. Every year, large areas are cleared for cattle farming and soy production. In 2020 alone, approximately 11,000 square kilometres of forest were destroyed — an area larger than Jamaica.

Scientists warn that if deforestation continues at its current rate, the Amazon could reach a "tipping point" within decades. Beyond this point, it would no longer generate enough rainfall to sustain itself and could gradually transform into dry savannah. This would not only devastate biodiversity but also accelerate global climate change.`,
      comprehension_questions: [
        {
          q: 'Why is the Amazon rainforest called "the lungs of the Earth"?',
          options: [
            'Because it absorbs carbon dioxide',
            'Because it produces about 20% of the world\'s oxygen',
            'Because it generates global rainfall',
            'Because it covers 20% of the planet\'s surface',
          ],
          answer: "Because it produces about 20% of the world's oxygen",
        },
        {
          q: 'What does the "tipping point" mean in this context?',
          options: [
            'The moment all species in the Amazon go extinct',
            'A financial turning point for logging companies',
            'The point at which the forest can no longer sustain itself',
            'The highest point of the forest canopy',
          ],
          answer: 'The point at which the forest can no longer sustain itself',
        },
        {
          q: 'According to the passage, what are TWO main causes of deforestation?',
          options: [
            'Tourism and oil drilling',
            'Cattle farming and soy production',
            'Mining and urban expansion',
            'Climate change and wildfires',
          ],
          answer: 'Cattle farming and soy production',
        },
      ],
      common_mistake: 'Read carefully for specific details. "The lungs" refers to oxygen production, not CO₂ absorption.',
    },
  },
  {
    id: 'r2',
    type: 'reading_comprehension',
    difficulty: 520,
    skill: 'vocabulary_technology',
    tags: ['technology', 'reading', 'intermediate'],
    data: {
      context_sentence: 'Read the passage and answer the questions below.',
      context_translation: 'קרא את הקטע וענה על השאלות למטה.',
      correct_answer: '',
      passage: `Artificial intelligence is no longer a distant concept from science fiction — it is already embedded in daily life. From the recommendation algorithm on a streaming platform to the spam filter in your email inbox, AI systems make hundreds of decisions on our behalf every day. Most of us interact with these systems without ever realising it.

However, AI raises important ethical questions. One major concern is bias. If the data used to train an AI model contains historical prejudices, the model will likely reproduce those prejudices. For example, several hiring algorithms have been found to favour male candidates because they were trained on historical hiring data that predominantly featured men.

Another concern is transparency. Many AI systems are "black boxes" — their decision-making processes are so complex that even their creators cannot fully explain them. This creates challenges when systems make consequential decisions about loan applications, medical diagnoses, or parole hearings.`,
      comprehension_questions: [
        {
          q: 'According to the passage, what is one reason AI systems can be biased?',
          options: [
            'They are programmed by biased engineers',
            'They are trained on data that contains historical prejudices',
            'They lack sufficient computing power',
            'They are designed to favour certain groups',
          ],
          answer: 'They are trained on data that contains historical prejudices',
        },
        {
          q: 'What does the term "black box" mean in this passage?',
          options: [
            'A piece of expensive AI hardware',
            'A system that records flight data',
            'An AI whose decision-making process cannot be fully explained',
            'A secret government AI project',
          ],
          answer: 'An AI whose decision-making process cannot be fully explained',
        },
        {
          q: 'Which of the following is NOT mentioned as a "consequential decision" made by AI?',
          options: [
            'Loan applications',
            'Medical diagnoses',
            'Weather forecasting',
            'Parole hearings',
          ],
          answer: 'Weather forecasting',
        },
      ],
      common_mistake: 'Skim the passage first for the main idea, then re-read carefully to find specific details for each question.',
    },
  },
  {
    id: 'r3',
    type: 'reading_comprehension',
    difficulty: 560,
    skill: 'vocabulary_business',
    tags: ['business', 'reading', 'intermediate'],
    data: {
      context_sentence: 'Read the passage and answer the questions below.',
      context_translation: 'קרא את הקטע וענה על השאלות למטה.',
      correct_answer: '',
      passage: `Remote work, once a perk reserved for a small minority of employees, has transformed into a mainstream working arrangement since the pandemic of 2020. Companies that once insisted on full-time office presence were forced to adapt almost overnight. Many discovered that productivity did not collapse as feared; in some cases, it actually improved.

Yet the shift has not been without friction. Junior employees often struggle most in remote environments, lacking the informal mentoring and spontaneous knowledge-sharing that occur naturally in an office. Meanwhile, the erosion of boundaries between work and personal life has contributed to higher rates of burnout among remote workers.

As companies now debate return-to-office policies, a hybrid model — combining remote and in-person work — has emerged as the most common compromise. Research suggests that two to three days of office presence per week is the arrangement most employees prefer, balancing flexibility with collaboration.`,
      comprehension_questions: [
        {
          q: 'According to the passage, who struggled most with remote working?',
          options: [
            'Senior managers',
            'IT professionals',
            'Junior employees',
            'Remote-first companies',
          ],
          answer: 'Junior employees',
        },
        {
          q: 'What does the passage say about productivity during the shift to remote work?',
          options: [
            'It collapsed across all industries',
            'It remained unchanged',
            'It did not fall as feared and sometimes improved',
            'It improved dramatically in all cases',
          ],
          answer: 'It did not fall as feared and sometimes improved',
        },
        {
          q: 'What office arrangement does research suggest most employees prefer?',
          options: [
            'Fully remote, with no office time',
            'Full-time office presence',
            'Two to three days of office work per week',
            'One day of office work per month',
          ],
          answer: 'Two to three days of office work per week',
        },
      ],
      common_mistake: 'Be careful with "not without friction" — this double negative means there WERE problems. Double negatives in English can be tricky.',
    },
  },
  {
    id: 'r4',
    type: 'reading_comprehension',
    difficulty: 610,
    skill: 'vocabulary_academic',
    tags: ['science', 'reading', 'advanced'],
    data: {
      context_sentence: 'Read the passage and answer the questions below.',
      context_translation: 'קרא את הקטע וענה על השאלות למטה.',
      correct_answer: '',
      passage: `Sleep is far more than a period of rest. During sleep, the brain undergoes a remarkable cycle of consolidation, processing the day's experiences and transferring short-term memories into long-term storage. This process, known as memory consolidation, is one reason why sleep deprivation so dramatically impairs learning.

A landmark 2019 study published in Nature demonstrated that a single night of poor sleep reduced the brain's ability to form new memories by nearly 40%. Participants who slept fewer than six hours showed measurable deterioration in both explicit memory (conscious recall of facts) and procedural memory (muscle memory for physical skills).

The study also highlighted the role of deep sleep, or slow-wave sleep, in emotional regulation. People deprived of this sleep stage showed significantly heightened emotional reactivity — reacting more intensely to negative stimuli than well-rested individuals. The authors concluded that prioritising sleep is not a luxury but a neurological necessity.`,
      comprehension_questions: [
        {
          q: 'What happens to memories during sleep, according to the passage?',
          options: [
            'They are erased to make room for new memories',
            'Short-term memories are transferred to long-term storage',
            'The brain creates entirely new memories from scratch',
            'Emotional memories are deleted to reduce stress',
          ],
          answer: 'Short-term memories are transferred to long-term storage',
        },
        {
          q: 'What was the key finding of the 2019 Nature study?',
          options: [
            'Eight hours of sleep doubles memory capacity',
            'One bad night reduced memory formation by nearly 40%',
            'Deep sleep is the only type that affects learning',
            'Sleep duration has no effect on emotional regulation',
          ],
          answer: 'One bad night reduced memory formation by nearly 40%',
        },
        {
          q: 'What conclusion did the authors draw about sleep?',
          options: [
            'It is a luxury that most people over-prioritise',
            'It is a neurological necessity, not a luxury',
            'It is only important for elderly individuals',
            'It is less important than exercise for brain health',
          ],
          answer: 'It is a neurological necessity, not a luxury',
        },
      ],
      common_mistake: 'Academic passages often contain complex noun phrases. Break them down: "memory consolidation" = the process of consolidating (making solid/permanent) memories.',
    },
  },
  {
    id: 'r5',
    type: 'reading_comprehension',
    difficulty: 440,
    skill: 'vocabulary_travel',
    tags: ['culture', 'reading', 'beginner'],
    data: {
      context_sentence: 'Read the short passage and answer the questions.',
      context_translation: 'קרא את הקטע הקצר וענה על השאלות.',
      correct_answer: '',
      passage: `Japan is a country of fascinating contrasts. Modern skyscrapers stand next to ancient temples, and high-speed bullet trains connect cities where traditional tea ceremonies are still performed daily. Tourism in Japan has grown dramatically in recent decades, with millions of visitors arriving each year to experience the country's unique blend of old and new.

One of the most popular destinations is Kyoto, which served as Japan's imperial capital for more than a thousand years. Unlike Tokyo, which was largely rebuilt after World War II, Kyoto preserved much of its historical architecture. The city is home to over 1,600 Buddhist temples and 400 Shinto shrines, many of which are UNESCO World Heritage Sites.

For first-time visitors, learning a few basic Japanese phrases is highly recommended. Although English signage is common in major cities, locals greatly appreciate any effort to communicate in their language.`,
      comprehension_questions: [
        {
          q: 'How is Kyoto different from Tokyo, according to the passage?',
          options: [
            'Kyoto has more modern skyscrapers',
            'Kyoto was the country\'s original capital and preserved its historical architecture',
            'Kyoto has more international visitors than Tokyo',
            'Kyoto has a larger population than Tokyo',
          ],
          answer: "Kyoto was the country's original capital and preserved its historical architecture",
        },
        {
          q: 'What does the passage recommend for first-time visitors to Japan?',
          options: [
            'Visiting only Tokyo and Kyoto',
            'Hiring a local guide',
            'Learning a few basic Japanese phrases',
            'Travelling by bullet train only',
          ],
          answer: 'Learning a few basic Japanese phrases',
        },
      ],
      common_mistake: 'Pay attention to contrast words: "unlike" signals a comparison. "Unlike Tokyo... Kyoto..." means they are different in the described way.',
    },
  },
  // ── Beginner (Tier 1) ─────────────────────────────────────
  {
    id: 'r6',
    type: 'reading_comprehension',
    difficulty: 360,
    skill: 'vocabulary_travel',
    tags: ['basics', 'reading', 'beginner'],
    data: {
      context_sentence: 'Read the short passage and answer the questions.',
      context_translation: 'קרא את הקטע הקצר וענה על השאלות.',
      correct_answer: '',
      passage: `Tom is a student. He is twelve years old. He goes to school from Monday to Friday. His favourite subject is English. After school, he plays football with his friends in the park.`,
      comprehension_questions: [
        {
          q: 'How old is Tom?',
          options: ['Ten years old', 'Eleven years old', 'Twelve years old', 'Thirteen years old'],
          answer: 'Twelve years old',
        },
        {
          q: 'What is Tom\'s favourite subject?',
          options: ['Maths', 'Science', 'English', 'History'],
          answer: 'English',
        },
      ],
      common_mistake: 'Look for exact words from the passage — "favourite subject is English" gives the answer directly.',
    },
  },
  // ── Advanced (Tier 9–10) ────────────────────────────────────
  {
    id: 'r7',
    type: 'reading_comprehension',
    difficulty: 800,
    skill: 'vocabulary_academic',
    tags: ['academic', 'reading', 'advanced'],
    data: {
      context_sentence: 'Read the passage and answer the questions.',
      context_translation: 'קרא את הקטע וענה על השאלות.',
      correct_answer: '',
      passage: `Cognitive dissonance, a concept introduced by Leon Festinger in 1957, describes the mental discomfort experienced when holding two or more contradictory beliefs simultaneously. When individuals encounter evidence that challenges their existing worldview, they often engage in motivated reasoning — selectively interpreting information to reduce psychological tension rather than updating their beliefs objectively.

Research in behavioural economics has demonstrated that this tendency is not limited to political or religious contexts. Even highly educated professionals exhibit confirmation bias when evaluating data that threatens their professional identity. The implications for public policy are significant: presenting factual corrections alone may fail to change minds if those facts threaten deeply held self-concepts.`,
      comprehension_questions: [
        {
          q: 'According to the passage, what is "motivated reasoning"?',
          options: [
            'Reasoning based on logical evidence alone',
            'Selectively interpreting information to reduce psychological tension',
            'Updating beliefs whenever new evidence appears',
            'A form of reasoning unique to political contexts',
          ],
          answer: 'Selectively interpreting information to reduce psychological tension',
        },
        {
          q: 'What does the passage suggest about presenting factual corrections?',
          options: [
            'They always change people\'s minds quickly',
            'They may fail if facts threaten deeply held self-concepts',
            'They are most effective among uneducated people',
            'They work best in religious contexts only',
          ],
          answer: 'They may fail if facts threaten deeply held self-concepts',
        },
      ],
      common_mistake: 'Academic passages often define terms in the same sentence — "motivated reasoning — selectively interpreting…" gives the definition.',
    },
  },
]
