import genreTreeData from '../data/genreTrees.json'
import titleTemplateData from '../data/titleTemplates.json'

type TreeOption = { key: string; label: string }
type TreeQuestion = {
  id: string
  text: string
  options: TreeOption[]
  nextMap: Partial<Record<string, string>>
}
type GenreTree = {
  key: string
  label: string
  questions: TreeQuestion[]
}

type TitleTemplate = {
  category: string
  template: string
}

export interface TitleAnswers {
  format?: string
  rivalry?: string
  rule?: string
  hook?: string
  topic?: string
}

const genreTrees = genreTreeData.genres as unknown as GenreTree[]
const titleTemplates = titleTemplateData as TitleTemplate[]

const shuffle = <T,>(items: T[]) => {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

const fill = (value?: string, fallback = '') => (value && value.trim().length > 0 ? value.trim() : fallback)

const byCategory = titleTemplates.reduce<Record<string, TitleTemplate[]>>((acc, template) => {
  acc[template.category] = [...(acc[template.category] ?? []), template]
  return acc
}, {})

export const getGenreTrees = () => genreTrees
export const getGenreTree = (genreKey: string) => genreTrees.find((genre) => genre.key === genreKey) ?? null

export const getNextQuestionId = (question: TreeQuestion, optionKey: string) => {
  return question.nextMap[optionKey] ?? question.nextMap['*'] ?? 'end'
}

export const buildTitleCandidates = (
  genreLabel: string,
  gameTitle: string,
  answers: TitleAnswers,
  count = 10,
) => {
  const values = {
    GENRE: fill(genreLabel, '企画'),
    GAME: fill(gameTitle, 'このゲーム'),
    FORMAT: fill(answers.format, '特殊ルール'),
    RIVALRY: fill(answers.rivalry, 'メンバー対決'),
    RULE: fill(answers.rule, '制限ルール'),
    HOOK: fill(answers.hook, '波乱'),
    TOPIC: fill(answers.topic, '自由テーマ'),
  }

  const categoryOrder = shuffle(Object.keys(byCategory))
  const selectedTemplates: TitleTemplate[] = []

  while (selectedTemplates.length < count) {
    for (const category of categoryOrder) {
      const bucket = byCategory[category] ?? []
      if (bucket.length === 0) continue
      const picked = bucket[selectedTemplates.length % bucket.length]
      selectedTemplates.push(picked)
      if (selectedTemplates.length >= count) break
    }
  }

  const withText = selectedTemplates.map((template) =>
    template.template
      .replaceAll('{GENRE}', values.GENRE)
      .replaceAll('{GAME}', values.GAME)
      .replaceAll('{FORMAT}', values.FORMAT)
      .replaceAll('{RIVALRY}', values.RIVALRY)
      .replaceAll('{RULE}', values.RULE)
      .replaceAll('{HOOK}', values.HOOK)
      .replaceAll('{TOPIC}', values.TOPIC),
  )

  const unique = Array.from(new Set(withText.map((text) => text.replace(/\s+/g, ' ').trim())))
  return unique.slice(0, count)
}
