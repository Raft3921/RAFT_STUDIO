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

export type TitleAnswers = Record<string, string | undefined>

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
  const topicValue =
    answers.topic === '自由テーマ'
      ? fill(answers.topicCustom, '未入力テーマ')
      : fill(answers.topic, '定番お題')
  const ruleFallback = genreLabel === '検証' ? '同条件で比較' : '追加ルールなし'

  const values: Record<string, string> = {
    GENRE: fill(genreLabel, '企画'),
    GAME: fill(gameTitle, 'このゲーム'),
    FORMAT: fill(answers.format, '特殊ルール'),
    STYLE: fill(answers.style, '定番型'),
    RIVALRY: fill(answers.rivalry, 'メンバー対決'),
    RULE: fill(answers.rule, ruleFallback),
    PACE: fill(answers.pace, '中盤加速'),
    STAKES: fill(answers.stakes, 'リスクあり'),
    HOOK: fill(answers.hook, '波乱'),
    SETTING: fill(answers.setting, '通常マップ'),
    TOPIC: topicValue,
    TWIST: fill(answers.twist, '追加なし'),
    AUDIENCE: fill(answers.audience, '全体向け'),
    EDIT_STYLE: fill(answers.editStyle, 'テンポ重視'),
    THUMB_STYLE: fill(answers.thumbStyle, 'インパクト型'),
    OPENING: fill(answers.opening, 'いきなり本編'),
    ENDING: fill(answers.ending, '決着'),
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
    template.template.replace(/\{([A-Z_]+)\}/g, (_, key) => values[key] ?? ''),
  )

  const unique = Array.from(new Set(withText.map((text) => text.replace(/\s+/g, ' ').trim())))
  return unique.slice(0, count)
}
