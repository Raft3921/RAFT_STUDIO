type GenreKey = 'verification' | 'prank' | 'building' | 'pvp' | 'gag'

type GenreQuestion = {
  id: string
  text: string
  hint: string
  placeholder: string
}

type GenrePromptFlow = {
  key: GenreKey
  label: string
  fallbackTitle: string
  questions: GenreQuestion[]
}

type GenreTemplateCategory = 'vs' | 'limit' | 'twist'
type GenreTemplate = { category: GenreTemplateCategory; text: string }

const memberWords = ['ラフト', 'まい', 'たぬつな', 'やんさん', 'ムート', 'もろん', 'ウィーク', 'ギョーザ']
const stopWords = new Set([
  'の',
  'で',
  'を',
  'に',
  'は',
  'が',
  'と',
  'や',
  'から',
  'まで',
  'だけ',
  'など',
  'する',
  'した',
  'して',
  'です',
  'ます',
  'いる',
  'ある',
  'こと',
])
const rivalryWords = ['vs', 'VS', '対決', '勝負', '初心者', '上級者', '最強', '最弱', 'ライバル']
const ruleWords = ['禁止', '縛り', '制限', 'だけ', '回復なし', 'アイテムなし', '時間']
const endingWords = ['事故', '逆転', '爆笑', '崩壊', '絶望', '神', '想定外', '地獄']

const genreFlows: GenrePromptFlow[] = [
  {
    key: 'verification',
    label: '検証',
    fallbackTitle: 'この検証、想定外だった',
    questions: [
      { id: 'target', text: '何を検証する？', hint: '対象を1つに絞ると強い。', placeholder: '例: 村人の挙動 / 最強装備 / このMOD仕様' },
      { id: 'condition', text: 'どんな条件でやる？', hint: '制限や縛りを短く。', placeholder: '例: 回復禁止 / 制限時間10分 / 木だけ' },
      { id: 'comparison', text: '何と比べる？', hint: '比較がなければ「なし」でもOK。', placeholder: '例: 初心者と上級者 / 通常と縛り' },
      { id: 'stage', text: 'どこでやる？', hint: '舞台を具体化。', placeholder: '例: 村 / ネザー / カスタムマップ' },
      { id: 'ending', text: 'どんな結末を狙う？', hint: '事故・逆転・成功など。', placeholder: '例: 大事故 / 神引き / まさかの仕様' },
    ],
  },
  {
    key: 'prank',
    label: 'ドッキリ',
    fallbackTitle: 'このドッキリ、空気が変わった',
    questions: [
      { id: 'target', text: '誰に仕掛ける？', hint: '名前を入れると明確になる。', placeholder: '例: ラフト / まい / 全員' },
      { id: 'plan', text: '何をする？', hint: '仕掛け内容を短く。', placeholder: '例: 偽ルールを伝える / ホラー演出を入れる' },
      { id: 'rule', text: 'ルールは？', hint: 'バレた時の処理も書く。', placeholder: '例: バレたら終了 / 叫んだら負け' },
      { id: 'reaction', text: '狙うリアクションは？', hint: '1つに絞る。', placeholder: '例: 混乱 / 絶叫 / 爆笑' },
      { id: 'ending', text: '最後はどう締める？', hint: 'ネタばらしや罰ゲームを指定。', placeholder: '例: ネタばらし / 二段ドッキリ / 罰ゲーム' },
    ],
  },
  {
    key: 'building',
    label: '建築',
    fallbackTitle: 'この建築、時間が足りない',
    questions: [
      { id: 'theme', text: '何を作る？', hint: '建築物を1つ。', placeholder: '例: 城 / 拠点 / 村' },
      { id: 'format', text: '形式は？', hint: '対決か協力かを明確に。', placeholder: '例: 2チーム対決 / 協力建築' },
      { id: 'limit', text: 'ルールや制限は？', hint: '時間・素材・妨害を短く。', placeholder: '例: 10分 / 石だけ / 妨害あり' },
      { id: 'judge', text: 'どうやって勝敗を決める？', hint: '審査方法を指定。', placeholder: '例: 投票 / 審査員 / 完成度' },
      { id: 'ending', text: 'オチはどうする？', hint: '逆転や罰ゲームを入れる。', placeholder: '例: 最下位罰ゲーム / まさかの逆転' },
    ],
  },
  {
    key: 'pvp',
    label: 'PvP',
    fallbackTitle: 'このPvP、勝負が読めない',
    questions: [
      { id: 'format', text: '形式は？', hint: '試合形式を1つ。', placeholder: '例: 1v1 / チーム戦 / 鬼ごっこ' },
      { id: 'rule', text: '条件は？', hint: '装備差・縛り・ランダム武器など。', placeholder: '例: 装備ランダム / 回復なし' },
      { id: 'win', text: '勝利条件は？', hint: '何回勝つか・どこまで残るか。', placeholder: '例: 先に3勝 / 最後の1人' },
      { id: 'map', text: '舞台は？', hint: 'マップ名や地形を書く。', placeholder: '例: 闘技場 / ネザー / 森林' },
      { id: 'hook', text: '盛り上げ要素は？', hint: '逆転・罰ゲーム・想定外など。', placeholder: '例: 逆転 / 1HP耐え / 罰ゲーム' },
    ],
  },
  {
    key: 'gag',
    label: 'ネタ',
    fallbackTitle: 'このネタ、全員巻き込まれた',
    questions: [
      { id: 'style', text: 'ネタの型は？', hint: 'コント系か縛り系か。', placeholder: '例: コント / なりきり / バカ縛り' },
      { id: 'core', text: '一番のボケは？', hint: '主軸のボケを1つ。', placeholder: '例: 嘘ルール / 勘違い / すれ違い' },
      { id: 'cast', text: '誰を中心に回す？', hint: '主役が分かると強い。', placeholder: '例: ラフト中心 / 全員巻き込み' },
      { id: 'stage', text: 'どこでやる？', hint: 'シーンを短く。', placeholder: '例: 拠点 / ボイスチャット / 夜マップ' },
      { id: 'ending', text: 'どう終わる？', hint: '崩壊・逆転・全員被害者など。', placeholder: '例: 崩壊 / 逆転 / 全員被害者' },
    ],
  },
]

const templatesByGenre: Record<GenreKey, GenreTemplate[]> = {
  verification: [
    { category: 'vs', text: '{RIVALRY}で{TOPIC}検証、結論が割れた' },
    { category: 'limit', text: '{RULE}条件で{TOPIC}を試した結果、想定外だった' },
    { category: 'twist', text: '{TOPIC}検証中に{ENDING}、空気が一変した' },
  ],
  prank: [
    { category: 'vs', text: '{PERSON}に{TOPIC}を仕掛けたら、反応が真逆だった' },
    { category: 'limit', text: '{RULE}ルールのドッキリ、バレる前に決着できるか' },
    { category: 'twist', text: '{TOPIC}ドッキリが{ENDING}でひっくり返った' },
  ],
  building: [
    { category: 'vs', text: '{RIVALRY}で{TOPIC}建築対決、勝敗はどっちだ' },
    { category: 'limit', text: '{TIME}で{TOPIC}建築、制限ありでやってみた結果' },
    { category: 'twist', text: '{RULE}縛りの{TOPIC}建築、最後に{ENDING}' },
  ],
  pvp: [
    { category: 'vs', text: '{RIVALRY}で{TOPIC}勝負、流れが読めない' },
    { category: 'limit', text: '{RULE}ありの{TOPIC}PvP、勝ち筋は1つだけ' },
    { category: 'twist', text: '{TOPIC}PvPで{ENDING}、試合が壊れた' },
  ],
  gag: [
    { category: 'vs', text: '{RIVALRY}で{TOPIC}ネタ対決、笑ったら負け' },
    { category: 'limit', text: '{RULE}縛りの{TOPIC}、最後まで耐えられるか' },
    { category: 'twist', text: '{TOPIC}ネタが{ENDING}で全員巻き込んだ' },
  ],
}

const toTokens = (input: string) =>
  input
    .replace(/[!！?？。、「」『』（）()【】\[\],，．。…・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => !stopWords.has(token))

const pickFirst = (tokens: string[], fallback: string) => tokens[0] || fallback

const extractByIncludes = (text: string, words: string[], fallback: string) => {
  const found = words.find((word) => text.includes(word))
  return found || fallback
}

const extractTime = (text: string) => {
  const matched = text.match(/\d+\s*(秒|分|時間|回|発|勝|人|v\d+)/)
  return matched?.[0] ?? ''
}

const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter((item) => item.length > 0)))

const fillTemplate = (template: string, slots: Record<string, string>) =>
  template.replace(/\{([A-Z_]+)\}/g, (_, key) => slots[key] ?? '')

const trimTitle = (title: string) => title.replace(/\s+/g, ' ').trim()

export const getGenreTrees = () => genreFlows.map((flow) => ({ key: flow.key, label: flow.label }))

export const getGenrePromptFlow = (genreKey: string) => genreFlows.find((flow) => flow.key === genreKey) ?? null

export const buildGenreTitleCandidates = (
  genreKey: string,
  answers: Record<string, string>,
  gameTitle: string,
) => {
  const flow = getGenrePromptFlow(genreKey)
  if (!flow) return { titles: ['企画タイトルを作成'], keywords: [] as string[] }

  const answerText = Object.values(answers).join(' ')
  const tokens = toTokens(answerText)
  const topic = pickFirst(toTokens(answers.target || answers.theme || answers.style || answers.format || answers.core || ''), `${flow.label}企画`)
  const rivalry = extractByIncludes(answerText, rivalryWords, 'メンバー対決')
  const rule = extractByIncludes(answerText, ruleWords, '追加ルールなし')
  const ending = extractByIncludes(answerText, endingWords, '想定外の展開')
  const person = extractByIncludes(answerText, memberWords, 'メンバー')
  const time = extractTime(answerText) || '10分'

  const slots = {
    TOPIC: topic,
    RIVALRY: rivalry,
    RULE: rule,
    ENDING: ending,
    PERSON: person,
    TIME: time,
    GAME: gameTitle.trim() || 'このゲーム',
  }

  const templates = templatesByGenre[flow.key]
  const picked = [
    templates.find((template) => template.category === 'vs')?.text ?? '{TOPIC}対決、結果はどうなる',
    templates.find((template) => template.category === 'limit')?.text ?? '{RULE}で{TOPIC}に挑んだ結果',
    templates.find((template) => template.category === 'twist')?.text ?? '{TOPIC}企画、最後に{ENDING}',
  ]

  const titles = unique(picked.map((template) => trimTitle(fillTemplate(template, slots)))).slice(0, 3)
  while (titles.length < 3) {
    titles.push(flow.fallbackTitle)
  }

  return {
    titles: titles.slice(0, 3),
    keywords: unique([topic, rivalry, rule, ending, person, time, ...tokens]).slice(0, 12),
  }
}

