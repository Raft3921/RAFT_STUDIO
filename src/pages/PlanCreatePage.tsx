import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { durationPresets, roleDefinitions } from '../data/templates'
import { buildGenreTitleCandidates, getGenrePromptFlow, getGenreTrees } from '../lib/titleGenerator'
import { clampDuration, createEmptyRoleAssignments, formatDuration, participantSummaryText, resolveRoleNames } from '../lib/plan'
import { getMemberIcon } from '../lib/memberIcon'
import { useApp } from '../store/AppContext'
import type { Plan, RoleAssignments } from '../types'

const goals: Plan['goal'][] = ['笑い', '驚き', '感動', '学び', '上達']
const defaultGame = 'Minecraft'
const subtitleStyles: Plan['subtitleStyle'][] = ['フル字幕', 'ちょっと字幕', '字幕無し']

const roleGroups = [
  { label: '画面に出る役割', ids: ['mc', 'reaction', 'action'] },
  { label: '制作・進行の役割', ids: ['tech', 'progress'] },
]

const genres = getGenreTrees()
const findGenreKeyByLabel = (label?: string) => genres.find((genre) => genre.label === label)?.key ?? ''
interface SpeechRecognitionResultLike {
  transcript?: string
}
interface SpeechRecognitionEventLike {
  results?: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>
}
interface SpeechRecognitionErrorEventLike {
  error?: string
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike
interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionCtor
  webkitSpeechRecognition?: SpeechRecognitionCtor
}

export const PlanCreatePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createPlan, updatePlan, data } = useApp()
  const editingPlan = id ? data.plans.find((plan) => plan.id === id) : null
  const missingEditTarget = Boolean(id && !editingPlan)

  const [gameTitle, setGameTitle] = useState(editingPlan?.gameTitle ?? defaultGame)
  const [genreKey, setGenreKey] = useState(() => findGenreKeyByLabel(editingPlan?.templateType))
  const [titleFlowStarted, setTitleFlowStarted] = useState(Boolean(editingPlan))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({})
  const [draftAnswer, setDraftAnswer] = useState('')
  const [titleCandidates, setTitleCandidates] = useState<string[]>([])
  const [keywordPreview, setKeywordPreview] = useState<string[]>([])

  const [durationSec, setDurationSec] = useState(editingPlan?.durationSec ?? 480)
  const [participantIds, setParticipantIds] = useState<string[]>(editingPlan?.participantIds ?? [])
  const [goal, setGoal] = useState<Plan['goal']>(editingPlan?.goal ?? '笑い')
  const [subtitleStyle, setSubtitleStyle] = useState<Plan['subtitleStyle']>(editingPlan?.subtitleStyle ?? 'ちょっと字幕')
  const [isListeningOverview, setIsListeningOverview] = useState(false)
  const [title, setTitle] = useState(editingPlan?.title ?? '')
  const [overview, setOverview] = useState(editingPlan?.overview ?? editingPlan?.memo ?? '')
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignments>(
    editingPlan?.roleAssignments ?? createEmptyRoleAssignments(),
  )
  const overviewRecognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const activeGenre = useMemo(() => getGenrePromptFlow(genreKey), [genreKey])
  const questionCount = activeGenre?.questions.length ?? 0
  const questionComplete = Boolean(activeGenre) && questionIndex >= questionCount
  const currentQuestion = questionComplete ? null : activeGenre?.questions[questionIndex] ?? null

  const selectedMembersLabel = useMemo(
    () =>
      participantSummaryText(
        {
          id: 'tmp',
          title: '',
          templateType: activeGenre?.label ?? '未選択',
          status: 'candidate',
          durationSec,
          participantIds,
          goal,
          subtitleStyle,
          roleAssignments: createEmptyRoleAssignments(),
          createdAt: '',
          createdBy: '',
        },
        data.members,
        8,
      ),
    [activeGenre?.label, data.members, durationSec, goal, participantIds, subtitleStyle],
  )

  const resetGenreFlow = (nextGenreKey: string) => {
    setGenreKey(nextGenreKey)
    setTitleFlowStarted(false)
    setQuestionIndex(0)
    setQuestionAnswers({})
    setDraftAnswer('')
    setTitleCandidates([])
    setKeywordPreview([])
    setTitle('')
    setOverview('')
  }

  const onNextQuestion = () => {
    if (!currentQuestion) return
    const nextAnswer = draftAnswer.trim()
    if (!nextAnswer) {
      window.alert('回答を入力してください。')
      return
    }
    const mergedAnswers = { ...questionAnswers, [currentQuestion.id]: nextAnswer }
    setQuestionAnswers(mergedAnswers)
    const nextIndex = questionIndex + 1
    if (!activeGenre) return
    if (nextIndex >= activeGenre.questions.length) {
      setQuestionIndex(activeGenre.questions.length)
      setDraftAnswer('')
      return
    }
    const nextQuestion = activeGenre.questions[nextIndex]
    setQuestionIndex(nextIndex)
    setDraftAnswer(mergedAnswers[nextQuestion.id] ?? '')
  }

  const onBackQuestion = () => {
    if (!activeGenre) return
    if (questionIndex === 0) return
    const prevIndex = Math.max(0, questionIndex - 1)
    const prevQuestion = activeGenre.questions[prevIndex]
    setQuestionIndex(prevIndex)
    setDraftAnswer(questionAnswers[prevQuestion.id] ?? '')
  }

  const runTitleCandidates = () => {
    if (!activeGenre) {
      window.alert('最初にジャンルを選択してください。')
      setKeywordPreview([])
      return
    }
    if (!titleFlowStarted) {
      setTitleFlowStarted(true)
      setQuestionIndex(0)
      setDraftAnswer(questionAnswers[activeGenre.questions[0]?.id ?? ''] ?? '')
      return
    }
    const mergedAnswers = { ...questionAnswers }
    if (currentQuestion && draftAnswer.trim()) {
      mergedAnswers[currentQuestion.id] = draftAnswer.trim()
    }
    const hasAnyAnswer = Object.values(mergedAnswers).some((value) => value.trim().length > 0)
    if (!questionComplete) {
      window.alert('質問に最後まで回答してから実行してください。')
      setTitleCandidates([])
      setKeywordPreview([])
      return
    }
    if (!hasAnyAnswer) {
      setTitleCandidates([activeGenre.fallbackTitle])
      setKeywordPreview([])
      return
    }
    const result = buildGenreTitleCandidates(activeGenre.key, mergedAnswers, gameTitle.trim() || defaultGame)
    setTitleCandidates(result.titles)
    setKeywordPreview(result.keywords)
  }

  const startOverviewVoiceInput = async () => {
    const speechWindow = window as SpeechRecognitionWindow
    const recognitionCtor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!recognitionCtor) {
      const manualInput = window.prompt('このブラウザは音声入力に対応していません。概要を入力してください。')
      if (manualInput?.trim()) {
        setOverview((prev) => (prev.trim().length > 0 ? `${prev.trim()}\n${manualInput.trim()}` : manualInput.trim()))
      }
      return
    }
    if (!window.isSecureContext) {
      window.alert('音声入力はHTTPS環境でのみ利用できます。')
      return
    }
    if (isListeningOverview) {
      overviewRecognitionRef.current?.stop()
      return
    }
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
      } catch {
        window.alert('マイク権限が必要です。ブラウザ設定でマイクを許可してください。')
        return
      }
    }

    const recognition = new recognitionCtor()
    overviewRecognitionRef.current = recognition
    recognition.lang = 'ja-JP'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    setIsListeningOverview(true)

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()
      if (!transcript) return
      setOverview((prev) => (prev.trim().length > 0 ? `${prev.trim()}\n${transcript}` : transcript))
    }
    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'aborted') return
      const messageByError: Record<string, string> = {
        'not-allowed': 'マイク利用が拒否されました。ブラウザ設定でマイクを許可してください。',
        'service-not-allowed': 'このブラウザでは音声認識サービスが許可されていません。',
        'no-speech': '音声が検出できませんでした。もう一度はっきり話してください。',
        'audio-capture': 'マイクが見つかりません。接続または権限を確認してください。',
        network: 'ネットワークエラーで音声認識に失敗しました。通信状況を確認してください。',
      }
      window.alert(messageByError[event.error ?? ''] ?? '音声入力に失敗しました。もう一度お試しください。')
    }
    recognition.onend = () => {
      setIsListeningOverview(false)
      overviewRecognitionRef.current = null
    }
    try {
      recognition.start()
    } catch {
      setIsListeningOverview(false)
      overviewRecognitionRef.current = null
      window.alert('音声入力を開始できませんでした。ページ再読み込み後に再試行してください。')
    }
  }

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const toggleRoleMember = (roleId: string, memberId: string, selection: 'single' | 'multi') => {
    setRoleAssignments((prev) => {
      const current = prev[roleId] ?? []
      if (selection === 'single') {
        return { ...prev, [roleId]: current[0] === memberId ? [] : [memberId] }
      }
      return {
        ...prev,
        [roleId]: current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
      }
    })
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeGenre) {
      window.alert('最初にジャンルを選択してください。')
      return
    }
    if (!questionComplete) {
      window.alert('質問に最後まで回答してください。')
      return
    }

    const selectedTitle = title.trim() || titleCandidates[0] || activeGenre.fallbackTitle
    const selectedOverview =
      overview.trim() || titleCandidates[0] || `${gameTitle || defaultGame} / ${activeGenre.label} / ${selectedMembersLabel}`

    if (editingPlan) {
      await updatePlan(editingPlan.id, {
        title: selectedTitle,
        gameTitle: gameTitle.trim(),
        templateType: activeGenre.label,
        durationSec,
        participantIds,
        goal,
        subtitleStyle,
        overview: selectedOverview,
        roleAssignments,
        memo: '',
      })
      navigate(`/plans/${editingPlan.id}`)
      return
    }

    await createPlan({
      title: selectedTitle,
      gameTitle: gameTitle.trim(),
      templateType: activeGenre.label,
      durationSec,
      participantIds,
      goal,
      subtitleStyle,
      overview: selectedOverview,
      roleAssignments,
      memo: '',
    })
    navigate('/plans')
  }

  return (
    <form className="page-stack" onSubmit={onSubmit}>
      {missingEditTarget && <section className="panel">企画が見つかりません。</section>}
      {!missingEditTarget && (
        <>
          <section className="panel">
            <h2>{editingPlan ? '企画カード編集' : '企画カード作成'}</h2>
            <p className="muted">ジャンル選択→自由入力質問→タイトル候補の順で作成します。</p>
          </section>

          <section className="panel">
            <h3>1. ジャンル選択（必須）</h3>
            <div className="chip-row" data-tour="plan-template">
              {genres.map((genre) => (
                <button
                  type="button"
                  key={genre.key}
                  className={`chip ${genreKey === genre.key ? 'active' : ''}`}
                  onClick={() => resetGenreFlow(genre.key)}
                >
                  {genre.label}
                </button>
              ))}
            </div>

            {activeGenre && (
              <div className="card">
                <p className="muted">ジャンル: {activeGenre.label}</p>
                {!titleFlowStarted && (
                  <p className="muted">下の「タイトル候補を行う」を押すと質問が始まります。</p>
                )}
                {titleFlowStarted && (
                  <p className="muted">Q {Math.min(questionIndex + 1, questionCount)} / {questionCount}</p>
                )}
                {titleFlowStarted && currentQuestion && (
                  <div className="stack-gap">
                    <label>{currentQuestion.text}</label>
                    <p className="muted">{currentQuestion.hint}</p>
                    <textarea
                      className="field"
                      rows={3}
                      value={draftAnswer}
                      onChange={(event) => setDraftAnswer(event.target.value)}
                      placeholder={currentQuestion.placeholder}
                    />
                    <div className="inline-row">
                      <button type="button" className="chip" onClick={onBackQuestion} disabled={questionIndex === 0}>
                        戻る
                      </button>
                      <button type="button" className="chip active" onClick={onNextQuestion}>
                        次へ
                      </button>
                    </div>
                  </div>
                )}
                {titleFlowStarted && questionComplete && (
                  <div className="stack-gap">
                    <p className="muted">質問完了。タイトル候補を行うボタンで3案を生成します。</p>
                    <div className="inline-row">
                      <button type="button" className="chip" onClick={onBackQuestion}>
                        戻る
                      </button>
                      <button type="button" className="chip active" onClick={runTitleCandidates}>
                        タイトル候補を行う
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="panel">
            <h3>2. 基本設定</h3>
            <label>ゲーム</label>
            <input
              className="field"
              value={gameTitle}
              onChange={(event) => setGameTitle(event.target.value)}
              placeholder="例: Minecraft / VALORANT / APEX"
            />

            <label>尺（時間）</label>
            <p className="duration-text">{formatDuration(durationSec)}</p>
            <input
              className="duration-slider"
              type="range"
              min={0}
              max={1800}
              step={10}
              value={durationSec}
              onChange={(event) => setDurationSec(clampDuration(Number(event.target.value)))}
            />
            <div className="inline-row">
              <button type="button" className="chip" onClick={() => setDurationSec((prev) => clampDuration(prev - 10))}>
                -10秒
              </button>
              <button type="button" className="chip" onClick={() => setDurationSec((prev) => clampDuration(prev + 10))}>
                +10秒
              </button>
            </div>
            <div className="chip-row">
              {durationPresets.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  className={`chip ${durationSec === seconds ? 'active' : ''}`}
                  onClick={() => setDurationSec(seconds)}
                >
                  {formatDuration(seconds)}
                </button>
              ))}
            </div>

            <label>企画メンバー</label>
            <p className="muted">最低1人は選択してください</p>
            <div className="chip-row" data-tour="plan-members">
              {data.members.map((member) => (
                <button
                  type="button"
                  key={member.id}
                  className={`chip ${participantIds.includes(member.id) ? 'active' : ''}`}
                  onClick={() => toggleParticipant(member.id)}
                >
                  <span className="member-chip-label">
                    <img src={getMemberIcon(member.displayName)} alt="" className="member-chip-icon" />
                    <span>{member.displayName}</span>
                  </span>
                </button>
              ))}
            </div>

            <label>目的</label>
            <div className="chip-row">
              {goals.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`chip ${goal === item ? 'active' : ''}`}
                  onClick={() => setGoal(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <h3>3. 役割割り当て</h3>
              <span className="muted">兼務OK</span>
            </div>
            {roleGroups.map((group) => (
              <div key={group.label} className="role-group">
                <p className="role-group-title">{group.label}</p>
                {group.ids.map((roleId) => {
                  const role = roleDefinitions.find((item) => item.id === roleId)
                  if (!role) return null
                  return (
                    <div key={role.id} className="role-row">
                      <div className="section-head">
                        <strong>
                          {role.label} {role.required ? '（必須）' : ''}
                        </strong>
                        <span className="muted">{role.selection === 'single' ? '1人' : '複数'}</span>
                      </div>
                      <div className="chip-row">
                        {data.members.map((member) => (
                          <button
                            type="button"
                            key={`${role.id}-${member.id}`}
                            className={`chip ${roleAssignments[role.id]?.includes(member.id) ? 'active' : ''}`}
                            onClick={() => toggleRoleMember(role.id, member.id, role.selection)}
                          >
                            <span className="member-chip-label">
                              <img src={getMemberIcon(member.displayName)} alt="" className="member-chip-icon" />
                              <span>{member.displayName}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="muted">現在: {resolveRoleNames(roleAssignments[role.id] ?? [], data.members)}</p>
                    </div>
                  )
                })}
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>4. タイトル候補</h3>

            <label>編集</label>
            <div className="chip-row">
              {subtitleStyles.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`chip ${subtitleStyle === item ? 'active' : ''}`}
                  onClick={() => setSubtitleStyle(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <label>タイトル候補（3案）</label>
            <div className="inline-row">
              <button type="button" className="chip" onClick={runTitleCandidates}>
                {titleFlowStarted ? 'タイトル候補を行う' : 'タイトル候補を行う（質問開始）'}
              </button>
            </div>
            <div className="stack-gap">
              {titleCandidates.length === 0 && <p className="muted">質問に回答してからボタンで候補を生成してください。</p>}
              {titleCandidates.map((candidate) => (
                <div key={candidate} className="card">
                  <p>{candidate}</p>
                  <div className="inline-row">
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        setTitle(candidate)
                        setOverview(candidate)
                      }}
                    >
                      この案を使う
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={async () => {
                        await navigator.clipboard.writeText(candidate)
                      }}
                    >
                      コピー
                    </button>
                  </div>
                </div>
              ))}
              {keywordPreview.length > 0 && <p className="muted">抽出キーワード: {keywordPreview.join(' / ')}</p>}
            </div>

            <label>カード概要（一覧に表示）</label>
            <div className="overview-input-head">
              <span className="muted">本格的な概要を書けます。音声入力も可能。</span>
              <button
                type="button"
                className={`chip voice-input-chip ${isListeningOverview ? 'active' : ''}`}
                onClick={startOverviewVoiceInput}
                aria-label="概要を音声入力"
                title="概要を音声入力"
              >
                🎤
              </button>
            </div>
            <textarea
              className="field"
              rows={6}
              value={overview}
              onChange={(event) => setOverview(event.target.value)}
              placeholder="企画の狙い、流れ、注意点、勝敗条件などを詳しく記入"
            />
            <label>タイトル（任意で修正）</label>
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
          </section>

          <button data-tour="plan-submit" className="btn full" type="submit">
            {editingPlan ? '企画を更新' : '企画カードを作成'}
          </button>
        </>
      )}
    </form>
  )
}
