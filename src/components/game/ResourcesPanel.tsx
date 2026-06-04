import { X, ExternalLink, Headphones, Tv, BookOpen, Mic } from 'lucide-react'

interface ResourceItem {
  title: string
  description: string
  url: string
  type: 'podcast' | 'series' | 'book' | 'channel'
}

interface LevelResources {
  label: string
  resources: ResourceItem[]
}

const RESOURCES_BY_BAND: Record<string, LevelResources> = {
  Starter: {
    label: 'Starter — A1',
    resources: [
      { title: 'BBC Learning English — The Flatmates', description: 'Short audio episodes following flatmates living in London. Clear, slow speech.', url: 'https://www.bbc.co.uk/learningenglish/english/features/the-flatmates', type: 'podcast' },
      { title: 'English with Lucy — Beginner Course', description: 'YouTube channel with clear vocabulary and grammar explanations for beginners.', url: 'https://www.youtube.com/@EnglishwithLucy', type: 'channel' },
      { title: 'Oxford Bookworms — Stage 1', description: 'Graded readers at Starter–Beginner level. Great for building basic reading fluency.', url: 'https://elt.oup.com/catalogue/items/global/graded_readers/oxford_bookworms_library/', type: 'book' },
    ],
  },
  Beginner: {
    label: 'Beginner — A2',
    resources: [
      { title: 'BBC Learning English — 6 Minute English', description: 'Short weekly podcast discussing everyday topics in clear, accessible English.', url: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english', type: 'podcast' },
      { title: 'Friends (Season 1–2)', description: 'Iconic sitcom with natural everyday English, simple vocabulary, and subtitles.', url: 'https://www.netflix.com/title/70153404', type: 'series' },
      { title: 'English File A2 Student Book', description: 'Oxford University Press graded course covering all four skills at A2 level.', url: 'https://elt.oup.com/catalogue/items/global/adult_courses/english_file/', type: 'book' },
    ],
  },
  Elementary: {
    label: 'Elementary — A2–B1',
    resources: [
      { title: 'ESL Pod', description: 'Daily conversations covering everyday situations, explained slowly with vocabulary notes.', url: 'https://eslpod.com', type: 'podcast' },
      { title: 'The Crown (Season 1)', description: 'Historical British drama with clear, formal English and excellent subtitles.', url: 'https://www.netflix.com/title/80025678', type: 'series' },
      { title: 'Vocabulary in Use — Pre-Intermediate', description: 'Cambridge self-study vocabulary book with exercises and practical context.', url: 'https://www.cambridge.org/gb/cambridgeenglish/catalog/grammar-vocabulary-and-pronunciation', type: 'book' },
    ],
  },
  Intermediate: {
    label: 'Intermediate — B1',
    resources: [
      { title: 'The English We Speak (BBC)', description: 'Short, fun episodes about idioms, slang, and everyday expressions.', url: 'https://www.bbc.co.uk/learningenglish/english/features/the-english-we-speak', type: 'podcast' },
      { title: 'Breaking Bad', description: 'Intense drama with diverse American accents. Challenging but highly engaging.', url: 'https://www.netflix.com/title/70143836', type: 'series' },
      { title: 'English Grammar in Use — Murphy', description: 'The gold-standard self-study grammar reference book for Intermediate learners.', url: 'https://www.cambridge.org/gb/cambridgeenglish/catalog/grammar-vocabulary-and-pronunciation/english-grammar-use-5th-edition', type: 'book' },
    ],
  },
  'Upper-Intermediate': {
    label: 'Upper-Intermediate — B2',
    resources: [
      { title: 'All Ears English Podcast', description: 'Natural conversations about real-life situations in American English.', url: 'https://www.allearsenglish.com', type: 'podcast' },
      { title: 'The West Wing', description: 'Fast-paced political drama with sophisticated vocabulary and natural dialogue.', url: 'https://www.hbomax.com', type: 'series' },
      { title: 'Atomic Habits — James Clear', description: 'Modern non-fiction with clear, engaging writing. Great for academic vocabulary.', url: 'https://jamesclear.com/atomic-habits', type: 'book' },
      { title: 'TED Talks', description: 'Short talks on diverse topics — practice listening to formal presentations.', url: 'https://www.ted.com/talks', type: 'channel' },
    ],
  },
  Advanced: {
    label: 'Advanced — C1–C2',
    resources: [
      { title: 'The Intelligence — The Economist', description: 'Daily 20-minute briefings on global affairs with sophisticated vocabulary.', url: 'https://www.economist.com/podcasts/the-intelligence', type: 'podcast' },
      { title: 'Succession', description: 'Complex drama with rapid, witty dialogue and advanced business/corporate vocabulary.', url: 'https://www.hbomax.com', type: 'series' },
      { title: 'The Economist (Weekly)', description: 'The benchmark for sophisticated written English — wide range of topics.', url: 'https://www.economist.com', type: 'book' },
      { title: 'Huberman Lab Podcast', description: 'Long-form science discussions. Dense, technical vocabulary at C1–C2 level.', url: 'https://www.hubermanlab.com/podcast', type: 'podcast' },
    ],
  },
}

const TYPE_ICONS = {
  podcast: Headphones,
  series: Tv,
  book: BookOpen,
  channel: Mic,
}

const TYPE_COLORS: Record<string, string> = {
  podcast: 'bg-violet-50 text-violet-600 border-violet-100',
  series: 'bg-sky-50 text-sky-600 border-sky-100',
  book: 'bg-amber-50 text-amber-600 border-amber-100',
  channel: 'bg-rose-50 text-rose-600 border-rose-100',
}

interface ResourcesPanelProps {
  levelLabel: string
  onClose: () => void
}

export function ResourcesPanel({ levelLabel, onClose }: ResourcesPanelProps) {
  const current = RESOURCES_BY_BAND[levelLabel] ?? RESOURCES_BY_BAND['Intermediate']
  const otherBands = Object.values(RESOURCES_BY_BAND).filter((b) => b.label !== current.label)

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recommended Resources</h2>
            <p className="text-xs text-slate-400 mt-0.5">Curated for {current.label}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">
          {/* Current level */}
          <section>
            <h3 className="text-sm font-bold text-indigo-700 mb-3">{current.label} — Your level</h3>
            <div className="flex flex-col gap-3">
              {current.resources.map((r) => {
                const Icon = TYPE_ICONS[r.type]
                return (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-200 hover:bg-indigo-50 transition-colors group"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${TYPE_COLORS[r.type]}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{r.title}</p>
                        <ExternalLink size={12} className="text-slate-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{r.description}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>

          {/* Other levels collapsed */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Other levels</h3>
            <div className="flex flex-col gap-2">
              {otherBands.map((band) => (
                <details key={band.label} className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none rounded-xl px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-semibold text-slate-600">{band.label}</span>
                    <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="flex flex-col gap-2 mt-2 ml-2">
                    {band.resources.map((r) => {
                      const Icon = TYPE_ICONS[r.type]
                      return (
                        <a
                          key={r.url}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 hover:border-slate-300 transition-colors"
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${TYPE_COLORS[r.type]}`}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{r.title}</p>
                            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{r.description}</p>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
